import * as postService from "../../../src/services/post.service";
import { Post } from "../../../src/models/post.model";
import { createPost, createUser } from "../../helpers";

describe("post.service", () => {
  describe("createPost", () => {
    it("generates a slug from the title and populates only the author's name", async () => {
      const author = await createUser({ name: "Alice" });
      const post = await postService.createPost(author.id, { title: "Hello World!", content: "Body" });

      expect(post.slug).toBe("hello-world");
      const json = JSON.parse(JSON.stringify(post));
      expect(json.author).toEqual({ _id: author.id, name: "Alice" });
    });

    it("adds a random suffix when the slug is already taken (even by a deleted post)", async () => {
      const author = await createUser();
      const first = await postService.createPost(author.id, { title: "Same Title", content: "a" });
      await postService.deletePost(first);

      const second = await postService.createPost(author.id, { title: "Same Title", content: "b" });
      expect(second.slug).toMatch(/^same-title-[0-9a-f]{6}$/);
    });
  });

  describe("listPosts", () => {
    it("paginates non-deleted posts newest first", async () => {
      const author = await createUser();
      // Created back-to-back, several share the same createdAt millisecond: the _id tiebreaker
      // must still give a stable order with no duplicates or gaps across pages.
      for (let i = 1; i <= 5; i++) await createPost(author.id, { title: `Post ${i}` });
      await createPost(author.id, { title: "Deleted", isDeleted: true });

      const pages = await Promise.all([1, 2, 3].map((page) => postService.listPosts({ page, limit: 2 })));

      expect(pages[0].meta).toEqual({ page: 1, limit: 2, total: 5, totalPages: 3 });
      expect(pages.flatMap((p) => p.posts.map((x) => x.title))).toEqual([
        "Post 5",
        "Post 4",
        "Post 3",
        "Post 2",
        "Post 1",
      ]);
    });

    it("filters by author and hides the soft-delete fields", async () => {
      const alice = await createUser();
      const bob = await createUser();
      await createPost(alice.id);
      await createPost(bob.id);

      const { posts, meta } = await postService.listPosts({ page: 1, limit: 10, author: bob.id });
      expect(meta.total).toBe(1);
      expect(String((posts[0].author as unknown as { _id: string })._id)).toBe(bob.id);
      expect(posts[0]).not.toHaveProperty("isDeleted");
      expect(posts[0]).not.toHaveProperty("deletedAt");
    });
  });

  describe("getPost", () => {
    it("finds a post by id or by slug", async () => {
      const post = await createPost((await createUser()).id, { title: "Find me" });
      expect((await postService.getPost(post.id)).title).toBe("Find me");
      expect((await postService.getPost(post.slug)).title).toBe("Find me");
    });

    it("treats a 12-character slug as a slug, not an ObjectId", async () => {
      const author = await createUser();
      const post = await postService.createPost(author.id, { title: "my new post1", content: "x" });
      expect(post.slug).toHaveLength(12);
      expect((await postService.getPost(post.slug)).title).toBe("my new post1");
    });

    it("returns 404 for unknown and soft-deleted posts", async () => {
      const deleted = await createPost((await createUser()).id, { isDeleted: true });
      await expect(postService.getPost("nope")).rejects.toMatchObject({ statusCode: 404 });
      await expect(postService.getPost(deleted.id)).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe("updatePost", () => {
    it("regenerates the slug when the title changes", async () => {
      const post = await createPost((await createUser()).id, { title: "Old" });
      const updated = await postService.updatePost(post, { title: "Brand New Title" });
      expect(updated.slug).toBe("brand-new-title");
    });

    it("keeps the slug when only the content changes", async () => {
      const post = await createPost((await createUser()).id);
      const slug = post.slug;
      const updated = await postService.updatePost(post, { content: "Changed" });
      expect(updated.slug).toBe(slug);
      expect(updated.content).toBe("Changed");
    });
  });

  describe("deletePost", () => {
    it("soft-deletes: the document stays with isDeleted and deletedAt set", async () => {
      const post = await createPost((await createUser()).id);
      await postService.deletePost(post);

      const raw = await Post.findById(post.id).lean();
      expect(raw).toMatchObject({ isDeleted: true, deletedAt: expect.any(Date) });
      expect(await postService.findActivePostById(post.id)).toBeNull();
    });
  });

  it("serves the public feed from the { isDeleted, createdAt, _id } index without an in-memory sort", async () => {
    const plan = await Post.find({ isDeleted: false })
      .sort({ createdAt: -1, _id: -1 })
      .limit(10)
      .explain();
    const winning = JSON.stringify(plan);
    expect(winning).toContain("isDeleted_1_createdAt_-1__id_-1");
    expect(winning).not.toContain('"stage":"SORT"');
  });
});
