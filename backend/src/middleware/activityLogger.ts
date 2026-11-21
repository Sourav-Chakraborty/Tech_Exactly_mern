import type { NextFunction, Request, Response } from "express";
import { ActivityLog, type ActivityAction } from "../models/activityLog.model";

// Records a user activity once the response has finished successfully (2xx).
//
// The user is req.user (authenticated routes) or res.locals.userId (set by controllers on
// routes without authenticate, e.g. login). The resource id is res.locals.resourceId
// (e.g. a newly created post) or falls back to req.params.id.
//
// Logging is fire-and-forget: a failed write never affects the response.
export const logActivity =
  (action: ActivityAction) => (req: Request, res: Response, next: NextFunction) => {
    res.on("finish", () => {
      if (res.statusCode < 200 || res.statusCode >= 300) return;

      const user = req.user?.id ?? res.locals.userId;
      if (!user) return;

      ActivityLog.create({
        user,
        action,
        resourceId: res.locals.resourceId ?? req.params.id,
        ip: req.ip,
        userAgent: req.get("user-agent"),
      }).catch((err) => console.error(`Failed to log activity "${action}":`, err));
    });
    next();
  };

// Logs every request: method, URL, status, duration and the user (if authenticated).
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    const who = req.user ? ` user=${req.user.id}` : "";
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${ms.toFixed(1)}ms${who}`);
  });
  next();
};
