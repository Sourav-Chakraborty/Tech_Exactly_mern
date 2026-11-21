import { Types } from "mongoose";
import * as commentService from "../../../src/services/comment.service";
import { Comment } from "../../../src/models/comment.model";
import { createComment, createPost, createUser } from "../../helpers";

const fakeId = () => new Types.ObjectId().toString();

describe("comment.service", () => {
  it("creates a comment on an active post and populates only the author's name", async () => {
    const author = await createUser({ name: "Bob" });
    const post = await createPost(author.id);

    const comment = await commentService.createComment(post.id, author.id, { content: "Nice" });
    const json = JSON.parse(JSON.stringify(comment));
    expect(json).toMatchObject({ content: "Nice", post: post.id, author: { _id: author.id, name: "Bob" } });
  });

  it("refuses to comment on a missing or soft-deleted post", async () => {
    const user = await createUser();
    const deleted = await createPost(user.id, { isDeleted: true });
    await expect(commentService.createComment(fakeId(), user.id, { content: "x" })).rejects.toMatchObject({
      statusCode: 404,
    });
    await expect(commentService.createComment(deleted.id, user.id, { content: "x" })).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("lists a post's comments newest first with pagination", async () => {
    const user = await createUser();
    const post = await createPost(user.id);
    const other = await createPost(user.id);
    for (let i = 1; i <= 3; i++) await createComment(post.id, user.id, `c${i}`);
    await createComment(other.id, user.id, "elsewhere");

    const { comments, meta } = await commentService.listComments(post.id, 1, 2);
    expect(meta).toEqual({ page: 1, limit: 2, total: 3, totalPages: 2 });
    expect(comments.map((c) => c.content)).toEqual(["c3", "c2"]);
  });

  it("hides comments of a soft-deleted post", async () => {
    const user = await createUser();
    const post = await createPost(user.id, { isDeleted: true });
    await createComment(post.id, user.id);
    await expect(commentService.listComments(post.id, 1, 10)).rejects.toMatchObject({ statusCode: 404 });
  });

  it("only finds a comment under its own post", async () => {
    const user = await createUser();
    const post = await createPost(user.id);
    const other = await createPost(user.id);
    const comment = await createComment(post.id, user.id);

    expect((await commentService.getComment(post.id, comment.id)).content).toBe("A comment");
    await expect(commentService.getComment(other.id, comment.id)).rejects.toMatchObject({ statusCode: 404 });
    expect(await commentService.findCommentOnActivePost(other.id, comment.id)).toBeNull();
  });

  it("returns null from the ownership loader when the post is soft-deleted", async () => {
    const user = await createUser();
    const post = await createPost(user.id, { isDeleted: true });
    const comment = await createComment(post.id, user.id);
    expect(await commentService.findCommentOnActivePost(post.id, comment.id)).toBeNull();
  });

  it("updates and hard-deletes a comment", async () => {
    const user = await createUser();
    const post = await createPost(user.id);
    const comment = await createComment(post.id, user.id);

    const updated = await commentService.updateComment(comment, { content: "Edited" });
    expect(updated.content).toBe("Edited");

    await commentService.deleteComment(comment);
    expect(await Comment.findById(comment.id)).toBeNull();
  });
});
