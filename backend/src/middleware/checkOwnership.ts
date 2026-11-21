import type { NextFunction, Request, Response } from "express";
import type { Types } from "mongoose";
import { ApiError } from "../utils/ApiError";

interface OwnedResource {
  author: Types.ObjectId | string;
}

type ResourceLoader = (req: Request) => Promise<OwnedResource | null>;

// Allows the request only if req.user owns the resource (resource.author) or is an admin.
// The loaded resource is stored on res.locals.resource so the controller doesn't fetch it twice.
//
// Usage: checkOwnership((req) => Post.findOne({ _id: req.params.id, isDeleted: false }))
export const checkOwnership =
  (loadResource: ResourceLoader) => async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) throw ApiError.unauthorized();

    const resource = await loadResource(req);
    if (!resource) throw ApiError.notFound();

    const isOwner = String(resource.author) === req.user.id;
    if (!isOwner && req.user.role !== "admin") throw ApiError.forbidden();

    res.locals.resource = resource;
    next();
  };
