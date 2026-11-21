import type { Request, Response } from "express";
import * as adminService from "../services/admin.service";
import type { ListAdminPostsQuery, ListUsersQuery } from "../validators/admin.validator";
import { sendSuccess } from "../utils/ApiResponse";

const id = (req: Request) => req.params.id as string;

// ---------- Dashboard ----------

export const getStats = async (_req: Request, res: Response) => {
  sendSuccess(res, { data: await adminService.getStats() });
};

// ---------- Users ----------

export const listUsers = async (req: Request, res: Response) => {
  const { users, meta } = await adminService.listUsers(req.query as unknown as ListUsersQuery);
  sendSuccess(res, { data: users, meta: { ...meta } });
};

export const updateUserRole = async (req: Request, res: Response) => {
  const user = await adminService.updateUserRole(req.user!.id, id(req), req.body.role);
  sendSuccess(res, { message: "User role updated", data: user });
};

export const updateUserStatus = async (req: Request, res: Response) => {
  const user = await adminService.updateUserStatus(req.user!.id, id(req), req.body.isActive);
  sendSuccess(res, {
    message: user.isActive ? "User activated" : "User deactivated",
    data: user,
  });
};

export const deleteUser = async (req: Request, res: Response) => {
  await adminService.deleteUser(req.user!.id, id(req));
  sendSuccess(res, { message: "User deleted" });
};

// ---------- Posts ----------

export const listPosts = async (req: Request, res: Response) => {
  const { posts, meta } = await adminService.listPosts(
    req.query as unknown as ListAdminPostsQuery,
  );
  sendSuccess(res, { data: posts, meta: { ...meta } });
};

export const restorePost = async (req: Request, res: Response) => {
  const post = await adminService.restorePost(id(req));
  sendSuccess(res, { message: "Post restored", data: post });
};

export const purgePost = async (req: Request, res: Response) => {
  await adminService.purgePost(id(req));
  sendSuccess(res, { message: "Post permanently deleted" });
};

// ---------- Comments ----------

export const listComments = async (req: Request, res: Response) => {
  const { page, limit } = req.query as unknown as { page: number; limit: number };
  const { comments, meta } = await adminService.listComments(page, limit);
  sendSuccess(res, { data: comments, meta: { ...meta } });
};

export const deleteComment = async (req: Request, res: Response) => {
  await adminService.deleteComment(id(req));
  sendSuccess(res, { message: "Comment deleted" });
};
