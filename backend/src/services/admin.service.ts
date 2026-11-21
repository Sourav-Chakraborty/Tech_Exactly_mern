import { User, type Role } from "../models/user.model";
import { Post } from "../models/post.model";
import { Comment } from "../models/comment.model";
import { ActivityLog } from "../models/activityLog.model";
import { ApiError } from "../utils/ApiError";
import { buildPaginationMeta, toSkip } from "../utils/pagination";
import type { ListAdminPostsQuery, ListUsersQuery } from "../validators/admin.validator";

const RECENT_ACTIVITY_LIMIT = 10;

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Admins can't change their own role/status or delete themselves, so they can't lock themselves out.
const assertNotSelf = (adminId: string, targetId: string) => {
  if (adminId === targetId) throw ApiError.badRequest("You cannot perform this action on yourself");
};

// ---------- Dashboard ----------

export const getStats = async () => {
  const [totalUsers, totalPosts, deletedPosts, totalComments, recentActivity] = await Promise.all([
    User.countDocuments(),
    Post.countDocuments({ isDeleted: false }),
    Post.countDocuments({ isDeleted: true }),
    Comment.countDocuments(),
    ActivityLog.find()
      .sort({ createdAt: -1, _id: -1 })
      .limit(RECENT_ACTIVITY_LIMIT)
      .populate("user", "name email")
      .lean(),
  ]);

  return { totalUsers, totalPosts, deletedPosts, totalComments, recentActivity };
};

// ---------- Users ----------

export const listUsers = async ({ page, limit, search, role }: ListUsersQuery) => {
  const filter: Record<string, unknown> = {};
  if (role) filter.role = role;
  if (search) {
    const rx = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ name: rx }, { email: rx }];
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1, _id: -1 }).skip(toSkip(page, limit)).limit(limit).lean(),
    User.countDocuments(filter),
  ]);

  // .lean() skips toJSON, but password/refreshTokens are select:false so they're never loaded.
  return { users, meta: buildPaginationMeta(page, limit, total) };
};

export const updateUserRole = async (adminId: string, userId: string, role: Role) => {
  assertNotSelf(adminId, userId);
  const user = await User.findByIdAndUpdate(userId, { role }, { new: true }).lean();
  if (!user) throw ApiError.notFound("User not found");
  return user;
};

// Deactivating also revokes all refresh tokens, so every session ends immediately.
export const updateUserStatus = async (adminId: string, userId: string, isActive: boolean) => {
  assertNotSelf(adminId, userId);
  const update = isActive ? { isActive } : { isActive, refreshTokens: [] };
  const user = await User.findByIdAndUpdate(userId, update, { new: true }).lean();
  if (!user) throw ApiError.notFound("User not found");
  return user;
};

// Deletes the user, removes their comments and soft-deletes their posts.
export const deleteUser = async (adminId: string, userId: string) => {
  assertNotSelf(adminId, userId);
  const user = await User.findByIdAndDelete(userId);
  if (!user) throw ApiError.notFound("User not found");

  await Promise.all([
    Comment.deleteMany({ author: userId }),
    Post.updateMany({ author: userId, isDeleted: false }, { isDeleted: true, deletedAt: new Date() }),
  ]);
};

// ---------- Posts ----------

const STATUS_FILTER = {
  active: { isDeleted: false },
  deleted: { isDeleted: true },
  all: {},
} as const;

// Unlike the public list, this includes soft-deleted posts and their isDeleted/deletedAt fields.
export const listPosts = async ({ page, limit, status }: ListAdminPostsQuery) => {
  const filter = STATUS_FILTER[status];

  const [posts, total] = await Promise.all([
    Post.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip(toSkip(page, limit))
      .limit(limit)
      .select("-content")
      .populate("author", "name email")
      .lean(),
    Post.countDocuments(filter),
  ]);

  return { posts, meta: buildPaginationMeta(page, limit, total) };
};

export const restorePost = async (postId: string) => {
  const post = await Post.findOneAndUpdate(
    { _id: postId, isDeleted: true },
    { isDeleted: false, deletedAt: null },
    { new: true },
  ).lean();
  if (!post) throw ApiError.notFound("Deleted post not found");
  return post;
};

// Permanent delete of a post (active or soft-deleted) and all its comments.
export const purgePost = async (postId: string) => {
  const post = await Post.findByIdAndDelete(postId);
  if (!post) throw ApiError.notFound("Post not found");
  await Comment.deleteMany({ post: postId });
};

// ---------- Comments ----------

export const listComments = async (page: number, limit: number) => {
  const [comments, total] = await Promise.all([
    Comment.find()
      .sort({ createdAt: -1, _id: -1 })
      .skip(toSkip(page, limit))
      .limit(limit)
      .populate("author", "name email")
      .populate("post", "title slug isDeleted")
      .lean(),
    Comment.estimatedDocumentCount(),
  ]);

  return { comments, meta: buildPaginationMeta(page, limit, total) };
};

export const deleteComment = async (commentId: string) => {
  const comment = await Comment.findByIdAndDelete(commentId);
  if (!comment) throw ApiError.notFound("Comment not found");
};
