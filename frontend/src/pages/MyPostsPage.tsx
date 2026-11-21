import { Link, useSearchParams } from "react-router";
import { postsApi } from "../api/posts";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../hooks/useAuth";
import { PostList } from "../components/posts/PostList";

const PAGE_SIZE = 10;

// Logged-in users only (see App routes).
export function MyPostsPage() {
  const { user } = useAuth();
  const authorId = user!._id;
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  const result = useApi(`posts?author=${authorId}&page=${page}`, () =>
    postsApi.list({ author: authorId, page, limit: PAGE_SIZE }),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My posts</h1>
        <Link to="/posts/new" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          New post
        </Link>
      </div>
      <PostList
        {...result}
        emptyText="You haven't written any posts yet."
        onPageChange={(p) => setSearchParams(p > 1 ? { page: String(p) } : {})}
      />
    </div>
  );
}
