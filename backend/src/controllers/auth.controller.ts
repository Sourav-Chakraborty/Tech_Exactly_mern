import crypto from "node:crypto";
import type { CookieOptions, NextFunction, Request, Response } from "express";
import * as authService from "../services/auth.service";
import { env } from "../config/env";
import passport, { isProviderEnabled, type OAuthProfile, type OAuthProvider } from "../config/passport";
import { ApiError } from "../utils/ApiError";
import { verifyRefreshToken } from "../utils/jwt";
import { sendSuccess } from "../utils/ApiResponse";

const REFRESH_COOKIE = "refreshToken";

const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.isProd,
  sameSite: env.isProd ? "none" : "lax",
  path: "/api/v1/auth", // only sent to auth endpoints
};

const setRefreshCookie = (res: Response, token: string) => {
  const { exp } = verifyRefreshToken(token);
  res.cookie(REFRESH_COOKIE, token, { ...cookieOptions, expires: new Date(exp * 1000) });
};

const respondWithTokens = (
  res: Response,
  result: authService.AuthResult,
  message: string,
  statusCode = 200,
) => {
  setRefreshCookie(res, result.refreshToken);
  res.locals.userId = result.user.id; // for the activity logger
  sendSuccess(res, {
    statusCode,
    message,
    data: { user: result.user, accessToken: result.accessToken },
  });
};

export const register = async (req: Request, res: Response) => {
  const result = await authService.register(req.body);
  respondWithTokens(res, result, "Registration successful", 201);
};

export const login = async (req: Request, res: Response) => {
  const result = await authService.login(req.body);
  respondWithTokens(res, result, "Login successful");
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const result = await authService.refresh(req.cookies?.[REFRESH_COOKIE]);
    respondWithTokens(res, result, "Token refreshed");
  } catch (err) {
    // A failed refresh leaves the client logged out, so drop the stale cookie.
    res.clearCookie(REFRESH_COOKIE, cookieOptions);
    throw err;
  }
};

export const logout = async (req: Request, res: Response) => {
  res.locals.userId = await authService.logout(req.cookies?.[REFRESH_COOKIE]);
  res.clearCookie(REFRESH_COOKIE, cookieOptions);
  sendSuccess(res, { message: "Logged out" });
};

export const me = (req: Request, res: Response) => {
  sendSuccess(res, { data: { user: req.user } });
};

// ---------- Social login (Google / Facebook) ----------

const OAUTH_STATE_COOKIE = "oauthState";
const OAUTH_SCOPES: Record<OAuthProvider, string[]> = {
  google: ["profile", "email"],
  facebook: ["email"],
};

// "lax" (not "none") is enough: the provider sends the user back with a top-level GET redirect.
const stateCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.isProd,
  sameSite: "lax",
  path: "/api/v1/auth",
};

// Step 1: redirect the browser to the provider's consent screen.
// A random `state` is stored in a short-lived cookie and checked on the callback (CSRF protection).
export const oauthStart =
  (provider: OAuthProvider) => (req: Request, res: Response, next: NextFunction) => {
    if (!isProviderEnabled(provider)) {
      throw new ApiError(501, `${provider} login is not configured on this server`);
    }

    const state = crypto.randomBytes(16).toString("hex");
    res.cookie(OAUTH_STATE_COOKIE, state, { ...stateCookieOptions, maxAge: 10 * 60 * 1000 });

    passport.authenticate(provider, { scope: OAUTH_SCOPES[provider], state, session: false })(
      req,
      res,
      next,
    );
  };

// Step 2: the provider redirects back here. On success the refresh cookie is set and the browser
// is sent to the frontend, which calls POST /auth/refresh to obtain its access token.
// (The access token is never put in the URL.) On failure the frontend gets ?error=<message>.
export const oauthCallback =
  (provider: OAuthProvider) => (req: Request, res: Response, next: NextFunction) => {
    const failRedirect = (message: string) =>
      res.redirect(`${env.clientUrl}/login?error=${encodeURIComponent(message)}`);

    const expectedState = req.cookies?.[OAUTH_STATE_COOKIE];
    res.clearCookie(OAUTH_STATE_COOKIE, stateCookieOptions);

    if (!isProviderEnabled(provider)) return failRedirect(`${provider} login is not configured`);
    if (!expectedState || req.query.state !== expectedState) {
      return failRedirect("Login session expired or was invalid, please try again");
    }

    // Custom callback: passport hands us the normalized profile instead of logging anyone in.
    passport.authenticate(provider, { session: false }, async (err: unknown, user: unknown) => {
      // err: provider/network error; user === false: the user cancelled on the consent screen.
      if (err || !user) return failRedirect(`${provider} login was cancelled or failed`);

      try {
        const result = await authService.oauthLogin(user as OAuthProfile);
        setRefreshCookie(res, result.refreshToken);
        res.locals.userId = result.user.id; // for the activity logger
        res.redirect(`${env.clientUrl}/oauth/callback`);
      } catch (e) {
        failRedirect(
          e instanceof ApiError && e.statusCode < 500 ? e.message : `${provider} login failed`,
        );
      }
    })(req, res, next);
  };
