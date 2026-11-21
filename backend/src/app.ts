import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import healthRoutes from "./routes/health.routes";
import authRoutes from "./routes/auth.routes";
import postRoutes from "./routes/post.routes";
import adminRoutes from "./routes/admin.routes";
import { errorHandler, notFound } from "./middleware/errorHandler";
import { requestLogger } from "./middleware/activityLogger";

const app = express();

if (env.nodeEnv !== "test") app.use(requestLogger);
app.use(helmet());
app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api/v1/health", healthRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/posts", postRoutes);
app.use("/api/v1/admin", adminRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
