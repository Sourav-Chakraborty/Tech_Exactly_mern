import request from "supertest";
import app from "../../src/app";
import { ActivityLog } from "../../src/models/activityLog.model";
import { User } from "../../src/models/user.model";
import { REFRESH_GRACE_MS } from "../../src/services/auth.service";
import { PASSWORD, bearer, createUser, refreshCookieFrom } from "../helpers";

const api = request(app);
const flushLogs = () => new Promise((r) => setTimeout(r, 50));

describe("Auth API /api/v1/auth", () => {
  describe("POST /register", () => {
    it("creates the account, returns an access token and sets an httpOnly refresh cookie", async () => {
      const res = await api
        .post("/api/v1/auth/register")
        .send({ name: "Alice", email: "ALICE@Test.dev ", password: PASSWORD })
        .expect(201);

      expect(res.body).toMatchObject({
        success: true,
        message: "Registration successful",
        data: { user: { name: "Alice", email: "alice@test.dev", role: "user" }, accessToken: expect.any(String) },
      });
      expect(res.body.data.user).not.toHaveProperty("password");

      const cookie = (res.headers["set-cookie"] as unknown as string[])[0];
      expect(cookie).toMatch(/^refreshToken=/);
      expect(cookie).toMatch(/HttpOnly/);
      expect(cookie).toMatch(/Path=\/api\/v1\/auth/);
    });

    it("returns 400 with per-field details for an invalid body", async () => {
      const res = await api
        .post("/api/v1/auth/register")
        .send({ name: "A", email: "nope", password: "123" })
        .expect(400);
      expect(res.body.success).toBe(false);
      expect(res.body.details.map((d: { field: string }) => d.field).sort()).toEqual(["email", "name", "password"]);
    });

    it("returns 409 for an email that already exists", async () => {
      const user = await createUser();
      await api
        .post("/api/v1/auth/register")
        .send({ name: "Dup", email: user.email, password: PASSWORD })
        .expect(409);
    });
  });

  describe("POST /login", () => {
    it("logs in and records the activity", async () => {
      const user = await createUser();
      const res = await api.post("/api/v1/auth/login").send({ email: user.email, password: PASSWORD }).expect(200);

      expect(res.body.data.user.id ?? res.body.data.user._id).toBe(user.id);
      expect(refreshCookieFrom(res)).toBeDefined();
      await flushLogs();
      expect(await ActivityLog.countDocuments({ user: user.id, action: "auth.login" })).toBe(1);
    });

    it("returns 401 for wrong credentials and does not log it", async () => {
      const user = await createUser();
      await api.post("/api/v1/auth/login").send({ email: user.email, password: "wrong-pass" }).expect(401);
      await flushLogs();
      expect(await ActivityLog.countDocuments()).toBe(0);
    });

    it("returns 403 for a deactivated account", async () => {
      const user = await createUser({ isActive: false });
      await api.post("/api/v1/auth/login").send({ email: user.email, password: PASSWORD }).expect(403);
    });
  });

  describe("POST /refresh", () => {
    it("issues a new token pair; the old cookie works only during the grace period", async () => {
      const user = await createUser();
      const login = await api.post("/api/v1/auth/login").send({ email: user.email, password: PASSWORD });
      const oldCookie = refreshCookieFrom(login)!;

      const res = await api.post("/api/v1/auth/refresh").set("Cookie", oldCookie).expect(200);
      expect(res.body.data.accessToken).toEqual(expect.any(String));
      expect(refreshCookieFrom(res)).not.toBe(oldCookie);

      // A second tab sending the same (just replaced) cookie is fine...
      await api.post("/api/v1/auth/refresh").set("Cookie", oldCookie).expect(200);

      // ...but after the grace period it counts as reuse of a stolen token.
      await User.updateOne(
        { _id: user.id },
        { $set: { "rotatedRefreshTokens.$[].rotatedAt": new Date(Date.now() - REFRESH_GRACE_MS - 1000) } },
      );
      await api.post("/api/v1/auth/refresh").set("Cookie", oldCookie).expect(401);
    });

    it("never exposes the rotated-token bookkeeping in responses", async () => {
      const user = await createUser();
      const login = await api.post("/api/v1/auth/login").send({ email: user.email, password: PASSWORD });
      const res = await api.post("/api/v1/auth/refresh").set("Cookie", refreshCookieFrom(login)!).expect(200);
      expect(res.body.data.user).not.toHaveProperty("rotatedRefreshTokens");
      expect(res.body.data.user).not.toHaveProperty("refreshTokens");
    });

    it("returns 401 and clears the cookie when there is no valid token", async () => {
      const res = await api.post("/api/v1/auth/refresh").expect(401);
      expect(res.body.message).toBe("Refresh token missing");
      expect((res.headers["set-cookie"] as unknown as string[])[0]).toMatch(/refreshToken=;/);
    });
  });

  describe("POST /logout", () => {
    it("revokes the session so the refresh cookie no longer works", async () => {
      const user = await createUser();
      const login = await api.post("/api/v1/auth/login").send({ email: user.email, password: PASSWORD });
      const cookie = refreshCookieFrom(login)!;

      await api.post("/api/v1/auth/logout").set("Cookie", cookie).expect(200);
      await api.post("/api/v1/auth/refresh").set("Cookie", cookie).expect(401);
    });

    it("succeeds even without a cookie", async () => {
      await api.post("/api/v1/auth/logout").expect(200);
    });
  });

  describe("GET /me", () => {
    it("returns the authenticated user", async () => {
      const user = await createUser();
      const res = await api.get("/api/v1/auth/me").set(bearer(user)).expect(200);
      expect(res.body.data.user).toEqual({ id: user.id, name: user.name, email: user.email, role: "user" });
    });

    it("returns 401 without or with an invalid token", async () => {
      await api.get("/api/v1/auth/me").expect(401);
      const res = await api.get("/api/v1/auth/me").set("Authorization", "Bearer abc").expect(401);
      expect(res.body.message).toBe("Invalid token");
    });
  });
});

describe("App-level behaviour", () => {
  it("returns a consistent 404 for unknown routes", async () => {
    const res = await api.get("/api/v1/does-not-exist").expect(404);
    expect(res.body).toEqual({ success: false, message: "Route GET /api/v1/does-not-exist not found" });
  });

  it("returns 400 for malformed JSON", async () => {
    const res = await api
      .post("/api/v1/auth/login")
      .set("Content-Type", "application/json")
      .send("{bad json")
      .expect(400);
    expect(res.body.success).toBe(false);
  });

  it("serves the health check and sets security headers (helmet)", async () => {
    const res = await api.get("/api/v1/health").expect(200);
    expect(res.body.data).toMatchObject({ status: "ok", db: "connected" });
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers).not.toHaveProperty("x-powered-by");
  });
});
