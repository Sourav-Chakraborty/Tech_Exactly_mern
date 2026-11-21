import { useNavigate } from "react-router";
import { postsApi } from "../api/posts";
import { PostForm } from "../components/posts/PostForm";

// Logged-in users only (see App routes).
export function CreatePostPage() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">New post</h1>
      <PostForm
        submitLabel="Publish"
        onSubmit={async (input) => {
          const post = await postsApi.create(input);
          navigate(`/posts/${post.slug}`);
        }}
        onCancel={() => navigate(-1)}
      />
    </div>
  );
}
