import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../../hooks/useAuth";
import { Spinner } from "../ui/Spinner";
import { ForbiddenPage } from "../../pages/ForbiddenPage";
import type { Role } from "../../types";

/**
 * Guards a group of routes.
 *   <Route element={<ProtectedRoute />}>              -> any logged-in user
 *   <Route element={<ProtectedRoute role="admin" />}> -> admins only
 *
 * This only controls what the UI shows; the API enforces the same rules on every request.
 */
export function ProtectedRoute({ role }: { role?: Role }) {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === "loading") return <Spinner fullPage />;

  if (!user) {
    // Remember where the user was going so login can send them back there.
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (role && user.role !== role) return <ForbiddenPage />;

  return <Outlet />;
}
