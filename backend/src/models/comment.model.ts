import { Schema, model, type HydratedDocument, type Types } from "mongoose";

export interface IComment {
  content: string;
  post: Types.ObjectId;
  author: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type CommentDocument = HydratedDocument<IComment>;

const commentSchema = new Schema<IComment>(
  {
    content: { type: String, required: true, trim: true, maxlength: 2000 },
    post: { type: Schema.Types.ObjectId, ref: "Post", required: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true, versionKey: false },
);

// A post's comments, newest first.
commentSchema.index({ post: 1, createdAt: -1 });

export const Comment = model<IComment>("Comment", commentSchema);
