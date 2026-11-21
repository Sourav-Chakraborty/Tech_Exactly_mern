import http from "node:http";
import type { AddressInfo } from "node:net";
import request from "supertest";
import { io as connectClient, type Socket } from "socket.io-client";
import app from "../../src/app";
import { closeSocket, initSocket } from "../../src/socket";
import { bearer, createPost, createUser, tokenFor } from "../helpers";
import type { Notification } from "../../src/services/notification.service";

// Real HTTP server with Socket.io attached, on a random free port.
let server: http.Server;
let url: string;
const clients: Socket[] = [];

beforeAll(async () => {
  server = http.createServer(app);
  initSocket(server);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  url = `http://localhost:${(server.address() as AddressInfo).port}`;
});

afterEach(() => {
  clients.splice(0).forEach((c) => c.disconnect());
});

afterAll(async () => {
  await closeSocket();
  await new Promise((resolve) => server.close(resolve));
});

// Connects and resolves once the server accepted (or rejected) the handshake.
const connect = (token?: string) =>
  new Promise<Socket>((resolve, reject) => {
    const socket = connectClient(url, {
      auth: token ? { token } : {},
      transports: ["websocket"],
      reconnection: false,
    });
    clients.push(socket);
    socket.once("connect", () => resolve(socket));
    socket.once("connect_error", (err) => reject(err));
  });

// Collects every notification a socket receives.
const inbox = (socket: Socket) => {
  const received: Notification[] = [];
  socket.on("notification", (n: Notification) => received.push(n));
  return received;
};

const settle = () => new Promise((r) => setTimeout(r, 150));

describe("Socket.io authentication", () => {
  it("rejects a connection without a token", async () => {
    await expect(connect()).rejects.toThrow("Unauthorized");
  });

  it("rejects an invalid token", async () => {
    await expect(connect("not.a.jwt")).rejects.toThrow("Unauthorized");
  });

  it("rejects a deactivated user", async () => {
    const user = await createUser({ isActive: false });
    await expect(connect(tokenFor(user))).rejects.toThrow("Unauthorized");
  });

  it("accepts a valid access token", async () => {
    const user = await createUser();
    const socket = await connect(tokenFor(user));
    expect(socket.connected).toBe(true);
  });
});

describe("notifications", () => {
  it("notifies a post's author when someone else comments", async () => {
    const author = await createUser({ name: "Alice" });
    const commenter = await createUser({ name: "Bob" });
    const post = await createPost(author.id, { title: "My first post" });
    const authorInbox = inbox(await connect(tokenFor(author)));
    const commenterInbox = inbox(await connect(tokenFor(commenter)));

    await request(app)
      .post(`/api/v1/posts/${post.id}/comments`)
      .set(bearer(commenter))
      .send({ content: "Nice!" })
      .expect(201);
    await settle();

    expect(authorInbox).toEqual([
      expect.objectContaining({
        type: "comment.created",
        message: 'Bob commented on "My first post"',
        link: `/posts/${post.slug}`,
      }),
    ]);
    expect(commenterInbox).toEqual([]);
  });

  it("does not notify authors about their own comments", async () => {
    const author = await createUser();
    const post = await createPost(author.id);
    const authorInbox = inbox(await connect(tokenFor(author)));

    await request(app).post(`/api/v1/posts/${post.id}/comments`).set(bearer(author)).send({ content: "Me" });
    await settle();
    expect(authorInbox).toEqual([]);
  });

  it("notifies every admin about a new post, but not regular users or the author", async () => {
    const adminA = await createUser({ role: "admin" });
    const adminB = await createUser({ role: "admin" });
    const reader = await createUser();
    const writer = await createUser({ name: "Writer" });
    const inboxA = inbox(await connect(tokenFor(adminA)));
    const inboxB = inbox(await connect(tokenFor(adminB)));
    const readerInbox = inbox(await connect(tokenFor(reader)));

    const res = await request(app)
      .post("/api/v1/posts")
      .set(bearer(writer))
      .send({ title: "Fresh post", content: "<p>Hello</p>" })
      .expect(201);
    await settle();

    const expected = expect.objectContaining({
      type: "post.created",
      message: 'Writer published "Fresh post"',
      link: `/posts/${res.body.data.slug}`,
    });
    expect(inboxA).toEqual([expected]);
    expect(inboxB).toEqual([expected]);
    expect(readerInbox).toEqual([]);

    // An admin who writes a post is not notified about it.
    await request(app).post("/api/v1/posts").set(bearer(adminA)).send({ title: "Admin post", content: "<p>x</p>" });
    await settle();
    expect(inboxA).toHaveLength(1);
    expect(inboxB).toHaveLength(2);
  });
});

describe("live connections follow admin actions", () => {
  it("disconnects a user as soon as they are deactivated", async () => {
    const admin = await createUser({ role: "admin" });
    const user = await createUser();
    const socket = await connect(tokenFor(user));
    const disconnected = new Promise((resolve) => socket.once("disconnect", resolve));

    await request(app).patch(`/api/v1/admin/users/${user.id}/status`).set(bearer(admin)).send({ isActive: false }).expect(200);

    await expect(disconnected).resolves.toBe("io server disconnect");
  });

  it("adds a promoted user to the admin channel without reconnecting", async () => {
    const admin = await createUser({ role: "admin" });
    const promoted = await createUser();
    const promotedInbox = inbox(await connect(tokenFor(promoted)));

    await request(app).patch(`/api/v1/admin/users/${promoted.id}/role`).set(bearer(admin)).send({ role: "admin" }).expect(200);
    await request(app).post("/api/v1/posts").set(bearer(await createUser())).send({ title: "After promotion", content: "<p>x</p>" });
    await settle();

    expect(promotedInbox.map((n) => n.type)).toEqual(["post.created"]);
  });
});
