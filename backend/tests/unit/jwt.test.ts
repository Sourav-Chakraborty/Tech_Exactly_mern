import jwt from "jsonwebtoken";
import {
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "../../src/utils/jwt";

describe("jwt utils", () => {
  it("signs and verifies an access token", () => {
    const token = signAccessToken({ sub: "user-1", role: "admin" });
    expect(verifyAccessToken(token)).toMatchObject({ sub: "user-1", role: "admin" });
  });

  it("issues unique refresh tokens (jti) even for the same user in the same second", () => {
    const a = signRefreshToken("user-1");
    const b = signRefreshToken("user-1");
    expect(a).not.toBe(b);
    expect(verifyRefreshToken(a)).toMatchObject({ sub: "user-1", jti: expect.any(String) });
  });

  it("does not accept a refresh token as an access token (different secrets)", () => {
    const refresh = signRefreshToken("user-1");
    expect(() => verifyAccessToken(refresh)).toThrow(jwt.JsonWebTokenError);
  });

  it("rejects an expired token", () => {
    const expired = jwt.sign({ sub: "u" }, process.env.JWT_ACCESS_SECRET!, { expiresIn: -10 });
    expect(() => verifyAccessToken(expired)).toThrow(jwt.TokenExpiredError);
  });

  it("hashes tokens deterministically with SHA-256", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
    expect(hashToken("abc")).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken("abc")).not.toBe(hashToken("abd"));
  });
});
