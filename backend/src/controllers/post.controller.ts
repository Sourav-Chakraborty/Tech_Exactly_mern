import type { Request, Response } from "express";
import * as postService from "../services/post.service";
import type { PostDocument } from "../models/post.model";
import type { ListPostsQuery } from "../validators/post.validator";
import { sendSuccess } from "../utils/ApiResponse";

export const listPosts = async (req: Request, res: Response) => {
  const { posts, meta } = await postService.listPosts(req.query as unknown as ListPostsQuery);
  sendSuccess(res, { data: posts, meta: { ...meta } });
};

export const getPost = async (req: Request, res: Response) => {
  const post = await postService.getPost(req.params.idOrSlug as string);
  sendSuccess(res, { data: post });
};

export const createPost = async (req: Request, res: Response) => {
  const post = await postService.createPost(req.user!.id, req.body);
  res.locals.resourceId = post.id; // for the activity logger
  sendSuccess(res, { statusCode: 201, message: "Post created", data: post });
};

// res.locals.resource is the post loaded by checkOwnership.
export const updatePost = async (req: Request, res: Response) => {
  const post = await postService.updatePost(res.locals.resource as PostDocument, req.body);
  sendSuccess(res, { message: "Post updated", data: post });
};

export const deletePost = async (_req: Request, res: Response) => {
  await postService.deletePost(res.locals.resource as PostDocument);
  sendSuccess(res, { message: "Post deleted" });
};
