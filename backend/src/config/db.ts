import mongoose from "mongoose";
import { env } from "./env";

export const connectDB = async (): Promise<void> => {
  const conn = await mongoose.connect(env.mongodbUrl);
  console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
};
