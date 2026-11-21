import { Navigate, Outlet, useLocation, type Location } from "react-router";
import { useAuth } from "../../hooks/useAuth";
import { Spinner } from "../ui/Spinner";

// Login / register pages. Once the user is authenticated (including right after a successful
// login on this page) they are sent to the page they originally wanted, or home.
export function GuestRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") return <Spinner fullPage />;

  if (status === "authenticated") {
    const from = (location.state as { from?: Location } | null)?.from;
    return <Navigate to={from ? `${from.pathname}${from.search}` : "/"} replace />;
  }

  return <Outlet />;
}
