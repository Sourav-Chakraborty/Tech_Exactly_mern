import { z } from "zod";
import { isObjectIdOrHexString } from "mongoose";

// Strict: only 24-char hex strings (isValidObjectId also accepts any 12-char string).
export const objectIdSchema = z.string().refine((v) => isObjectIdOrHexString(v), "Invalid id");

export const idParamSchema = z.object({ id: objectIdSchema });

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
