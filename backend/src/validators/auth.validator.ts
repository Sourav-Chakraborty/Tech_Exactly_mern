import { z } from "zod";

// Normalize first, then validate, so " Alice@Example.com " is accepted as "alice@example.com".
const email = z.string().trim().toLowerCase().pipe(z.email());

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(50),
  email,
  // bcrypt only uses the first 72 bytes
  password: z.string().min(8).max(72),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
