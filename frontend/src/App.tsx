import { BrowserRouter, Route, Routes } from "react-router";
import { AuthProvider } from "./context/AuthProvider";
import { Layout } from "./components/layout/Layout";
import { GuestRoute } from "./components/routing/GuestRoute";
import { ProtectedRoute } from "./components/routing/ProtectedRoute";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { OAuthCallbackPage } from "./pages/OAuthCallbackPage";
import { CreatePostPage } from "./pages/CreatePostPage";
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { NotFoundPage } from "./pages/NotFoundPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            {/* Public */}
            <Route index element={<HomePage />} />
            <Route path="oauth/callback" element={<OAuthCallbackPage />} />

            {/* Logged-out only */}
            <Route element={<GuestRoute />}>
              <Route path="login" element={<LoginPage />} />
              <Route path="register" element={<RegisterPage />} />
            </Route>

            {/* Any logged-in user */}
            <Route element={<ProtectedRoute />}>
              <Route path="posts/new" element={<CreatePostPage />} />
            </Route>

            {/* Admins only */}
            <Route element={<ProtectedRoute role="admin" />}>
              <Route path="admin" element={<AdminDashboardPage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
