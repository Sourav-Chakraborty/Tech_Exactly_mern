import { Navigate } from "react-router";
import { useAuth } from "../hooks/useAuth";
import { Spinner } from "../components/ui/Spinner";

// The API redirects here after a successful social login, with the refresh cookie set.
// AuthProvider's initial session restore exchanges that cookie for the user + access token;
// this page just waits for it and then moves on.
export function OAuthCallbackPage() {
  const { status } = useAuth();

  if (status === "loading") return <Spinner fullPage />;
  if (status === "authenticated") return <Navigate to="/" replace />;

  const error = encodeURIComponent("Social login could not be completed. Please try again.");
  return <Navigate to={`/login?error=${error}`} replace />;
}
