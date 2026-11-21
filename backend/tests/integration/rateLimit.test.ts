import request from "supertest";
import app from "../../src/app";
import { PASSWORD, createUser } from "../helpers";

// Kept in its own file: the limiter's in-memory store lives for the whole test file.
describe("Rate limiting on /auth/login and /auth/register", () => {
  it("blocks an IP after 10 failed attempts in the window, with RateLimit headers", async () => {
    const api = request(app);
    const user = await createUser();
    const attempt = () => api.post("/api/v1/auth/login").send({ email: user.email, password: "wrong-pass" });

    for (let i = 0; i < 10; i++) {
      const res = await attempt();
      expect(res.status).toBe(401);
      expect(res.headers).toHaveProperty("ratelimit");
    }

    const blocked = await attempt();
    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({ success: false, message: "Too many requests, please try again later" });

    // Even the correct password is blocked now.
    await api.post("/api/v1/auth/login").send({ email: user.email, password: PASSWORD }).expect(429);
  });
});
