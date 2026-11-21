import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import type { ApiSuccess, AuthPayload } from "../types";

export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api/v1";

/**
 * Axios instance for the API.
 *
 * - The access token lives only in memory (never localStorage), so it can't be read by
 *   injected scripts. After a page reload the session is restored from the httpOnly
 *   refresh cookie via POST /auth/refresh.
 * - `withCredentials` sends that cookie to the API (cross-origin in development).
 * - On a 401, the token is refreshed once and the original request is retried.
 */
export const api = axios.create({ baseURL: API_URL, withCredentials: true });

let accessToken: string | null = null;
export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// ---------- Refresh (single flight) ----------

// The backend rotates the refresh token on every use and treats reuse of an old one as theft.
// So concurrent callers (several 401s at once, React StrictMode running effects twice) must
// share ONE refresh request instead of each sending the same cookie.
let refreshInFlight: Promise<AuthPayload> | null = null;

export const refreshSession = (): Promise<AuthPayload> => {
  refreshInFlight ??= api
    .post<ApiSuccess<AuthPayload>>("/auth/refresh")
    .then((res) => {
      setAccessToken(res.data.data.accessToken);
      return res.data.data;
    })
    .catch((err) => {
      setAccessToken(null);
      throw err;
    })
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
};

// Called when a refresh fails mid-session, so the auth state can log the user out.
let onSessionExpired: (() => void) | null = null;
export const setSessionExpiredHandler = (handler: (() => void) | null) => {
  onSessionExpired = handler;
};

// ---------- 401 -> refresh -> retry ----------

type RetryableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

// These endpoints decide the session themselves; never retry them.
const NO_RETRY = ["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout"];

api.interceptors.response.use(undefined, async (error: AxiosError) => {
  const original = error.config as RetryableConfig | undefined;

  if (
    error.response?.status !== 401 ||
    !original ||
    original._retried ||
    NO_RETRY.includes(original.url ?? "")
  ) {
    throw error;
  }

  original._retried = true;
  try {
    await refreshSession();
  } catch {
    onSessionExpired?.();
    throw error;
  }
  return api(original); // the request interceptor adds the new token
});
