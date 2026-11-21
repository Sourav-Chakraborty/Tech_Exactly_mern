import type { Role } from "../models/user.model";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

declare global {
  namespace Express {
    // req.user is declared by @types/passport as `user?: Express.User`.
    // Extending that interface gives req.user our shape (set by the authenticate middleware).
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface User extends AuthUser {}
  }
}
