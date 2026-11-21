import type { ReactNode } from "react";
import { Link } from "react-router";
import type { Post } from "../../types";
import { excerpt, formatDate } from "../../utils/format";

export function PostCard({ post, actions }: { post: Post; actions?: ReactNode }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold">
        <Link to={`/posts/${post.slug}`} className="hover:text-indigo-600">
          {post.title}
        </Link>
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        By {post.author?.name ?? "Unknown"} · {formatDate(post.createdAt)}
      </p>
      <p className="mt-3 text-sm text-slate-700">{excerpt(post.content)}</p>
      <div className="mt-4 flex items-center gap-4">
        <Link to={`/posts/${post.slug}`} className="text-sm font-medium text-indigo-600 hover:underline">
          Read more →
        </Link>
        {actions && <div className="ml-auto flex gap-2">{actions}</div>}
      </div>
    </article>
  );
}
