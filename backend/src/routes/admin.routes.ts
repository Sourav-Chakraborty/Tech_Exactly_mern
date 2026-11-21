import { Router } from "express";
import * as adminController from "../controllers/admin.controller";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import { logActivity } from "../middleware/activityLogger";
import { idParamSchema, paginationSchema } from "../validators/common.validator";
import {
  listAdminPostsQuerySchema,
  listUsersQuerySchema,
  updateRoleSchema,
  updateStatusSchema,
} from "../validators/admin.validator";

const router = Router();

// Every admin route requires an authenticated admin.
router.use(authenticate, authorize("admin"));

const validId = validate(idParamSchema, "params");

// Dashboard
router.get("/stats", adminController.getStats);

// Users
router.get("/users", validate(listUsersQuerySchema, "query"), adminController.listUsers);
router.patch(
  "/users/:id/role",
  validId,
  validate(updateRoleSchema),
  logActivity("admin.user.role"),
  adminController.updateUserRole,
);
router.patch(
  "/users/:id/status",
  validId,
  validate(updateStatusSchema),
  logActivity("admin.user.status"),
  adminController.updateUserStatus,
);
router.delete(
  "/users/:id",
  validId,
  logActivity("admin.user.delete"),
  adminController.deleteUser,
);

// Posts (editing and soft-deleting use the regular /posts routes, where admins bypass ownership)
router.get("/posts", validate(listAdminPostsQuerySchema, "query"), adminController.listPosts);
router.patch(
  "/posts/:id/restore",
  validId,
  logActivity("admin.post.restore"),
  adminController.restorePost,
);
router.delete(
  "/posts/:id",
  validId,
  logActivity("admin.post.purge"),
  adminController.purgePost,
);

// Comments
router.get("/comments", validate(paginationSchema, "query"), adminController.listComments);
router.delete(
  "/comments/:id",
  validId,
  logActivity("admin.comment.delete"),
  adminController.deleteComment,
);

export default router;
