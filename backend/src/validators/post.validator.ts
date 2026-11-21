import { z } from "zod";
import { objectIdSchema, paginationSchema } from "./common.validator";

const title = z.string().trim().min(3).max(150);
const content = z.string().trim().min(1).max(50_000);

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
