import { useSearchParams } from "react-router";
import { postsApi } from "../api/posts";
import { useApi } from "../hooks/useApi";
import { PostList } from "../components/posts/PostList";

const PAGE_SIZE = 10;

export function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  const result = useApi(`posts?page=${page}`, () => postsApi.list({ page, limit: PAGE_SIZE }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Latest posts</h1>
      <PostList
        {...result}
        emptyText="No posts yet. Be the first to write one!"
        onPageChange={(p) => {
          setSearchParams(p > 1 ? { page: String(p) } : {});
          window.scrollTo({ top: 0 });
        }}
      />
    </div>
  );
}
