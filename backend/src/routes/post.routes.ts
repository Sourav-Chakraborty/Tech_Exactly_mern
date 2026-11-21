import { Router } from "express";
import * as postController from "../controllers/post.controller";
import { findActivePostById } from "../services/post.service";
import { authenticate } from "../middleware/authenticate";
import { checkOwnership } from "../middleware/checkOwnership";
import { validate } from "../middleware/validate";
import { logActivity } from "../middleware/activityLogger";
import { idParamSchema } from "../validators/common.validator";
import {
  createPostSchema,
  listPostsQuerySchema,
  updatePostSchema,
} from "../validators/post.validator";

const router = Router();

// Owner of the post or an admin.
const canModifyPost = checkOwnership((req) => findActivePostById(req.params.id as string));

// Public
router.get("/", validate(listPostsQuerySchema, "query"), postController.listPosts);
router.get("/:idOrSlug", postController.getPost);

// Authenticated
router.post(
  "/",
  authenticate,
  validate(createPostSchema),
  logActivity("post.create"),
  postController.createPost,
);
router.patch(
  "/:id",
  authenticate,
  validate(idParamSchema, "params"),
  canModifyPost,
  validate(updatePostSchema),
  logActivity("post.update"),
  postController.updatePost,
);
router.delete(
  "/:id",
  authenticate,
  validate(idParamSchema, "params"),
  canModifyPost,
  logActivity("post.delete"),
  postController.deletePost,
);

export default router;
