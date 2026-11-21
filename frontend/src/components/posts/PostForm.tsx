import { useState, type FormEvent } from "react";
import type { PostInput } from "../../types";
import { parseApiError, type ParsedApiError } from "../../utils/apiError";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { FormField } from "../ui/FormField";
import { RichTextEditor } from "../editor/RichTextEditor";

interface Props {
  initial?: PostInput;
  submitLabel: string;
  onSubmit(input: PostInput): Promise<void>;
  onCancel(): void;
}

// Shared by the create and edit pages. Validation is done by the API; its messages are shown per field.
export function PostForm({ initial = { title: "", content: "" }, submitLabel, onSubmit, onCancel }: Props) {
  const [form, setForm] = useState<PostInput>(initial);
  const [error, setError] = useState<ParsedApiError | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(form);
    } catch (err) {
      setError(parseApiError(err));
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {error && <Alert>{error.message}</Alert>}
      <FormField
        label="Title"
        value={form.title}
        maxLength={150}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        error={error?.fieldErrors.title}
        required
      />
      <RichTextEditor
        label="Content"
        initialValue={initial.content}
        onChange={(content) => setForm((f) => ({ ...f, content }))}
        error={error?.fieldErrors.content}
      />
      <div className="flex gap-3">
        <Button type="submit" loading={submitting}>
          {submitLabel}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
