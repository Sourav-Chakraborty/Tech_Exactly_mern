import type { Role } from "../models/user.model";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      // Set by the authenticate middleware
      user?: AuthUser;
    }
  }
}
