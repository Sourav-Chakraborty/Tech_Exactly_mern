import { api } from "./client";
import type { ApiSuccess, Comment, Paginated } from "../types";

const base = (postId: string) => `/posts/${postId}/comments`;

export const commentsApi = {
  async list(postId: string, page = 1, limit = 10): Promise<Paginated<Comment>> {
    const res = await api.get<ApiSuccess<Comment[]>>(base(postId), { params: { page, limit } });
    return { items: res.data.data, meta: res.data.meta! };
  },

  async create(postId: string, content: string) {
    return (await api.post<ApiSuccess<Comment>>(base(postId), { content })).data.data;
  },

  async update(postId: string, id: string, content: string) {
    return (await api.patch<ApiSuccess<Comment>>(`${base(postId)}/${id}`, { content })).data.data;
  },

  async remove(postId: string, id: string) {
    await api.delete(`${base(postId)}/${id}`);
  },
};
