import type { NextFunction, Request, Response } from "express";
import { User } from "../models/user.model";
import { ApiError } from "../utils/ApiError";
import { verifyAccessToken } from "../utils/jwt";

// Verifies the Bearer access token and attaches the user to req.user.
// The user is re-read from the DB so deactivation and role changes apply immediately,
// not only after the access token expires.
export const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw ApiError.unauthorized();

  // Invalid / expired tokens throw JWT errors that the error handler maps to 401.
  const payload = verifyAccessToken(header.slice(7));

  const user = await User.findById(payload.sub).select("name email role isActive").lean();
  if (!user) throw ApiError.unauthorized("User no longer exists");
  if (!user.isActive) throw ApiError.forbidden("Account is deactivated");

  req.user = { id: String(user._id), name: user.name, email: user.email, role: user.role };
  next();
};
