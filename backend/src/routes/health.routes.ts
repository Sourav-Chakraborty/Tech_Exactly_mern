import { Router } from "express";
import mongoose from "mongoose";
import { sendSuccess } from "../utils/ApiResponse";

const router = Router();

router.get("/", (_req, res) => {
  sendSuccess(res, {
    data: {
      status: "ok",
      db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
      uptime: process.uptime(),
    },
  });
});

export default router;
