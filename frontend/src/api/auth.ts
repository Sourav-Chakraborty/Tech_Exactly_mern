import { API_URL, api, refreshSession, setAccessToken } from "./client";
import type { ApiSuccess, AuthPayload, LoginInput, RegisterInput } from "../types";

export const authApi = {
  async login(input: LoginInput) {
    const res = await api.post<ApiSuccess<AuthPayload>>("/auth/login", input);
    setAccessToken(res.data.data.accessToken);
    return res.data.data.user;
  },

  async register(input: RegisterInput) {
    const res = await api.post<ApiSuccess<AuthPayload>>("/auth/register", input);
    setAccessToken(res.data.data.accessToken);
    return res.data.data.user;
  },

  async logout() {
    try {
      await api.post("/auth/logout");
    } finally {
      setAccessToken(null);
    }
  },

  // Restores the session from the refresh cookie (page load, OAuth return).
  async restore() {
    return (await refreshSession()).user;
  },

  // Social login is a full-page redirect: browser -> API -> provider -> API -> /oauth/callback.
  oauthUrl: (provider: "google" | "facebook") => `${API_URL}/auth/${provider}`,
};
