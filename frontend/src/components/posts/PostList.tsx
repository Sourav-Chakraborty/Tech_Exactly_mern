import type { Paginated, Post } from "../../types";
import type { ParsedApiError } from "../../utils/apiError";
import { useAuth } from "../../hooks/useAuth";
import { canModify } from "../../utils/permissions";
import { LoadError } from "../ui/LoadError";
import { Pagination } from "../ui/Pagination";
import { Spinner } from "../ui/Spinner";
import { PostActions } from "./PostActions";
import { PostCard } from "./PostCard";

interface Props {
  data?: Paginated<Post>;
  loading: boolean;
  error?: ParsedApiError;
  reload(): void;
  emptyText: string;
  onPageChange(page: number): void;
}

// Paginated list of post cards; owners/admins get Edit/Delete on each card.
export function PostList({ data, loading, error, reload, emptyText, onPageChange }: Props) {
  const { user } = useAuth();

  if (error) return <LoadError error={error} onRetry={reload} />;
  if (!data) return <Spinner fullPage />;
  if (data.items.length === 0) return <p className="text-slate-600">{emptyText}</p>;

  return (
    <div className={`space-y-4 transition-opacity ${loading ? "opacity-60" : ""}`}>
      {data.items.map((post) => (
        <PostCard
          key={post._id}
          post={post}
          actions={canModify(user, post.author?._id) && <PostActions post={post} onDeleted={reload} />}
        />
      ))}
      <Pagination meta={data.meta} onPageChange={onPageChange} />
    </div>
  );
}
