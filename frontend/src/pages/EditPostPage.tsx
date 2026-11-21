import { useNavigate, useParams } from "react-router";
import { postsApi } from "../api/posts";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../hooks/useAuth";
import { canModify } from "../utils/permissions";
import { PostForm } from "../components/posts/PostForm";
import { LoadError } from "../components/ui/LoadError";
import { Spinner } from "../components/ui/Spinner";
import { ForbiddenPage } from "./ForbiddenPage";

// Logged-in users only (see App routes); additionally the post's owner or an admin.
export function EditPostPage() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: post, error, reload } = useApi(`post:${id}`, () => postsApi.get(id));

  if (error) return <LoadError error={error} onRetry={reload} />;
  if (!post) return <Spinner fullPage />;
  if (!canModify(user, post.author?._id)) return <ForbiddenPage />;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Edit post</h1>
      <PostForm
        initial={{ title: post.title, content: post.content }}
        submitLabel="Save changes"
        onSubmit={async (input) => {
          const updated = await postsApi.update(post._id, input);
          // The slug changes when the title does.
          navigate(`/posts/${updated.slug}`, { replace: true });
        }}
        onCancel={() => navigate(-1)}
      />
    </div>
  );
}
