import type { Response } from "express";

interface SuccessOptions<T> {
  statusCode?: number;
  message?: string;
  data?: T;
  meta?: Record<string, unknown>;
}

// Success shape: { success: true, message, data, meta? }
export const sendSuccess = <T>(
  res: Response,
  { statusCode = 200, message = "OK", data, meta }: SuccessOptions<T> = {},
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data: data ?? null,
    ...(meta ? { meta } : {}),
  });
};
