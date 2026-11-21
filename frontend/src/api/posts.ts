import { api } from "./client";
import type { ApiSuccess, Paginated, Post, PostInput } from "../types";

export interface ListPostsParams {
  page?: number;
  limit?: number;
  author?: string;
}

export const postsApi = {
  async list(params: ListPostsParams = {}): Promise<Paginated<Post>> {
    const res = await api.get<ApiSuccess<Post[]>>("/posts", { params });
    return { items: res.data.data, meta: res.data.meta! };
  },

  // Accepts an id or a slug.
  async get(idOrSlug: string) {
    return (await api.get<ApiSuccess<Post>>(`/posts/${encodeURIComponent(idOrSlug)}`)).data.data;
  },

  async create(input: PostInput) {
    return (await api.post<ApiSuccess<Post>>("/posts", input)).data.data;
  },

  async update(id: string, input: Partial<PostInput>) {
    return (await api.patch<ApiSuccess<Post>>(`/posts/${id}`, input)).data.data;
  },

  async remove(id: string) {
    await api.delete(`/posts/${id}`);
  },
};
