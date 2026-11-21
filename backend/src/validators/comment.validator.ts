import { z } from "zod";
import { objectIdSchema } from "./common.validator";

const content = z.string().trim().min(1).max(2000);

export const createCommentSchema = z.object({ content });
export const updateCommentSchema = z.object({ content });

export const postIdParamSchema = z.object({ postId: objectIdSchema });
export const commentParamsSchema = z.object({ postId: objectIdSchema, id: objectIdSchema });

export type CommentInput = z.infer<typeof createCommentSchema>;
