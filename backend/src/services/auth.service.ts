import { User, type UserDocument } from "../models/user.model";
import type { LoginInput, RegisterInput } from "../validators/auth.validator";
import { ApiError } from "../utils/ApiError";
import {
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt";

// Cap concurrent sessions per user so the stored hash list can't grow unbounded.
const MAX_SESSIONS = 5;

export interface AuthResult {
  user: UserDocument;
  accessToken: string;
  refreshToken: string;
}

// Issues a new token pair and stores the refresh token hash on the user.
const issueTokens = async (user: UserDocument, replaceHash?: string): Promise<AuthResult> => {
  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const refreshToken = signRefreshToken(user.id);

  const hashes = (user.refreshTokens ?? []).filter((h) => h !== replaceHash);
  hashes.push(hashToken(refreshToken));
  user.refreshTokens = hashes.slice(-MAX_SESSIONS);
  await user.save();

  return { user, accessToken, refreshToken };
};

export const register = async (input: RegisterInput): Promise<AuthResult> => {
  const exists = await User.exists({ email: input.email });
  if (exists) throw ApiError.conflict("Email is already registered");

  const user = await User.create(input);
  return issueTokens(user);
};

export const login = async ({ email, password }: LoginInput): Promise<AuthResult> => {
  const user = await User.findOne({ email }).select("+password +refreshTokens");

  // Same message for unknown email and wrong password to avoid account enumeration.
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized("Invalid email or password");
  }
  if (!user.isActive) throw ApiError.forbidden("Account is deactivated");

  return issueTokens(user);
};

// Rotation: the presented refresh token is consumed and replaced by a new one.
export const refresh = async (token: string | undefined): Promise<AuthResult> => {
  if (!token) throw ApiError.unauthorized("Refresh token missing");

  const payload = verifyRefreshToken(token);
  const user = await User.findById(payload.sub).select("+refreshTokens");
  if (!user) throw ApiError.unauthorized("Invalid refresh token");

  const hash = hashToken(token);
  if (!user.refreshTokens.includes(hash)) {
    // A validly signed token that isn't stored was already used or revoked:
    // treat it as theft and revoke every session for this user.
    user.refreshTokens = [];
    await user.save();
    throw ApiError.unauthorized("Refresh token has been revoked");
  }
  if (!user.isActive) throw ApiError.forbidden("Account is deactivated");

  return issueTokens(user, hash);
};

// Revokes only the current session's refresh token. Never fails, so logout is always clean.
export const logout = async (token: string | undefined): Promise<void> => {
  if (!token) return;
  try {
    const payload = verifyRefreshToken(token);
    await User.updateOne({ _id: payload.sub }, { $pull: { refreshTokens: hashToken(token) } });
  } catch {
    // Expired or tampered token: nothing to revoke.
  }
};
