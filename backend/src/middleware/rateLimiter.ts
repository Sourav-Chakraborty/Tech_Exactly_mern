import type { NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { ApiError } from "../utils/ApiError";

const FIFTEEN_MINUTES = 15 * 60 * 1000;

// Route the 429 through the central error handler for a consistent response shape.
const handler = (_req: Request, _res: Response, next: NextFunction) => {
  next(new ApiError(429, "Too many requests, please try again later"));
};

// Login / register: 10 failed attempts per IP per 15 minutes.
export const authLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler,
});

// Refresh / logout: looser, as the client calls refresh on every page load.
export const sessionLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler,
});
