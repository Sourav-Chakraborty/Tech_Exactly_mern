import { Link } from "react-router";

export function NotFoundPage() {
  return (
    <div className="space-y-3 py-16 text-center">
      <p className="text-5xl font-bold text-slate-300">404</p>
      <h1 className="text-xl font-semibold">Page not found</h1>
      <Link to="/" className="text-sm font-medium text-indigo-600 hover:underline">
        Back to posts
      </Link>
    </div>
  );
}
