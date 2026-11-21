import type { CookieOptions, Request, Response } from "express";
import * as authService from "../services/auth.service";
import { env } from "../config/env";
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
  await authService.logout(req.cookies?.[REFRESH_COOKIE]);
  res.clearCookie(REFRESH_COOKIE, cookieOptions);
  sendSuccess(res, { message: "Logged out" });
};
