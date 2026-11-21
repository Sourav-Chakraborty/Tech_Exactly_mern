import express from "express";
import cors from "cors";
import { env } from "./config/env";
import healthRoutes from "./routes/health.routes";
import { errorHandler, notFound } from "./middleware/errorHandler";

const app = express();

app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/v1/health", healthRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
