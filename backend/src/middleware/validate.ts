import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

type Source = "body" | "query" | "params";

// Validates req[source] against a Zod schema and replaces it with the parsed (sanitized) value.
// A ZodError is thrown on failure and formatted by the error handler.
//
// Usage: validate(createPostSchema), validate(listQuerySchema, "query")
export const validate =
  (schema: ZodType, source: Source = "body") =>
  (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.parse(req[source]);
    // req.query is a read-only getter in Express 5, so redefine it instead of assigning.
    Object.defineProperty(req, source, { value: parsed, writable: true, enumerable: true });
    next();
  };
