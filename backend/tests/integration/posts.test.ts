import request from "supertest";
import { Types } from "mongoose";
import app from "../../src/app";
import { Post } from "../../src/models/post.model";
import { ActivityLog } from "../../src/models/activityLog.model";
import { bearer, createPost, createUser } from "../helpers";

const api = request(app);
const flushLogs = () => new Promise((r) => setTimeout(r, 50));

describe("Posts API /api/v1/posts", () => {
  describe("public reads", () => {
    it("lists posts with pagination meta and the author's name only", async () => {
      const author = await createUser({ name: "Alice" });
      for (let i = 0; i < 3; i++) await createPost(author.id);

      const res = await api.get("/api/v1/posts?limit=2").expect(200);
      expect(res.body.meta).toEqual({ page: 1, limit: 2, total: 3, totalPages: 2 });
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].author).toEqual({ _id: author.id, name: "Alice" });
    });

    it("validates pagination query params", async () => {
      await api.get("/api/v1/posts?limit=500").expect(400);
      await api.get("/api/v1/posts?page=0").expect(400);
      await api.get("/api/v1/posts?author=not-an-id").expect(400);
    });

    it("gets a post by slug or id and 404s for deleted posts", async () => {
      const author = await createUser();
      const post = await createPost(author.id, { title: "By Slug" });
      const deleted = await createPost(author.id, { isDeleted: true });

      expect((await api.get(`/api/v1/posts/${post.slug}`).expect(200)).body.data.title).toBe("By Slug");
      expect((await api.get(`/api/v1/posts/${post.id}`).expect(200)).body.data.title).toBe("By Slug");
      await api.get(`/api/v1/posts/${deleted.id}`).expect(404);
    });
  });

  describe("POST /posts", () => {
    it("requires authentication", async () => {
      await api.post("/api/v1/posts").send({ title: "Title", content: "Body" }).expect(401);
    });

    it("creates a post owned by the caller with a slug, and logs post.create", async () => {
      const user = await createUser();
      const res = await api
        .post("/api/v1/posts")
        .set(bearer(user))
        .send({ title: "My First Post", content: "Body", author: new Types.ObjectId() })
        .expect(201);

      expect(res.body.data).toMatchObject({ title: "My First Post", slug: "my-first-post" });
      expect(res.body.data.author._id).toBe(user.id); // client-supplied author is ignored
      await flushLogs();
      expect(await ActivityLog.findOne({ action: "post.create" }).lean()).toMatchObject({
        resourceId: new Types.ObjectId(res.body.data._id as string),
      });
    });

    it("returns 400 for an invalid body", async () => {
      const user = await createUser();
      await api.post("/api/v1/posts").set(bearer(user)).send({ title: "ab" }).expect(400);
    });
  });

  describe("PATCH /posts/:id — ownership", () => {
    it("lets the owner edit", async () => {
      const owner = await createUser();
      const post = await createPost(owner.id);
      const res = await api
        .patch(`/api/v1/posts/${post.id}`)
        .set(bearer(owner))
        .send({ title: "Renamed Post" })
        .expect(200);
      expect(res.body.data).toMatchObject({ title: "Renamed Post", slug: "renamed-post" });
    });

    it("forbids another regular user (403) and leaves the post unchanged", async () => {
      const owner = await createUser();
      const other = await createUser();
      const post = await createPost(owner.id);
      await api.patch(`/api/v1/posts/${post.id}`).set(bearer(other)).send({ content: "hacked" }).expect(403);
      expect((await Post.findById(post.id))!.content).toBe("Some content");
    });

    it("lets an admin edit anyone's post", async () => {
      const admin = await createUser({ role: "admin" });
      const post = await createPost((await createUser()).id);
      await api.patch(`/api/v1/posts/${post.id}`).set(bearer(admin)).send({ content: "by admin" }).expect(200);
    });

    it("returns 400 for an invalid id or empty update, 404 for a missing post", async () => {
      const owner = await createUser();
      const post = await createPost(owner.id);
      await api.patch("/api/v1/posts/123").set(bearer(owner)).send({ content: "x" }).expect(400);
      await api.patch(`/api/v1/posts/${post.id}`).set(bearer(owner)).send({}).expect(400);
      await api
        .patch(`/api/v1/posts/${new Types.ObjectId()}`)
        .set(bearer(owner))
        .send({ content: "x" })
        .expect(404);
    });
  });

  describe("DELETE /posts/:id — soft delete", () => {
    it("lets the owner soft-delete; the post disappears from the API but stays in the DB", async () => {
      const owner = await createUser();
      const post = await createPost(owner.id);

      await api.delete(`/api/v1/posts/${post.id}`).set(bearer(owner)).expect(200);

      await api.get(`/api/v1/posts/${post.id}`).expect(404);
      expect((await api.get("/api/v1/posts").expect(200)).body.meta.total).toBe(0);
      expect(await Post.findById(post.id).lean()).toMatchObject({ isDeleted: true });
      await api.delete(`/api/v1/posts/${post.id}`).set(bearer(owner)).expect(404);
    });

    it("forbids another user, allows an admin", async () => {
      const post = await createPost((await createUser()).id);
      await api.delete(`/api/v1/posts/${post.id}`).set(bearer(await createUser())).expect(403);
      await api.delete(`/api/v1/posts/${post.id}`).set(bearer(await createUser({ role: "admin" }))).expect(200);
    });
  });
});
