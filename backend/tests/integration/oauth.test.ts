import request from "supertest";
import type { Express } from "express";

// Enable Google (Facebook stays unconfigured) before the app and its passport config load.
// Each Jest test file has its own module registry, so this doesn't leak into other files.
process.env.GOOGLE_CLIENT_ID = "test-google-id";
process.env.GOOGLE_CLIENT_SECRET = "test-google-secret";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const app: Express = require("../../src/app").default;

describe("Social login routes", () => {
  it("returns 501 for a provider that is not configured", async () => {
    const res = await request(app).get("/api/v1/auth/facebook").expect(501);
    expect(res.body.message).toMatch(/not configured/);
  });

  it("redirects to Google with our callback URL, scopes and a state stored in a cookie", async () => {
    const res = await request(app).get("/api/v1/auth/google").expect(302);

    const location = new URL(res.headers.location);
    expect(location.host).toBe("accounts.google.com");
    expect(location.searchParams.get("client_id")).toBe("test-google-id");
    expect(location.searchParams.get("redirect_uri")).toBe("http://localhost:5000/api/v1/auth/google/callback");
    expect(location.searchParams.get("scope")).toBe("profile email");

    const state = location.searchParams.get("state");
    const cookie = (res.headers["set-cookie"] as unknown as string[]).find((c) => c.startsWith("oauthState="));
    expect(cookie).toContain(`oauthState=${state}`);
    expect(cookie).toMatch(/HttpOnly/);
  });

  it.each([
    ["no state cookie", undefined, "abc"],
    ["a forged state", "real-state", "forged"],
  ])("rejects the callback with %s (CSRF protection)", async (_label, cookieState, queryState) => {
    const req = request(app).get(`/api/v1/auth/google/callback?code=x&state=${queryState}`);
    if (cookieState) req.set("Cookie", `oauthState=${cookieState}`);
    const res = await req.expect(302);

    expect(res.headers.location).toMatch(/^http:\/\/localhost:5173\/login\?error=/);
    expect((res.headers["set-cookie"] as unknown as string[] | undefined)?.some((c) => c.startsWith("refreshToken="))).toBeFalsy();
  });

  it("redirects with an error when the user cancels on the consent screen", async () => {
    const res = await request(app)
      .get("/api/v1/auth/google/callback?error=access_denied&state=s1")
      .set("Cookie", "oauthState=s1")
      .expect(302);
    expect(decodeURIComponent(res.headers.location)).toContain("google login was cancelled or failed");
  });

  // Last: it replaces the Google strategy on the shared app.
  it("on success: creates the user, sets the refresh cookie and redirects to the frontend", async () => {
    // Stand-in for Google's token/profile exchange: the strategy "returns" a fixed profile.
    const passport = require("../../src/config/passport").default;
    const { Strategy } = require("passport-strategy");
    class FakeGoogle extends Strategy {
      authenticate() {
        this.success({ provider: "google", providerId: "g-42", name: "Gina", email: "gina@test.dev" });
      }
    }
    passport.use("google", new FakeGoogle());

    const res = await request(app)
      .get("/api/v1/auth/google/callback?code=ok&state=s1")
      .set("Cookie", "oauthState=s1")
      .expect(302);

    expect(res.headers.location).toBe("http://localhost:5173/oauth/callback");
    const cookies = res.headers["set-cookie"] as unknown as string[];
    const refresh = cookies.find((c) => c.startsWith("refreshToken="))!;
    expect(refresh).toMatch(/HttpOnly/);
    expect(cookies.some((c) => c.startsWith("oauthState=;"))).toBe(true); // state is single-use

    // The frontend then exchanges the cookie for an access token.
    const me = await request(app).post("/api/v1/auth/refresh").set("Cookie", refresh.split(";")[0]).expect(200);
    expect(me.body.data.user).toMatchObject({ name: "Gina", email: "gina@test.dev", googleId: "g-42" });
  });

});
