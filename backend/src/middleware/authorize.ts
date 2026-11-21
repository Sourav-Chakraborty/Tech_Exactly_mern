import type { NextFunction, Request, Response } from "express";
import type { Role } from "../models/user.model";
import { ApiError } from "../utils/ApiError";

// Role-based access control. Use after authenticate: authorize("admin")
export const authorize =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw ApiError.unauthorized();
    if (!roles.includes(req.user.role)) throw ApiError.forbidden();
    next();
  };
