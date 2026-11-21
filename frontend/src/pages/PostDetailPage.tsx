import { useNavigate, useParams } from "react-router";
import { postsApi } from "../api/posts";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../hooks/useAuth";
import { formatDate, wasEdited } from "../utils/format";
import { toSafeHtml } from "../utils/html";
import { canModify } from "../utils/permissions";
import { CommentSection } from "../components/comments/CommentSection";
import { PostActions } from "../components/posts/PostActions";
import { LoadError } from "../components/ui/LoadError";
import { Spinner } from "../components/ui/Spinner";

export function PostDetailPage() {
  const { slug = "" } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: post, error, reload } = useApi(`post:${slug}`, () => postsApi.get(slug));

  if (error) return <LoadError error={error} onRetry={reload} />;
  if (!post) return <Spinner fullPage />;

  return (
    <div className="space-y-10">
      <article className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <header className="space-y-2 border-b border-slate-100 pb-4">
          <h1 className="text-3xl font-bold">{post.title}</h1>
          <div className="flex flex-wrap items-center gap-x-2 text-sm text-slate-500">
            <span>
              By <span className="font-medium text-slate-700">{post.author?.name ?? "Unknown"}</span>
            </span>
            <span>· {formatDate(post.createdAt)}</span>
            {wasEdited(post) && <span>· updated {formatDate(post.updatedAt)}</span>}
            {canModify(user, post.author?._id) && (
              <div className="ml-auto flex gap-2">
                <PostActions post={post} onDeleted={() => navigate("/", { replace: true })} />
              </div>
            )}
          </div>
        </header>
        {/* Sanitized by the API on write and again by DOMPurify here. */}
        <div
          className="prose prose-slate mt-6 max-w-none"
          dangerouslySetInnerHTML={{ __html: toSafeHtml(post.content) }}
        />
      </article>

      <CommentSection key={post._id} postId={post._id} />
    </div>
  );
}
