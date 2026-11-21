import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { env } from "../config/env";
import { User, type Role } from "../models/user.model";
import { verifyAccessToken } from "../utils/jwt";

export const userRoom = (userId: string) => `user:${userId}`;
export const ADMINS_ROOM = "admins";

interface SocketUser {
  id: string;
  name: string;
  role: Role;
}

let io: Server | null = null;

// Null until initSocket() runs (e.g. in tests that only use the Express app),
// so emitting is always optional and never breaks a request.
export const getIO = () => io;

/**
 * Real-time notifications over Socket.io.
 *
 * Authentication: the client sends its JWT access token in the handshake
 * (`io(url, { auth: { token } })`). The token is verified and the user re-read from the DB
 * (must exist and be active) before the connection is accepted. Each connection then joins
 *   - user:<id>  -> notifications addressed to that user
 *   - admins     -> notifications for all admins (admins only)
 */
export const initSocket = (httpServer: HttpServer) => {
  io = new Server(httpServer, {
    cors: { origin: env.clientUrl, credentials: true },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (typeof token !== "string" || !token) return next(new Error("Unauthorized"));

      const payload = verifyAccessToken(token);
      const user = await User.findById(payload.sub).select("name role isActive").lean();
      if (!user || !user.isActive) return next(new Error("Unauthorized"));

      socket.data.user = { id: String(user._id), name: user.name, role: user.role } satisfies SocketUser;
      next();
    } catch {
      // Expired/invalid token: the client refreshes its token and reconnects.
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.data.user as SocketUser;
    socket.join(userRoom(user.id));
    if (user.role === "admin") socket.join(ADMINS_ROOM);
  });

  return io;
};

export const closeSocket = async () => {
  await io?.close();
  io = null;
};
