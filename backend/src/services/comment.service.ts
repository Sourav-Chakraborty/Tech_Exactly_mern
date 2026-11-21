import { Comment, type CommentDocument } from "../models/comment.model";
import { Post } from "../models/post.model";
import { ApiError } from "../utils/ApiError";
import { buildPaginationMeta, toSkip } from "../utils/pagination";
import type { CommentInput } from "../validators/comment.validator";

// Only the author's name is needed to render a comment.
const AUTHOR_FIELDS = "name";

// Comments only exist through a post that hasn't been (soft) deleted.
const assertPostExists = async (postId: string) => {
  const exists = await Post.exists({ _id: postId, isDeleted: false });
  if (!exists) throw ApiError.notFound("Post not found");
};

export const listComments = async (postId: string, page: number, limit: number) => {
  await assertPostExists(postId);

  const filter = { post: postId };
  const [comments, total] = await Promise.all([
    Comment.find(filter)
      .sort({ createdAt: -1 })
      .skip(toSkip(page, limit))
      .limit(limit)
      .populate("author", AUTHOR_FIELDS)
      .lean(),
    Comment.countDocuments(filter),
  ]);

  return { comments, meta: buildPaginationMeta(page, limit, total) };
};

export const getComment = async (postId: string, id: string) => {
  const [comment] = await Promise.all([
    Comment.findOne({ _id: id, post: postId }).populate("author", AUTHOR_FIELDS).lean(),
    assertPostExists(postId),
  ]);
  if (!comment) throw ApiError.notFound("Comment not found");
  return comment;
};

// Used by checkOwnership: a full document (so update/delete can act on it directly),
// or null when either the comment or its post doesn't exist.
export const findCommentOnActivePost = async (postId: string, id: string) => {
  const [comment, postExists] = await Promise.all([
    Comment.findOne({ _id: id, post: postId }),
    Post.exists({ _id: postId, isDeleted: false }),
  ]);
  return postExists ? comment : null;
};

export const createComment = async (postId: string, authorId: string, input: CommentInput) => {
  await assertPostExists(postId);
  const comment = await Comment.create({ ...input, post: postId, author: authorId });
  return comment.populate("author", AUTHOR_FIELDS);
};

export const updateComment = async (comment: CommentDocument, input: CommentInput) => {
  comment.content = input.content;
  await comment.save();
  return comment.populate("author", AUTHOR_FIELDS);
};

export const deleteComment = async (comment: CommentDocument) => {
  await comment.deleteOne();
};
