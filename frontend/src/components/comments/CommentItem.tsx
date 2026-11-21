import { useState } from "react";
import { commentsApi } from "../../api/comments";
import { useAuth } from "../../hooks/useAuth";
import { useConfirm } from "../../hooks/useConfirm";
import type { Comment } from "../../types";
import { parseApiError } from "../../utils/apiError";
import { formatDateTime, wasEdited } from "../../utils/format";
import { canModify } from "../../utils/permissions";
import { Button } from "../ui/Button";
import { TextAreaField } from "../ui/TextAreaField";

interface Props {
  comment: Comment;
  onUpdated(comment: Comment): void;
  onDeleted(id: string): void;
}

export function CommentItem({ comment, onUpdated, onDeleted }: Props) {
  const { user } = useAuth();
  const confirm = useConfirm();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.content);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const allowed = canModify(user, comment.author?._id);

  const save = async () => {
    setBusy(true);
    setError(undefined);
    try {
      onUpdated(await commentsApi.update(comment.post, comment._id, draft));
      setEditing(false);
    } catch (err) {
      setError(parseApiError(err).fieldErrors.content ?? parseApiError(err).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    const ok = await confirm({
      title: "Delete this comment?",
      message: "This can't be undone.",
      confirmLabel: "Delete comment",
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await commentsApi.remove(comment.post, comment._id);
      onDeleted(comment._id);
    } catch (err) {
      setError(parseApiError(err).message);
      setBusy(false);
    }
  };

  return (
    <li className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-baseline gap-2 text-xs text-slate-500">
        <span className="font-medium text-slate-800">{comment.author?.name ?? "Unknown"}</span>
        <span>{formatDateTime(comment.createdAt)}</span>
        {wasEdited(comment) && <span>(edited)</span>}
        {allowed && !editing && (
          <span className="ml-auto flex gap-3">
            <button
              className="font-medium text-slate-600 hover:text-indigo-600"
              onClick={() => {
                setDraft(comment.content);
                setEditing(true);
              }}
            >
              Edit
            </button>
            <button className="font-medium text-red-600 hover:text-red-700" onClick={remove} disabled={busy}>
              Delete
            </button>
          </span>
        )}
      </div>

      {editing ? (
        <div className="mt-2 space-y-2">
          <TextAreaField
            label="Edit comment"
            hideLabel
            rows={3}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setError(undefined);
            }}
            error={error}
          />
          <div className="flex gap-2">
            <Button onClick={save} loading={busy}>
              Save
            </Button>
            <Button variant="secondary" onClick={() => setEditing(false)} disabled={busy}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{comment.content}</p>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </>
      )}
    </li>
  );
}
