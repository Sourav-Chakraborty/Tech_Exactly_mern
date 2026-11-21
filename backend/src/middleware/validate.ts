import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

// Validates req.body against a Zod schema and replaces it with the parsed (sanitized) value.
// A ZodError is thrown on failure and formatted by the error handler.
export const validate = (schema: ZodType) => (req: Request, _res: Response, next: NextFunction) => {
  req.body = schema.parse(req.body);
  next();
};
