import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { authApi } from "../api/auth";
import { setSessionExpiredHandler } from "../api/client";
import { AuthContext, type AuthContextValue, type AuthStatus } from "./authContext";
import type { LoginInput, RegisterInput, User } from "../types";

// Global authentication state for the whole app.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const signIn = useCallback((u: User) => {
    setUser(u);
    setStatus("authenticated");
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  // On load: restore the session from the httpOnly refresh cookie, if there is one.
  // This also completes social login, which lands on /oauth/callback with only the cookie set.
  useEffect(() => {
    authApi.restore().then(signIn, signOut);
  }, [signIn, signOut]);

  // If a refresh fails mid-session (expired, revoked, account deactivated), log out locally.
  useEffect(() => {
    setSessionExpiredHandler(signOut);
    return () => setSessionExpiredHandler(null);
  }, [signOut]);

  const login = useCallback(
    async (input: LoginInput) => signIn(await authApi.login(input)),
    [signIn],
  );

  const register = useCallback(
    async (input: RegisterInput) => signIn(await authApi.register(input)),
    [signIn],
  );

  const logout = useCallback(async () => {
    await authApi.logout().finally(signOut);
  }, [signOut]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, isAdmin: user?.role === "admin", login, register, logout }),
    [user, status, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
