import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError";

// Converts any thrown value into an ApiError.
const normalizeError = (err: unknown): ApiError => {
  if (err instanceof ApiError) return err;

  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    return ApiError.badRequest("Validation failed", details);
  }

  if (err instanceof mongoose.Error.CastError) {
    return ApiError.badRequest(`Invalid value for ${err.path}`);
  }

  const e = err as {
    name?: string;
    message?: string;
    status?: number;
    code?: number;
    keyValue?: Record<string, unknown>;
    issues?: { path: PropertyKey[]; message: string }[];
  };

  // Mongo duplicate key
  if (e?.code === 11000) {
    const field = Object.keys(e.keyValue ?? {})[0] ?? "field";
    return ApiError.conflict(`${field} already exists`);
  }

  // Zod validation error
  if (e?.name === "ZodError" && Array.isArray(e.issues)) {
    const details = e.issues.map((i) => ({
      field: i.path.join(".") || undefined, // root-level rules have no field
      message: i.message,
    }));
    return ApiError.badRequest("Validation failed", details);
  }

  // jsonwebtoken errors
  if (e?.name === "TokenExpiredError") return ApiError.unauthorized("Token has expired");
  if (e?.name === "JsonWebTokenError") return ApiError.unauthorized("Invalid token");

  // Express/body-parser client errors (e.g. malformed JSON) carry their own 4xx status
  if (typeof e?.status === "number" && e.status < 500) {
    return new ApiError(e.status, e.message ?? "Bad request");
  }

  return new ApiError(500, "Internal Server Error");
};

export const notFound = (req: Request, _res: Response, next: NextFunction) => {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
};

// Error shape: { success: false, message, details? }
export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const apiError = normalizeError(err);
  if (apiError.statusCode >= 500) console.error(err);

  res.status(apiError.statusCode).json({
    success: false,
    message: apiError.message,
    ...(apiError.details ? { details: apiError.details } : {}),
  });
};
