import { User, type Role } from "../src/models/user.model";
import { Post } from "../src/models/post.model";
import { Comment } from "../src/models/comment.model";
import { signAccessToken } from "../src/utils/jwt";

let seq = 0;

export const PASSWORD = "password123";

export const createUser = async (overrides: { role?: Role; isActive?: boolean; name?: string } = {}) => {
  seq += 1;
  return User.create({
    name: overrides.name ?? `User ${seq}`,
    email: `user${seq}@test.dev`,
    password: PASSWORD,
    role: overrides.role ?? "user",
    isActive: overrides.isActive ?? true,
  });
};

export const tokenFor = (user: { id: string; role: Role }) =>
  signAccessToken({ sub: user.id, role: user.role });

export const bearer = (user: { id: string; role: Role }) => ({
  Authorization: `Bearer ${tokenFor(user)}`,
});

export const createPost = async (authorId: string, overrides: Partial<{ title: string; isDeleted: boolean }> = {}) => {
  seq += 1;
  const title = overrides.title ?? `Post ${seq}`;
  return Post.create({
    title,
    content: "Some content",
    slug: `post-${seq}`,
    author: authorId,
    isDeleted: overrides.isDeleted ?? false,
    deletedAt: overrides.isDeleted ? new Date() : null,
  });
};

export const createComment = (postId: string, authorId: string, content = "A comment") =>
  Comment.create({ content, post: postId, author: authorId });

// Extracts "refreshToken=<value>" from a supertest response's Set-Cookie header.
export const refreshCookieFrom = (res: { headers: Record<string, unknown> }) => {
  const cookies = (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
  return cookies.find((c) => c.startsWith("refreshToken="))?.split(";")[0];
};
