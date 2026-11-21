import { useAuth } from "../hooks/useAuth";

// Placeholder: the paginated post list is built in Step 9.
export function HomePage() {
  const { user } = useAuth();
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">Latest posts</h1>
      <p className="text-slate-600">
        {user ? `Welcome back, ${user.name}.` : "Welcome! Log in to write posts and comment."}
      </p>
    </div>
  );
}
