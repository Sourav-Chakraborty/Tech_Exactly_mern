import { Link } from "react-router";

export function ForbiddenPage() {
  return (
    <div className="space-y-3 py-16 text-center">
      <p className="text-5xl font-bold text-slate-300">403</p>
      <h1 className="text-xl font-semibold">You don't have access to this page</h1>
      <Link to="/" className="text-sm font-medium text-indigo-600 hover:underline">
        Back to posts
      </Link>
    </div>
  );
}
