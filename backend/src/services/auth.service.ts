import { User, type UserDocument } from "../models/user.model";
import type { LoginInput, RegisterInput } from "../validators/auth.validator";
import { ApiError } from "../utils/ApiError";
import type { OAuthProfile } from "../config/passport";
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

// Social login. Resolves the account in this order:
//   1. already linked to this provider id  -> log in
//   2. existing account with the same email -> link the provider to it, log in
//   3. otherwise                            -> create a new (password-less) account
const findUserWithSessions = (filter: Record<string, string>) =>
  User.findOne<UserDocument>(filter).select("+refreshTokens");

export const oauthLogin = async (profile: OAuthProfile): Promise<AuthResult> => {
  const providerField = profile.provider === "google" ? "googleId" : "facebookId";

  let user = await findUserWithSessions({ [providerField]: profile.providerId });

  if (!user) {
    if (!profile.email) {
      throw ApiError.badRequest(
        `Your ${profile.provider} account did not share an email address, which is required`,
      );
    }

    user = await findUserWithSessions({ email: profile.email });
    if (user) {
      user.set(providerField, profile.providerId);
    } else {
      user = new User({
        name: (profile.name || profile.email.split("@")[0]).slice(0, 50),
        email: profile.email,
        [providerField]: profile.providerId,
      });
    }
  }

  if (!user.isActive) throw ApiError.forbidden("Account is deactivated");

  return issueTokens(user); // saves the link / new user together with the session
};

// How long a just-replaced refresh token is still accepted. Covers concurrent refreshes that
// carry the same cookie: several tabs restoring the session at once, or a refresh racing a reload.
export const REFRESH_GRACE_MS = 30_000;
// Replaced-token links kept per user (older ones are past the grace period anyway).
const MAX_ROTATED_LINKS = 10;

// Finds the session's current token hash for the presented one:
//   - the hash itself if it is current
//   - otherwise follows "replaced by" links, but only through replacements made within the
//     grace period (so 3+ tabs racing on the same cookie all resolve to the same session)
//   - undefined if the token is unknown, or was replaced longer ago than the grace period
const resolveCurrentHash = (user: UserDocument, hash: string): string | undefined => {
  const cutoff = Date.now() - REFRESH_GRACE_MS;
  let candidate = hash;
  for (let hops = 0; hops <= MAX_ROTATED_LINKS; hops++) {
    if (user.refreshTokens.includes(candidate)) return candidate;
    const link = user.rotatedRefreshTokens.find(
      (r) => r.hash === candidate && r.rotatedAt.getTime() > cutoff,
    );
    if (!link) return undefined;
    candidate = link.replacedBy;
  }
  return undefined;
};

// Rotation: the presented refresh token is consumed and replaced by a new one.
// A token reused after the grace period is treated as stolen and every session is revoked.
export const refresh = async (token: string | undefined, attempt = 0): Promise<AuthResult> => {
  if (!token) throw ApiError.unauthorized("Refresh token missing");

  const payload = verifyRefreshToken(token);
  const user = await User.findById(payload.sub).select("+refreshTokens +rotatedRefreshTokens");
  if (!user) throw ApiError.unauthorized("Invalid refresh token");

  const currentHash = resolveCurrentHash(user, hashToken(token));
  if (!currentHash) {
    await User.updateOne({ _id: user._id }, { refreshTokens: [], rotatedRefreshTokens: [] });
    throw ApiError.unauthorized("Refresh token has been revoked");
  }
  if (!user.isActive) throw ApiError.forbidden("Account is deactivated");

  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const refreshToken = signRefreshToken(user.id);
  const newHash = hashToken(refreshToken);

  // Atomic swap of this session's hash (positional $), so two refreshes that arrive at the
  // same time can't overwrite each other's session.
  const { modifiedCount } = await User.updateOne(
    { _id: user._id, refreshTokens: currentHash },
    {
      $set: { "refreshTokens.$": newHash },
      $push: {
        rotatedRefreshTokens: {
          $each: [{ hash: currentHash, replacedBy: newHash, rotatedAt: new Date() }],
          $slice: -MAX_ROTATED_LINKS,
        },
      },
    },
  );

  // Another request rotated this session between our read and write: resolve again, now
  // through the fresh "replaced by" link. Each retry means a competing request succeeded,
  // so this is bounded by the number of concurrent refreshes.
  if (modifiedCount === 0) {
    if (attempt >= MAX_ROTATED_LINKS) throw ApiError.unauthorized("Refresh token has been revoked");
    return refresh(token, attempt + 1);
  }

  return { user, accessToken, refreshToken };
};

// Revokes only the current session's refresh token. Never fails, so logout is always clean.
// Returns the user id when a session was identified (used for activity logging).
export const logout = async (token: string | undefined): Promise<string | undefined> => {
  if (!token) return undefined;
  try {
    const payload = verifyRefreshToken(token);
    await User.updateOne({ _id: payload.sub }, { $pull: { refreshTokens: hashToken(token) } });
    return payload.sub;
  } catch {
    // Expired or tampered token: nothing to revoke.
    return undefined;
  }
};
