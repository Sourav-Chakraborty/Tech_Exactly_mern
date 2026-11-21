import { Router } from "express";
import * as commentController from "../controllers/comment.controller";
import { findCommentOnActivePost } from "../services/comment.service";
import { authenticate } from "../middleware/authenticate";
import { checkOwnership } from "../middleware/checkOwnership";
import { validate } from "../middleware/validate";
import { logActivity } from "../middleware/activityLogger";
import { paginationSchema } from "../validators/common.validator";
import {
  commentParamsSchema,
  createCommentSchema,
  postIdParamSchema,
  updateCommentSchema,
} from "../validators/comment.validator";

// Mounted at /posts/:postId/comments; mergeParams exposes :postId from the parent router.
const router = Router({ mergeParams: true });

// Owner of the comment or an admin.
const canModifyComment = checkOwnership((req) =>
  findCommentOnActivePost(req.params.postId as string, req.params.id as string),
);

// Public
router.get(
  "/",
  validate(postIdParamSchema, "params"),
  validate(paginationSchema, "query"),
  commentController.listComments,
);
router.get("/:id", validate(commentParamsSchema, "params"), commentController.getComment);

// Authenticated
router.post(
  "/",
  authenticate,
  validate(postIdParamSchema, "params"),
  validate(createCommentSchema),
  logActivity("comment.create"),
  commentController.createComment,
);
router.patch(
  "/:id",
  authenticate,
  validate(commentParamsSchema, "params"),
  canModifyComment,
  validate(updateCommentSchema),
  logActivity("comment.update"),
  commentController.updateComment,
);
router.delete(
  "/:id",
  authenticate,
  validate(commentParamsSchema, "params"),
  canModifyComment,
  logActivity("comment.delete"),
  commentController.deleteComment,
);

export default router;
