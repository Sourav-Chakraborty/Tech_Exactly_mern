import request from "supertest";
import app from "../../src/app";
import { User } from "../../src/models/user.model";
import { Post } from "../../src/models/post.model";
import { Comment } from "../../src/models/comment.model";
import { ActivityLog } from "../../src/models/activityLog.model";
import { PASSWORD, bearer, createComment, createPost, createUser, refreshCookieFrom } from "../helpers";

const api = request(app);

describe("Admin API /api/v1/admin", () => {
  describe("access control (enforced on the API, not just the UI)", () => {
    const routes: [string, string][] = [
      ["get", "/api/v1/admin/stats"],
      ["get", "/api/v1/admin/users"],
      ["get", "/api/v1/admin/posts"],
      ["get", "/api/v1/admin/comments"],
    ];

    it.each(routes)("%s %s -> 401 without a token", async (method, url) => {
      await (api as unknown as Record<string, (u: string) => request.Test>)[method](url).expect(401);
    });

    it.each(routes)("%s %s -> 403 for a regular user", async (method, url) => {
      const user = await createUser();
      await (api as unknown as Record<string, (u: string) => request.Test>)[method](url).set(bearer(user)).expect(403);
    });

    it("applies role changes immediately (no new token needed)", async () => {
      const admin = await createUser({ role: "admin" });
      const user = await createUser();
      await api.get("/api/v1/admin/stats").set(bearer(user)).expect(403);

      await api.patch(`/api/v1/admin/users/${user.id}/role`).set(bearer(admin)).send({ role: "admin" }).expect(200);
      await api.get("/api/v1/admin/stats").set(bearer(user)).expect(200);
    });
  });

  it("GET /stats returns the dashboard totals", async () => {
    const admin = await createUser({ role: "admin" });
    const post = await createPost(admin.id);
    await createPost(admin.id, { isDeleted: true });
    await createComment(post.id, admin.id);
    await ActivityLog.create({ user: admin.id, action: "post.create", resourceId: post.id });

    const res = await api.get("/api/v1/admin/stats").set(bearer(admin)).expect(200);
    expect(res.body.data).toMatchObject({ totalUsers: 1, totalPosts: 1, deletedPosts: 1, totalComments: 1 });
    expect(res.body.data.recentActivity[0]).toMatchObject({ action: "post.create", user: { name: admin.name } });
  });

  describe("user management", () => {
    it("lists users with search and pagination", async () => {
      const admin = await createUser({ role: "admin", name: "Root" });
      await createUser({ name: "Zed" });
      const res = await api.get("/api/v1/admin/users?search=zed&limit=5").set(bearer(admin)).expect(200);
      expect(res.body.data.map((u: { name: string }) => u.name)).toEqual(["Zed"]);
      expect(res.body.meta.total).toBe(1);
    });

    it("validates the role and status payloads", async () => {
      const admin = await createUser({ role: "admin" });
      const user = await createUser();
      await api.patch(`/api/v1/admin/users/${user.id}/role`).set(bearer(admin)).send({ role: "god" }).expect(400);
      await api.patch(`/api/v1/admin/users/${user.id}/status`).set(bearer(admin)).send({ isActive: "no" }).expect(400);
    });

    it("deactivation locks the user out at once: access token, refresh and login", async () => {
      const admin = await createUser({ role: "admin" });
      const user = await createUser();
      const login = await api.post("/api/v1/auth/login").send({ email: user.email, password: PASSWORD });
      const cookie = refreshCookieFrom(login)!;

      await api.patch(`/api/v1/admin/users/${user.id}/status`).set(bearer(admin)).send({ isActive: false }).expect(200);

      await api.get("/api/v1/auth/me").set(bearer(user)).expect(403);
      await api.post("/api/v1/auth/refresh").set("Cookie", cookie).expect(401);
      await api.post("/api/v1/auth/login").send({ email: user.email, password: PASSWORD }).expect(403);
    });

    it("refuses actions on the admin's own account", async () => {
      const admin = await createUser({ role: "admin" });
      await api.patch(`/api/v1/admin/users/${admin.id}/role`).set(bearer(admin)).send({ role: "user" }).expect(400);
      await api.delete(`/api/v1/admin/users/${admin.id}`).set(bearer(admin)).expect(400);
    });

    it("deletes a user, their comments, and soft-deletes their posts", async () => {
      const admin = await createUser({ role: "admin" });
      const user = await createUser();
      const post = await createPost(user.id);
      await createComment(post.id, user.id);

      await api.delete(`/api/v1/admin/users/${user.id}`).set(bearer(admin)).expect(200);

      expect(await User.findById(user.id)).toBeNull();
      expect(await Comment.countDocuments()).toBe(0);
      expect(await Post.findById(post.id).lean()).toMatchObject({ isDeleted: true });
    });
  });

  describe("post management", () => {
    it("lists soft-deleted posts, restores one, and purges another", async () => {
      const admin = await createUser({ role: "admin" });
      const deleted = await createPost(admin.id, { isDeleted: true });
      const toPurge = await createPost(admin.id);
      await createComment(toPurge.id, admin.id);

      const list = await api.get("/api/v1/admin/posts?status=deleted").set(bearer(admin)).expect(200);
      expect(list.body.data.map((p: { _id: string }) => p._id)).toEqual([deleted.id]);
      expect(list.body.data[0]).toMatchObject({ isDeleted: true, author: { email: admin.email } });

      await api.patch(`/api/v1/admin/posts/${deleted.id}/restore`).set(bearer(admin)).expect(200);
      await api.get(`/api/v1/posts/${deleted.id}`).expect(200);

      await api.delete(`/api/v1/admin/posts/${toPurge.id}`).set(bearer(admin)).expect(200);
      expect(await Post.findById(toPurge.id)).toBeNull();
      expect(await Comment.countDocuments({ post: toPurge.id })).toBe(0);
    });

    it("rejects an invalid status filter", async () => {
      const admin = await createUser({ role: "admin" });
      await api.get("/api/v1/admin/posts?status=weird").set(bearer(admin)).expect(400);
    });
  });

  describe("comment management", () => {
    it("lists every comment with its post and deletes any comment by id", async () => {
      const admin = await createUser({ role: "admin" });
      const user = await createUser();
      const post = await createPost(user.id, { title: "Parent post" });
      const comment = await createComment(post.id, user.id);

      const list = await api.get("/api/v1/admin/comments").set(bearer(admin)).expect(200);
      expect(list.body.data[0]).toMatchObject({ post: { title: "Parent post" }, author: { name: user.name } });

      await api.delete(`/api/v1/admin/comments/${comment.id}`).set(bearer(admin)).expect(200);
      await api.delete(`/api/v1/admin/comments/${comment.id}`).set(bearer(admin)).expect(404);
    });
  });
});
