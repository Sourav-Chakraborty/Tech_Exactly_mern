import { useState, type FormEvent } from "react";
import { commentsApi } from "../../api/comments";
import type { Comment } from "../../types";
import { parseApiError } from "../../utils/apiError";
import { Button } from "../ui/Button";
import { TextAreaField } from "../ui/TextAreaField";

export function CommentForm({ postId, onCreated }: { postId: string; onCreated(comment: Comment): void }) {
  const [content, setContent] = useState("");
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(undefined);
    try {
      onCreated(await commentsApi.create(postId, content));
      setContent("");
    } catch (err) {
      const parsed = parseApiError(err);
      setError(parsed.fieldErrors.content ?? parsed.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2" noValidate>
      <TextAreaField
        label="Add a comment"
        hideLabel
        placeholder="Write a comment…"
        rows={3}
        maxLength={2000}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        error={error}
      />
      <Button type="submit" loading={submitting} disabled={!content.trim()}>
        Comment
      </Button>
    </form>
  );
}
