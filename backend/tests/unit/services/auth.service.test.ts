import * as authService from "../../../src/services/auth.service";
import { User } from "../../../src/models/user.model";
import { hashToken, verifyAccessToken } from "../../../src/utils/jwt";
import { PASSWORD, createUser } from "../../helpers";

const sessionsOf = async (id: string) => (await User.findById(id).select("+refreshTokens"))!.refreshTokens;

// Pretend every rotation happened before the grace period started.
const expireGracePeriod = (id: string) =>
  User.updateOne(
    { _id: id },
    { $set: { "rotatedRefreshTokens.$[].rotatedAt": new Date(Date.now() - authService.REFRESH_GRACE_MS - 1000) } },
  );

describe("auth.service", () => {
  describe("register", () => {
    it("creates a user with a bcrypt-hashed password and returns tokens", async () => {
      const result = await authService.register({ name: "Alice", email: "alice@test.dev", password: PASSWORD });

      const stored = await User.findById(result.user.id).select("+password");
      expect(stored!.password).toMatch(/^\$2[aby]\$04\$/); // cost from BCRYPT_SALT_ROUNDS
      expect(await stored!.comparePassword(PASSWORD)).toBe(true);
      expect(stored!.password).not.toBe(PASSWORD);
      expect(verifyAccessToken(result.accessToken)).toMatchObject({ sub: result.user.id, role: "user" });
      expect(await sessionsOf(result.user.id)).toEqual([hashToken(result.refreshToken)]);
    });

    it("rejects an email that is already registered with 409", async () => {
      const existing = await createUser();
      await expect(
        authService.register({ name: "Dup", email: existing.email, password: PASSWORD }),
      ).rejects.toMatchObject({ statusCode: 409 });
    });

    it("never exposes password or refresh tokens in JSON", async () => {
      const { user } = await authService.register({ name: "A", email: "a@test.dev", password: PASSWORD });
      const json = JSON.parse(JSON.stringify(user));
      expect(json).not.toHaveProperty("password");
      expect(json).not.toHaveProperty("refreshTokens");
    });
  });

  describe("login", () => {
    it("logs in with the correct password", async () => {
      const user = await createUser();
      const result = await authService.login({ email: user.email, password: PASSWORD });
      expect(result.user.id).toBe(user.id);
    });

    it("uses the same 401 message for an unknown email and a wrong password", async () => {
      const user = await createUser();
      const expected = { statusCode: 401, message: "Invalid email or password" };
      await expect(authService.login({ email: user.email, password: "wrong-pass" })).rejects.toMatchObject(expected);
      await expect(authService.login({ email: "nobody@test.dev", password: PASSWORD })).rejects.toMatchObject(expected);
    });

    it("rejects a deactivated user with 403", async () => {
      const user = await createUser({ isActive: false });
      await expect(authService.login({ email: user.email, password: PASSWORD })).rejects.toMatchObject({
        statusCode: 403,
      });
    });

    it("keeps at most 5 sessions, dropping the oldest", async () => {
      const user = await createUser();
      const tokens: string[] = [];
      for (let i = 0; i < 6; i++) {
        tokens.push((await authService.login({ email: user.email, password: PASSWORD })).refreshToken);
      }
      const sessions = await sessionsOf(user.id);
      expect(sessions).toHaveLength(5);
      expect(sessions).not.toContain(hashToken(tokens[0]));
      expect(sessions).toContain(hashToken(tokens[5]));
    });
  });

  describe("refresh", () => {
    it("rotates the refresh token: the old one is replaced by the new one", async () => {
      const user = await createUser();
      const first = await authService.login({ email: user.email, password: PASSWORD });

      const second = await authService.refresh(first.refreshToken);

      expect(second.refreshToken).not.toBe(first.refreshToken);
      expect(await sessionsOf(user.id)).toEqual([hashToken(second.refreshToken)]);
    });

    it("treats reuse of a token replaced longer ago than the grace period as theft", async () => {
      const user = await createUser();
      const deviceA = await authService.login({ email: user.email, password: PASSWORD });
      const deviceB = await authService.login({ email: user.email, password: PASSWORD });
      await authService.refresh(deviceA.refreshToken); // A's token is now replaced
      await expireGracePeriod(user.id);

      await expect(authService.refresh(deviceA.refreshToken)).rejects.toMatchObject({ statusCode: 401 });
      expect(await sessionsOf(user.id)).toEqual([]);
      await expect(authService.refresh(deviceB.refreshToken)).rejects.toMatchObject({ statusCode: 401 });
    });

    describe("grace period (concurrent refreshes with the same cookie, e.g. several tabs)", () => {
      it("accepts a just-replaced token and keeps it as ONE session", async () => {
        const user = await createUser();
        const { refreshToken: t1 } = await authService.login({ email: user.email, password: PASSWORD });

        const tabA = await authService.refresh(t1);
        const tabB = await authService.refresh(t1); // same cookie, a moment later

        expect(tabB.accessToken).toEqual(expect.any(String));
        expect(await sessionsOf(user.id)).toEqual([hashToken(tabB.refreshToken)]);
        // Tab A's token was superseded within the grace period too, so it still works.
        const again = await authService.refresh(tabA.refreshToken);
        expect(await sessionsOf(user.id)).toEqual([hashToken(again.refreshToken)]);
      });

      it("handles truly simultaneous refreshes (several tabs at once) without revoking", async () => {
        const user = await createUser();
        const { refreshToken: t1 } = await authService.login({ email: user.email, password: PASSWORD });

        const results = await Promise.allSettled([1, 2, 3, 4].map(() => authService.refresh(t1)));

        expect(results.every((r) => r.status === "fulfilled")).toBe(true);
        const sessions = await sessionsOf(user.id);
        expect(sessions).toHaveLength(1);
        // Whichever response's cookie the browser keeps, it leads to that one session.
        for (const r of results as PromiseFulfilledResult<authService.AuthResult>[]) {
          await expect(authService.refresh(r.value.refreshToken)).resolves.toBeDefined();
        }
      });

      it("does not resurrect a session that was logged out", async () => {
        const user = await createUser();
        const { refreshToken: t1 } = await authService.login({ email: user.email, password: PASSWORD });
        const { refreshToken: t2 } = await authService.refresh(t1);
        await authService.logout(t2);

        await expect(authService.refresh(t1)).rejects.toMatchObject({ statusCode: 401 });
      });
    });

    it("rejects a missing token with 401", async () => {
      await expect(authService.refresh(undefined)).rejects.toMatchObject({ statusCode: 401 });
    });

    it("rejects a deactivated user with 403", async () => {
      const user = await createUser();
      const { refreshToken } = await authService.login({ email: user.email, password: PASSWORD });
      await User.updateOne({ _id: user.id }, { isActive: false });
      await expect(authService.refresh(refreshToken)).rejects.toMatchObject({ statusCode: 403 });
    });
  });

  describe("logout", () => {
    it("revokes only the current session and returns the user id", async () => {
      const user = await createUser();
      const a = await authService.login({ email: user.email, password: PASSWORD });
      const b = await authService.login({ email: user.email, password: PASSWORD });

      expect(await authService.logout(a.refreshToken)).toBe(user.id);
      expect(await sessionsOf(user.id)).toEqual([hashToken(b.refreshToken)]);
    });

    it("never throws for a missing or invalid token", async () => {
      await expect(authService.logout(undefined)).resolves.toBeUndefined();
      await expect(authService.logout("garbage")).resolves.toBeUndefined();
    });
  });

  describe("oauthLogin", () => {
    const google = (overrides: Partial<{ providerId: string; email: string; name: string }> = {}) => ({
      provider: "google" as const,
      providerId: "g-1",
      name: "Google User",
      email: "guser@test.dev",
      ...overrides,
    });

    it("creates a password-less account for a new user", async () => {
      const { user } = await authService.oauthLogin(google());
      const stored = await User.findById(user.id).select("+password");
      expect(stored).toMatchObject({ name: "Google User", email: "guser@test.dev", googleId: "g-1" });
      expect(stored!.password).toBeUndefined();
    });

    it("logs a returning user into the same account without losing other sessions", async () => {
      const first = await authService.oauthLogin(google());
      const second = await authService.oauthLogin(google({ email: undefined }));
      expect(second.user.id).toBe(first.user.id);
      expect(await User.countDocuments()).toBe(1);
      expect(await sessionsOf(first.user.id)).toHaveLength(2);
    });

    it("links the provider to an existing account with the same email", async () => {
      const existing = await createUser();
      const { user } = await authService.oauthLogin({
        provider: "facebook",
        providerId: "fb-9",
        name: "FB",
        email: existing.email,
      });
      expect(user.id).toBe(existing.id);
      const stored = await User.findById(existing.id).select("+password");
      expect(stored!.facebookId).toBe("fb-9");
      expect(stored!.password).toBeDefined(); // password login keeps working
    });

    it("requires an email to create a new account", async () => {
      await expect(authService.oauthLogin(google({ email: undefined }))).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it("falls back to the email's local part when the provider gives no name, capped at 50 chars", async () => {
      const { user } = await authService.oauthLogin(google({ name: "" }));
      expect(user.name).toBe("guser");
      const long = await authService.oauthLogin(google({ providerId: "g-2", email: "l@test.dev", name: "x".repeat(80) }));
      expect(long.user.name).toHaveLength(50);
    });

    it("rejects a deactivated account with 403", async () => {
      await createUser({ isActive: false }).then((u) => User.updateOne({ _id: u.id }, { googleId: "g-1" }));
      await expect(authService.oauthLogin(google())).rejects.toMatchObject({ statusCode: 403 });
    });
  });
});
