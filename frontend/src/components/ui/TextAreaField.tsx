import { useId, type TextareaHTMLAttributes } from "react";

interface Props extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hideLabel?: boolean;
}

export function TextAreaField({ label, error, hideLabel = false, className = "", ...textarea }: Props) {
  const id = useId();
  return (
    <div className="space-y-1">
      <label htmlFor={id} className={hideLabel ? "sr-only" : "block text-sm font-medium text-slate-700"}>
        {label}
      </label>
      <textarea
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`block w-full rounded-md border px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-indigo-500 ${
          error ? "border-red-400" : "border-slate-300"
        } ${className}`}
        {...textarea}
      />
      {error && (
        <p id={`${id}-error`} className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
