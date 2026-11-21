import { Schema, model, type Types } from "mongoose";

export const ACTIVITY_ACTIONS = [
  "auth.register",
  "auth.login",
  "auth.logout",
  "post.create",
  "post.update",
  "post.delete",
  "comment.create",
  "comment.update",
  "comment.delete",
] as const;
export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number];

export interface IActivityLog {
  user: Types.ObjectId;
  action: ActivityAction;
  resourceId?: Types.ObjectId;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
}

const activityLogSchema = new Schema<IActivityLog>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, enum: ACTIVITY_ACTIONS, required: true },
    resourceId: { type: Schema.Types.ObjectId },
    ip: String,
    userAgent: String,
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);

// Recent activity overall, and per user.
activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ user: 1, createdAt: -1 });

export const ActivityLog = model<IActivityLog>("ActivityLog", activityLogSchema);
