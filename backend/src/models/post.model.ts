import { Schema, model, type HydratedDocument, type Types } from "mongoose";

export interface IPost {
  title: string;
  content: string;
  slug: string;
  author: Types.ObjectId;
  isDeleted: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type PostDocument = HydratedDocument<IPost>;

const postSchema = new Schema<IPost>(
  {
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 150 },
    content: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

// Public feed: non-deleted posts, newest first.
postSchema.index({ isDeleted: 1, createdAt: -1, _id: -1 });
// A single author's posts, newest first.
postSchema.index({ author: 1, isDeleted: 1, createdAt: -1, _id: -1 });

export const Post = model<IPost>("Post", postSchema);
