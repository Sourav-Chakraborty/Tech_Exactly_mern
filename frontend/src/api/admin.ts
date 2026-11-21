import { api } from "./client";
import type {
  AdminComment,
  AdminPost,
  AdminStats,
  AdminUser,
  ApiSuccess,
  Paginated,
  PostStatusFilter,
  Role,
} from "../types";

const paginated = <T>(res: { data: ApiSuccess<T[]> }): Paginated<T> => ({
  items: res.data.data,
  meta: res.data.meta!,
});

// All endpoints require an admin; the API enforces it (401/403 otherwise).
export const adminApi = {
  async stats() {
    return (await api.get<ApiSuccess<AdminStats>>("/admin/stats")).data.data;
  },

  // ----- Users -----
  async listUsers(params: { page: number; limit: number; search?: string; role?: Role }) {
    return paginated(await api.get<ApiSuccess<AdminUser[]>>("/admin/users", { params }));
  },
  async setRole(id: string, role: Role) {
    return (await api.patch<ApiSuccess<AdminUser>>(`/admin/users/${id}/role`, { role })).data.data;
  },
  async setActive(id: string, isActive: boolean) {
    return (await api.patch<ApiSuccess<AdminUser>>(`/admin/users/${id}/status`, { isActive })).data.data;
  },
  async deleteUser(id: string) {
    await api.delete(`/admin/users/${id}`);
  },

  // ----- Posts -----
  async listPosts(params: { page: number; limit: number; status: PostStatusFilter }) {
    return paginated(await api.get<ApiSuccess<AdminPost[]>>("/admin/posts", { params }));
  },
  // Soft delete uses the regular endpoint (admins pass the ownership check).
  async softDeletePost(id: string) {
    await api.delete(`/posts/${id}`);
  },
  async restorePost(id: string) {
    await api.patch(`/admin/posts/${id}/restore`);
  },
  async purgePost(id: string) {
    await api.delete(`/admin/posts/${id}`);
  },

  // ----- Comments -----
  async listComments(params: { page: number; limit: number }) {
    return paginated(await api.get<ApiSuccess<AdminComment[]>>("/admin/comments", { params }));
  },
  async deleteComment(id: string) {
    await api.delete(`/admin/comments/${id}`);
  },
};
