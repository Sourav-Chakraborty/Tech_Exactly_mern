import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { ToastContext, type ToastApi, type ToastInput } from "./toastContext";

interface Toast extends ToastInput {
  id: number;
}

const AUTO_DISMISS_MS = 8000;
const MAX_VISIBLE = 4;

/**
 * App-wide toast notifications (bottom-right stack).
 *   const toast = useToast(); toast.show({ title, message, link });
 * Announced to screen readers via a polite live region; auto-dismiss pauses while hovered.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const show = useCallback((toast: ToastInput) => {
    const id = nextId.current++;
    setToasts((t) => [...t, { ...toast, id }].slice(-MAX_VISIBLE));
  }, []);

  const api = useMemo<ToastApi>(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-label="Notifications"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-3 sm:inset-x-auto sm:right-4"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} dismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// `dismiss` is stable, so a toast's timer isn't restarted when other toasts come and go.
function ToastItem({ toast, dismiss }: { toast: Toast; dismiss(id: number): void }) {
  const [paused, setPaused] = useState(false);
  const onDismiss = () => dismiss(toast.id);

  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(() => dismiss(toast.id), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [paused, dismiss, toast.id]);

  return (
    <div
      role="status"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="pointer-events-auto flex w-full max-w-sm gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-lg"
    >
      {toast.icon && (
        <span aria-hidden className="text-xl leading-none">
          {toast.icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900">{toast.title}</p>
        {toast.message && <p className="mt-0.5 break-words text-sm text-slate-600">{toast.message}</p>}
        {toast.link && (
          <Link to={toast.link.to} onClick={onDismiss} className="mt-2 inline-block text-sm font-medium text-indigo-600 hover:underline">
            {toast.link.label}
          </Link>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="-mr-1 -mt-1 h-6 w-6 shrink-0 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600"
      >
        ×
      </button>
    </div>
  );
}
