import { Schema, model, type HydratedDocument, type Model } from "mongoose";
import bcrypt from "bcryptjs";
import { env } from "../config/env";

export const ROLES = ["user", "admin"] as const;
export type Role = (typeof ROLES)[number];

// Links a replaced refresh token to the one that replaced it.
export interface RotatedRefreshToken {
  hash: string;
  replacedBy: string;
  rotatedAt: Date;
}

export interface IUser {
  name: string;
  email: string;
  password?: string; // absent for social-login accounts
  role: Role;
  googleId?: string;
  facebookId?: string;
  isActive: boolean;
  refreshTokens: string[]; // SHA-256 hashes of issued refresh tokens (one per session)
  rotatedRefreshTokens: RotatedRefreshToken[]; // recently replaced tokens (refresh grace period)
  createdAt: Date;
  updatedAt: Date;
}

interface IUserMethods {
  comparePassword(candidate: string): Promise<boolean>;
}

type UserModel = Model<IUser, object, IUserMethods>;
export type UserDocument = HydratedDocument<IUser, IUserMethods>;

const userSchema = new Schema<IUser, UserModel, IUserMethods>(
  {
    name: { type: String, required: true, trim: true, maxlength: 50 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, select: false },
    role: { type: String, enum: ROLES, default: "user" },
    googleId: { type: String, unique: true, sparse: true },
    facebookId: { type: String, unique: true, sparse: true },
    isActive: { type: Boolean, default: true },
    refreshTokens: { type: [String], select: false, default: [] },
    rotatedRefreshTokens: {
      type: [
        new Schema<RotatedRefreshToken>(
          { hash: String, replacedBy: String, rotatedAt: Date },
          { _id: false },
        ),
      ],
      select: false,
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.password;
        delete ret.refreshTokens;
        delete ret.rotatedRefreshTokens;
        delete ret.__v;
        return ret;
      },
    },
  },
);

userSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) return;
  this.password = await bcrypt.hash(this.password, env.bcryptSaltRounds);
});

userSchema.methods.comparePassword = function (candidate: string) {
  if (!this.password) return Promise.resolve(false);
  return bcrypt.compare(candidate, this.password);
};

export const User = model<IUser, UserModel>("User", userSchema);
