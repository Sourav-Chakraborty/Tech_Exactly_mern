import { useState } from "react";
import { Link } from "react-router";
import { postsApi } from "../../api/posts";
import { useConfirm } from "../../hooks/useConfirm";
import type { Post } from "../../types";
import { parseApiError } from "../../utils/apiError";

// Edit / Delete controls. Only render this when canModify(user, post.author._id) is true.
export function PostActions({ post, onDeleted }: { post: Post; onDeleted(): void }) {
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const remove = async () => {
    const ok = await confirm({
      title: "Delete this post?",
      message: `"${post.title}" and its comments will no longer be visible.`,
      confirmLabel: "Delete post",
      danger: true,
    });
    if (!ok) return;

    setBusy(true);
    setError(undefined);
    try {
      await postsApi.remove(post._id);
      onDeleted();
    } catch (err) {
      setError(parseApiError(err).message);
      setBusy(false);
    }
  };

  return (
    <>
      {error && (
        <span role="alert" className="self-center text-sm text-red-600">
          {error}
        </span>
      )}
      <Link
        to={`/posts/${post._id}/edit`}
        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        Edit
      </Link>
      <button
        onClick={remove}
        disabled={busy}
        className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
      >
        {busy ? "Deleting…" : "Delete"}
      </button>
    </>
  );
}
