import "dotenv/config";
import { z } from "zod";

// Optional credential: an empty value in .env counts as "not configured".
const optional = z
  .string()
  .optional()
  .transform((v) => v || undefined);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGODB_URL: z.string().min(1),
  CLIENT_URL: z.url().default("http://localhost:5173"),
  JWT_ACCESS_SECRET: z.string().min(32, "must be at least 32 characters"),
  JWT_REFRESH_SECRET: z.string().min(32, "must be at least 32 characters"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  // bcrypt cost factor; tests lower it to keep the suite fast
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
  // Public URL of this API, used to build OAuth callback URLs
  SERVER_URL: z.url().default("http://localhost:5000"),
  GOOGLE_CLIENT_ID: optional,
  GOOGLE_CLIENT_SECRET: optional,
  FACEBOOK_APP_ID: optional,
  FACEBOOK_APP_SECRET: optional,
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`);
  throw new Error(`Invalid environment variables:\n${issues.join("\n")}`);
}

const e = parsed.data;

export const env = {
  nodeEnv: e.NODE_ENV,
  isProd: e.NODE_ENV === "production",
  port: e.PORT,
  mongodbUrl: e.MONGODB_URL,
  clientUrl: e.CLIENT_URL,
  jwt: {
    accessSecret: e.JWT_ACCESS_SECRET,
    refreshSecret: e.JWT_REFRESH_SECRET,
    accessExpiresIn: e.JWT_ACCESS_EXPIRES_IN,
    refreshExpiresIn: e.JWT_REFRESH_EXPIRES_IN,
  },
  bcryptSaltRounds: e.BCRYPT_SALT_ROUNDS,
  serverUrl: e.SERVER_URL,
  oauth: {
    google:
      e.GOOGLE_CLIENT_ID && e.GOOGLE_CLIENT_SECRET
        ? { clientId: e.GOOGLE_CLIENT_ID, clientSecret: e.GOOGLE_CLIENT_SECRET }
        : undefined,
    facebook:
      e.FACEBOOK_APP_ID && e.FACEBOOK_APP_SECRET
        ? { clientId: e.FACEBOOK_APP_ID, clientSecret: e.FACEBOOK_APP_SECRET }
        : undefined,
  },
};
