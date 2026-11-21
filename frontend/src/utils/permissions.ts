import type { User } from "../types";

// Mirrors the API's ownership rule (owner or admin) so the UI only shows actions that will succeed.
// The API still enforces it on every request.
export const canModify = (user: User | null, authorId: string | undefined) =>
  Boolean(user && (user.role === "admin" || user._id === authorId));
