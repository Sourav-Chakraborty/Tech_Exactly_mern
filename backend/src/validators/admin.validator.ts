import { z } from "zod";
import { ROLES } from "../models/user.model";
import { paginationSchema } from "./common.validator";

export const listUsersQuerySchema = paginationSchema.extend({
  search: z.string().trim().max(100).optional(), // matches name or email
  role: z.enum(ROLES).optional(),
});

export const listAdminPostsQuerySchema = paginationSchema.extend({
  status: z.enum(["active", "deleted", "all"]).default("all"),
});

export const updateRoleSchema = z.object({ role: z.enum(ROLES) });
export const updateStatusSchema = z.object({ isActive: z.boolean() });

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type ListAdminPostsQuery = z.infer<typeof listAdminPostsQuerySchema>;
