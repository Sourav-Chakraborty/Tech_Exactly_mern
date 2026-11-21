import crypto from "node:crypto";
import { ADMINS_ROOM, getIO, userRoom } from "../socket";
import type { Role } from "../models/user.model";

export type NotificationType = "comment.created" | "post.created";

// Payload of the "notification" socket event.
export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  link: string; // frontend path to open, e.g. /posts/my-slug
  createdAt: string;
}

const build = (type: NotificationType, message: string, link: string): Notification => ({
  id: crypto.randomUUID(),
  type,
  message,
  link,
  createdAt: new Date().toISOString(),
});

/**
 * Pushes real-time notifications. Fire-and-forget: if sockets aren't running (tests, or a
 * worker without the socket server) nothing happens and the request is unaffected.
 */
export const notificationService = {
  // The post's author learns that someone else commented.
  commentCreated(opts: {
    postAuthorId: string;
    commenterId: string;
    commenterName: string;
    postTitle: string;
    postSlug: string;
  }) {
    if (opts.postAuthorId === opts.commenterId) return; // no notification for your own comment
    getIO()
      ?.to(userRoom(opts.postAuthorId))
      .emit(
        "notification",
        build("comment.created", `${opts.commenterName} commented on "${opts.postTitle}"`, `/posts/${opts.postSlug}`),
      );
  },

  // Every admin (except the author, if they're an admin) learns about a new post.
  postCreated(opts: { authorId: string; authorName: string; postTitle: string; postSlug: string }) {
    getIO()
      ?.to(ADMINS_ROOM)
      .except(userRoom(opts.authorId))
      .emit(
        "notification",
        build("post.created", `${opts.authorName} published "${opts.postTitle}"`, `/posts/${opts.postSlug}`),
      );
  },

  // ----- keep open connections in sync with admin actions -----

  // Deactivated or deleted users lose their live connection immediately.
  disconnectUser(userId: string) {
    getIO()?.in(userRoom(userId)).disconnectSockets(true);
  },

  // A role change takes effect on open connections without reconnecting.
  roleChanged(userId: string, role: Role) {
    const sockets = getIO()?.in(userRoom(userId));
    if (role === "admin") sockets?.socketsJoin(ADMINS_ROOM);
    else sockets?.socketsLeave(ADMINS_ROOM);
  },
};
