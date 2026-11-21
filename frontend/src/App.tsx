import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router";
import { AuthProvider } from "./context/AuthProvider";
import { ConfirmProvider } from "./context/ConfirmProvider";
import { Layout } from "./components/layout/Layout";
import { GuestRoute } from "./components/routing/GuestRoute";
import { ProtectedRoute } from "./components/routing/ProtectedRoute";
import { Spinner } from "./components/ui/Spinner";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { OAuthCallbackPage } from "./pages/OAuthCallbackPage";
import { PostDetailPage } from "./pages/PostDetailPage";
import { MyPostsPage } from "./pages/MyPostsPage";
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { NotFoundPage } from "./pages/NotFoundPage";

// The rich-text editor is large; load it only when someone opens the create/edit pages.
const CreatePostPage = lazy(() => import("./pages/CreatePostPage").then((m) => ({ default: m.CreatePostPage })));
const EditPostPage = lazy(() => import("./pages/EditPostPage").then((m) => ({ default: m.EditPostPage })));

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ConfirmProvider>
          <Suspense fallback={<Spinner fullPage />}>
            <Routes>
              <Route element={<Layout />}>
                {/* Public */}
                <Route index element={<HomePage />} />
                <Route path="posts/:slug" element={<PostDetailPage />} />
                <Route path="oauth/callback" element={<OAuthCallbackPage />} />

                {/* Logged-out only */}
                <Route element={<GuestRoute />}>
                  <Route path="login" element={<LoginPage />} />
                  <Route path="register" element={<RegisterPage />} />
                </Route>

                {/* Any logged-in user */}
                <Route element={<ProtectedRoute />}>
                  <Route path="posts/new" element={<CreatePostPage />} />
                  <Route path="posts/:id/edit" element={<EditPostPage />} />
                  <Route path="my-posts" element={<MyPostsPage />} />
                </Route>

                {/* Admins only */}
                <Route element={<ProtectedRoute role="admin" />}>
                  <Route path="admin" element={<AdminDashboardPage />} />
                </Route>

                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </Suspense>
        </ConfirmProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
