import http from "node:http";
import app from "./app";
import { connectDB } from "./config/db";
import { env } from "./config/env";
import { initSocket } from "./socket";

const start = async () => {
  try {
    await connectDB();
    // One HTTP server for both the REST API (Express) and real-time notifications (Socket.io).
    const server = http.createServer(app);
    initSocket(server);
    server.listen(env.port, () => {
      console.log(`Server running on http://localhost:${env.port}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};

start();
