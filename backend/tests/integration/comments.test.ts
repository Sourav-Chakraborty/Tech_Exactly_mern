import request from "supertest";
import { Types } from "mongoose";
import app from "../../src/app";
import { Comment } from "../../src/models/comment.model";
import { bearer, createComment, createPost, createUser } from "../helpers";

const api = request(app);
const base = (postId: string) => `/api/v1/posts/${postId}/comments`;

describe("Comments API /api/v1/posts/:postId/comments", () => {
  it("lists a post's comments publicly with pagination", async () => {
    const user = await createUser({ name: "Bob" });
    const post = await createPost(user.id);
    for (let i = 1; i <= 3; i++) await createComment(post.id, user.id, `c${i}`);

    const res = await api.get(`${base(post.id)}?limit=2`).expect(200);
    expect(res.body.meta).toEqual({ page: 1, limit: 2, total: 3, totalPages: 2 });
    expect(res.body.data.map((c: { content: string }) => c.content)).toEqual(["c3", "c2"]);
    expect(res.body.data[0].author).toEqual({ _id: user.id, name: "Bob" });
  });

  it("gets a single comment, only under its own post", async () => {
    const user = await createUser();
    const post = await createPost(user.id);
    const other = await createPost(user.id);
    const comment = await createComment(post.id, user.id, "hello");

    expect((await api.get(`${base(post.id)}/${comment.id}`).expect(200)).body.data.content).toBe("hello");
    await api.get(`${base(other.id)}/${comment.id}`).expect(404);
  });

  it("requires authentication to comment", async () => {
    const post = await createPost((await createUser()).id);
    await api.post(base(post.id)).send({ content: "hi" }).expect(401);
  });

  it("creates a comment as the caller", async () => {
    const author = await createUser();
    const commenter = await createUser();
    const post = await createPost(author.id);

    const res = await api.post(base(post.id)).set(bearer(commenter)).send({ content: "Great post" }).expect(201);
    expect(res.body.data).toMatchObject({ content: "Great post", post: post.id, author: { _id: commenter.id } });
  });

  it("validates the post id and the content", async () => {
    const user = await createUser();
    const post = await createPost(user.id);
    await api.post(base("abc")).set(bearer(user)).send({ content: "x" }).expect(400);
    await api.post(base(post.id)).set(bearer(user)).send({ content: "   " }).expect(400);
    await api.post(base(new Types.ObjectId().toString())).set(bearer(user)).send({ content: "x" }).expect(404);
  });

  describe("ownership rules", () => {
    const setup = async () => {
      const owner = await createUser();
      const other = await createUser();
      const admin = await createUser({ role: "admin" });
      const post = await createPost((await createUser()).id);
      const comment = await createComment(post.id, owner.id);
      return { owner, other, admin, post, comment, url: `${base(post.id)}/${comment.id}` };
    };

    it("lets the owner edit and delete", async () => {
      const { owner, comment, url } = await setup();
      await api.patch(url).set(bearer(owner)).send({ content: "edited" }).expect(200);
      await api.delete(url).set(bearer(owner)).expect(200);
      expect(await Comment.findById(comment.id)).toBeNull();
    });

    it("forbids another regular user from editing or deleting (403)", async () => {
      const { other, url } = await setup();
      await api.patch(url).set(bearer(other)).send({ content: "hacked" }).expect(403);
      await api.delete(url).set(bearer(other)).expect(403);
    });

    it("lets an admin edit and delete any comment", async () => {
      const { admin, url } = await setup();
      const res = await api.patch(url).set(bearer(admin)).send({ content: "moderated" }).expect(200);
      expect(res.body.data.content).toBe("moderated");
      await api.delete(url).set(bearer(admin)).expect(200);
    });
  });

  it("hides and locks comments once the post is soft-deleted", async () => {
    const owner = await createUser();
    const post = await createPost(owner.id);
    const comment = await createComment(post.id, owner.id);
    await api.delete(`/api/v1/posts/${post.id}`).set(bearer(owner)).expect(200);

    await api.get(base(post.id)).expect(404);
    await api.post(base(post.id)).set(bearer(owner)).send({ content: "x" }).expect(404);
    await api.patch(`${base(post.id)}/${comment.id}`).set(bearer(owner)).send({ content: "x" }).expect(404);
  });
});
