import * as adminService from "../../../src/services/admin.service";
import * as authService from "../../../src/services/auth.service";
import { User } from "../../../src/models/user.model";
import { Post } from "../../../src/models/post.model";
import { Comment } from "../../../src/models/comment.model";
import { ActivityLog } from "../../../src/models/activityLog.model";
import { PASSWORD, createComment, createPost, createUser } from "../../helpers";

describe("admin.service", () => {
  describe("getStats", () => {
    it("counts users, active/deleted posts and comments, with recent activity", async () => {
      const user = await createUser();
      const post = await createPost(user.id);
      await createPost(user.id, { isDeleted: true });
      await createComment(post.id, user.id);
      await createComment(post.id, user.id);
      for (let i = 0; i < 12; i++) await ActivityLog.create({ user: user.id, action: "auth.login" });

      const stats = await adminService.getStats();

      expect(stats).toMatchObject({ totalUsers: 1, totalPosts: 1, deletedPosts: 1, totalComments: 2 });
      expect(stats.recentActivity).toHaveLength(10);
      expect(stats.recentActivity[0].user).toMatchObject({ name: user.name, email: user.email });
    });
  });

  describe("listUsers", () => {
    it("paginates, filters by role and searches name/email case-insensitively", async () => {
      await createUser({ name: "Alice Admin", role: "admin" });
      await createUser({ name: "Bob" });
      await createUser({ name: "Carol" });

      expect((await adminService.listUsers({ page: 1, limit: 2 })).meta).toMatchObject({ total: 3, totalPages: 2 });
      expect((await adminService.listUsers({ page: 1, limit: 10, role: "admin" })).users).toHaveLength(1);
      expect((await adminService.listUsers({ page: 1, limit: 10, search: "aLiCe" })).users[0].name).toBe("Alice Admin");
    });

    it("treats regex characters in the search literally", async () => {
      await createUser();
      expect((await adminService.listUsers({ page: 1, limit: 10, search: ".*" })).meta.total).toBe(0);
    });

    it("never returns password or refresh tokens", async () => {
      await createUser();
      const { users } = await adminService.listUsers({ page: 1, limit: 10 });
      expect(users[0]).not.toHaveProperty("password");
      expect(users[0]).not.toHaveProperty("refreshTokens");
    });
  });

  describe("user management", () => {
    it("changes a user's role", async () => {
      const admin = await createUser({ role: "admin" });
      const user = await createUser();
      const updated = await adminService.updateUserRole(admin.id, user.id, "admin");
      expect(updated.role).toBe("admin");
    });

    it("prevents admins from changing their own role, status or deleting themselves", async () => {
      const admin = await createUser({ role: "admin" });
      await expect(adminService.updateUserRole(admin.id, admin.id, "user")).rejects.toMatchObject({ statusCode: 400 });
      await expect(adminService.updateUserStatus(admin.id, admin.id, false)).rejects.toMatchObject({ statusCode: 400 });
      await expect(adminService.deleteUser(admin.id, admin.id)).rejects.toMatchObject({ statusCode: 400 });
    });

    it("deactivating a user also revokes all their sessions", async () => {
      const admin = await createUser({ role: "admin" });
      const user = await createUser();
      const { refreshToken } = await authService.login({ email: user.email, password: PASSWORD });

      await adminService.updateUserStatus(admin.id, user.id, false);

      const stored = await User.findById(user.id).select("+refreshTokens");
      expect(stored).toMatchObject({ isActive: false });
      expect(stored!.refreshTokens).toEqual([]);
      await expect(authService.refresh(refreshToken)).rejects.toMatchObject({ statusCode: 401 });
    });

    it("returns 404 for an unknown user", async () => {
      const admin = await createUser({ role: "admin" });
      const ghost = (await createUser()).id;
      await User.deleteOne({ _id: ghost });
      await expect(adminService.updateUserRole(admin.id, ghost, "admin")).rejects.toMatchObject({ statusCode: 404 });
    });

    it("deleting a user removes their comments and soft-deletes their posts", async () => {
      const admin = await createUser({ role: "admin" });
      const user = await createUser();
      const other = await createUser();
      const post = await createPost(user.id);
      const otherPost = await createPost(other.id);
      await createComment(otherPost.id, user.id);
      await createComment(post.id, other.id);

      await adminService.deleteUser(admin.id, user.id);

      expect(await User.findById(user.id)).toBeNull();
      expect(await Comment.countDocuments({ author: user.id })).toBe(0);
      expect(await Post.findById(post.id).lean()).toMatchObject({ isDeleted: true });
      expect(await Post.findById(otherPost.id).lean()).toMatchObject({ isDeleted: false });
    });
  });

  describe("post management", () => {
    it("lists posts by status, including soft-deleted ones", async () => {
      const user = await createUser();
      await createPost(user.id);
      await createPost(user.id, { isDeleted: true });

      const all = await adminService.listPosts({ page: 1, limit: 10, status: "all" });
      const deleted = await adminService.listPosts({ page: 1, limit: 10, status: "deleted" });
      const active = await adminService.listPosts({ page: 1, limit: 10, status: "active" });

      expect(all.meta.total).toBe(2);
      expect(deleted.posts).toHaveLength(1);
      expect(deleted.posts[0]).toMatchObject({ isDeleted: true });
      expect(active.posts).toHaveLength(1);
    });

    it("restores a soft-deleted post, and 404s for a post that isn't deleted", async () => {
      const post = await createPost((await createUser()).id, { isDeleted: true });
      const restored = await adminService.restorePost(post.id);
      expect(restored).toMatchObject({ isDeleted: false, deletedAt: null });
      await expect(adminService.restorePost(post.id)).rejects.toMatchObject({ statusCode: 404 });
    });

    it("purges a post and its comments permanently", async () => {
      const user = await createUser();
      const post = await createPost(user.id);
      await createComment(post.id, user.id);

      await adminService.purgePost(post.id);

      expect(await Post.findById(post.id)).toBeNull();
      expect(await Comment.countDocuments({ post: post.id })).toBe(0);
    });
  });

  describe("comment management", () => {
    it("lists all comments with author and post info, and deletes any comment", async () => {
      const user = await createUser();
      const post = await createPost(user.id, { title: "Parent" });
      const comment = await createComment(post.id, user.id);

      const { comments } = await adminService.listComments(1, 10);
      expect(comments[0].post).toMatchObject({ title: "Parent" });
      expect(comments[0].author).toMatchObject({ name: user.name });

      await adminService.deleteComment(comment.id);
      expect(await Comment.countDocuments()).toBe(0);
      await expect(adminService.deleteComment(comment.id)).rejects.toMatchObject({ statusCode: 404 });
    });
  });
});
