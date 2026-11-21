import { isObjectIdOrHexString } from "mongoose";
import { Post, type PostDocument } from "../models/post.model";
import { ApiError } from "../utils/ApiError";
import { notificationService } from "./notification.service";
import { buildPaginationMeta, toSkip } from "../utils/pagination";
import { slugify, slugSuffix } from "../utils/slugify";
import type { CreatePostInput, ListPostsQuery, UpdatePostInput } from "../validators/post.validator";

// Only the author's name is needed to render a post.
const AUTHOR_FIELDS = "name";

// Returns the title's slug, or the slug with a random suffix if it's already taken.
// The unique index on slug is the final guard against a race between two requests.
const generateUniqueSlug = async (title: string): Promise<string> => {
  const base = slugify(title);
  const taken = await Post.exists({ slug: base });
  return taken ? `${base}-${slugSuffix()}` : base;
};

export const listPosts = async ({ page, limit, author }: ListPostsQuery) => {
  const filter = { isDeleted: false, ...(author ? { author } : {}) };

  const [posts, total] = await Promise.all([
    Post.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip(toSkip(page, limit))
      .limit(limit)
      .select("-isDeleted -deletedAt")
      .populate("author", AUTHOR_FIELDS)
      .lean(),
    Post.countDocuments(filter),
  ]);

  return { posts, meta: buildPaginationMeta(page, limit, total) };
};

// Accepts either a Mongo id or a slug. A 24-hex string could in theory also be a slug, so match both.
export const getPost = async (idOrSlug: string) => {
  const filter = isObjectIdOrHexString(idOrSlug)
    ? { $or: [{ _id: idOrSlug }, { slug: idOrSlug }] }
    : { slug: idOrSlug };

  const post = await Post.findOne({ ...filter, isDeleted: false })
    .select("-isDeleted -deletedAt")
    .populate("author", AUTHOR_FIELDS)
    .lean();
  if (!post) throw ApiError.notFound("Post not found");
  return post;
};

// Used by checkOwnership: a full document so the update/delete can save it directly.
export const findActivePostById = (id: string) => Post.findOne({ _id: id, isDeleted: false });

export const createPost = async (authorId: string, input: CreatePostInput) => {
  const post = await Post.create({
    ...input,
    author: authorId,
    slug: await generateUniqueSlug(input.title),
  });
  await post.populate("author", AUTHOR_FIELDS);

  notificationService.postCreated({
    authorId,
    authorName: (post.author as unknown as { name: string }).name,
    postTitle: post.title,
    postSlug: post.slug,
  });
  return post;
};

export const updatePost = async (post: PostDocument, input: UpdatePostInput) => {
  if (input.title !== undefined && input.title !== post.title) {
    post.title = input.title;
    post.slug = await generateUniqueSlug(input.title);
  }
  if (input.content !== undefined) post.content = input.content;

  await post.save();
  return post.populate("author", AUTHOR_FIELDS);
};

// Soft delete: the post stays in the database but disappears from every query above.
export const deletePost = async (post: PostDocument) => {
  post.isDeleted = true;
  post.deletedAt = new Date();
  await post.save();
};
