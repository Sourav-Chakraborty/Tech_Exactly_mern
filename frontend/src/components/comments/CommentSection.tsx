import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { commentsApi } from "../../api/comments";
import { useAuth } from "../../hooks/useAuth";
import type { Comment } from "../../types";
import { parseApiError } from "../../utils/apiError";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { Spinner } from "../ui/Spinner";
import { CommentForm } from "./CommentForm";
import { CommentItem } from "./CommentItem";

const PAGE_SIZE = 10;

// Newest-first comments with "Load more". Render with key={postId} so it resets per post.
export function CommentSection({ postId }: { postId: string }) {
  const { user } = useAuth();
  const location = useLocation();

  const [comments, setComments] = useState<Comment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState<"loading" | "ready" | "loading-more">("loading");
  const [error, setError] = useState<string>();

  const appendPage = (items: Comment[]) =>
    // New comments added locally shift the pages; skip any duplicates that causes.
    setComments((prev) => [...prev, ...items.filter((c) => !prev.some((p) => p._id === c._id))]);

  useEffect(() => {
    commentsApi.list(postId, 1, PAGE_SIZE).then(
      ({ items, meta }) => {
        setComments(items);
        setTotal(meta.total);
        setTotalPages(meta.totalPages);
        setStatus("ready");
      },
      (err) => {
        setError(parseApiError(err).message);
        setStatus("ready");
      },
    );
  }, [postId]);

  const loadMore = async () => {
    setStatus("loading-more");
    try {
      const { items, meta } = await commentsApi.list(postId, page + 1, PAGE_SIZE);
      appendPage(items);
      setPage(meta.page);
      setTotalPages(meta.totalPages);
      setTotal(meta.total);
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setStatus("ready");
    }
  };

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">
        Comments {status !== "loading" && <span className="text-slate-400">({total})</span>}
      </h2>

      {user ? (
        <CommentForm
          postId={postId}
          onCreated={(c) => {
            setComments((prev) => [c, ...prev]);
            setTotal((t) => t + 1);
          }}
        />
      ) : (
        <p className="text-sm text-slate-600">
          <Link to="/login" state={{ from: location }} className="font-medium text-indigo-600 hover:underline">
            Log in
          </Link>{" "}
          to join the discussion.
        </p>
      )}

      {error && <Alert>{error}</Alert>}

      {status === "loading" ? (
        <Spinner />
      ) : comments.length === 0 ? (
        <p className="text-sm text-slate-500">No comments yet.</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => (
            <CommentItem
              key={c._id}
              comment={c}
              onUpdated={(updated) => setComments((prev) => prev.map((x) => (x._id === updated._id ? updated : x)))}
              onDeleted={(id) => {
                setComments((prev) => prev.filter((x) => x._id !== id));
                setTotal((t) => t - 1);
              }}
            />
          ))}
        </ul>
      )}

      {page < totalPages && status !== "loading" && (
        <Button variant="secondary" onClick={loadMore} loading={status === "loading-more"}>
          Load more comments
        </Button>
      )}
    </section>
  );
}
