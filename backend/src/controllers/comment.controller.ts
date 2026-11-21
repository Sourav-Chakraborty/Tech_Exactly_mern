import type { Request, Response } from "express";
import * as commentService from "../services/comment.service";
import type { CommentDocument } from "../models/comment.model";
import { sendSuccess } from "../utils/ApiResponse";

export const listComments = async (req: Request, res: Response) => {
  const { page, limit } = req.query as unknown as { page: number; limit: number };
  const { comments, meta } = await commentService.listComments(
    req.params.postId as string,
    page,
    limit,
  );
  sendSuccess(res, { data: comments, meta: { ...meta } });
};

export const getComment = async (req: Request, res: Response) => {
  const comment = await commentService.getComment(
    req.params.postId as string,
    req.params.id as string,
  );
  sendSuccess(res, { data: comment });
};

export const createComment = async (req: Request, res: Response) => {
  const comment = await commentService.createComment(
    req.params.postId as string,
    req.user!.id,
    req.body,
  );
  res.locals.resourceId = comment.id; // for the activity logger
  sendSuccess(res, { statusCode: 201, message: "Comment added", data: comment });
};

// res.locals.resource is the comment loaded by checkOwnership.
export const updateComment = async (req: Request, res: Response) => {
  const comment = await commentService.updateComment(
    res.locals.resource as CommentDocument,
    req.body,
  );
  sendSuccess(res, { message: "Comment updated", data: comment });
};

export const deleteComment = async (_req: Request, res: Response) => {
  await commentService.deleteComment(res.locals.resource as CommentDocument);
  sendSuccess(res, { message: "Comment deleted" });
};
