export type Role = "user" | "admin";

export interface User {
  _id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Response envelopes returned by the API.
export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorBody {
  success: false;
  message: string;
  details?: { field?: string; message: string }[];
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AuthPayload {
  user: User;
  accessToken: string;
}

// Populated author: the API only returns the name.
export interface AuthorRef {
  _id: string;
  name: string;
}

export interface Post {
  _id: string;
  title: string;
  content: string;
  slug: string;
  author: AuthorRef;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  _id: string;
  content: string;
  post: string;
  author: AuthorRef;
  createdAt: string;
  updatedAt: string;
}

export interface Paginated<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface PostInput {
  title: string;
  content: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput extends LoginInput {
  name: string;
}
