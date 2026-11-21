import { z } from "zod";
import { objectIdSchema, paginationSchema } from "./common.validator";
import { htmlToText, sanitizePostHtml } from "../utils/sanitizeHtml";

const title = z.string().trim().min(3).max(150);

// Rich text (HTML). Sanitized here, so services only ever receive safe HTML.
const content = z
  .string()
  .max(100_000, "Content is too long")
  .transform(sanitizePostHtml)
  .refine((html) => htmlToText(html).length > 0, "Content is required");

export const createPostSchema = z.object({ title, content });

export const updatePostSchema = z
  .object({ title: title.optional(), content: content.optional() })
  .refine((v) => v.title !== undefined || v.content !== undefined, {
    message: "Provide at least one of: title, content",
  });

export const listPostsQuerySchema = paginationSchema.extend({
  author: objectIdSchema.optional(),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type ListPostsQuery = z.infer<typeof listPostsQuerySchema>;
