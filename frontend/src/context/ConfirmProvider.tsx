import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ConfirmContext, type ConfirmOptions } from "./confirmContext";
import { Button } from "../components/ui/Button";

interface Pending extends ConfirmOptions {
  resolve(confirmed: boolean): void;
}

/**
 * App-wide confirmation modal (replaces window.confirm):
 *   const confirm = useConfirm();
 *   if (await confirm({ title: "Delete post?", danger: true })) { ... }
 *
 * Built on the native <dialog> element: showModal() gives a focus trap, Escape to close,
 * inert page behind it and correct screen-reader semantics.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const confirm = useCallback(
    (options: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ ...options, resolve })),
    [],
  );

  useEffect(() => {
    if (pending && !dialogRef.current?.open) dialogRef.current?.showModal();
  }, [pending]);

  const close = (confirmed: boolean) => {
    pending?.resolve(confirmed);
    dialogRef.current?.close();
    setPending(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <dialog
        ref={dialogRef}
        role="alertdialog"
        aria-labelledby="confirm-title"
        aria-describedby={pending?.message ? "confirm-message" : undefined}
        // Escape key
        onCancel={(e) => {
          e.preventDefault();
          close(false);
        }}
        // Click on the backdrop (the dialog element itself, outside the panel)
        onClick={(e) => e.target === e.currentTarget && close(false)}
        className="m-auto w-full max-w-md rounded-lg p-0 shadow-xl backdrop:bg-slate-900/50 backdrop:backdrop-blur-[1px]"
      >
        {pending && (
          <div className="space-y-4 p-6">
            <h2 id="confirm-title" className="text-lg font-semibold text-slate-900">
              {pending.title}
            </h2>
            {pending.message && (
              <p id="confirm-message" className="text-sm text-slate-600">
                {pending.message}
              </p>
            )}
            <div className="flex justify-end gap-3 pt-2">
              {/* Focused first, so a stray Enter doesn't trigger a destructive action. */}
              <Button variant="secondary" autoFocus onClick={() => close(false)}>
                {pending.cancelLabel ?? "Cancel"}
              </Button>
              <Button variant={pending.danger ? "danger" : "primary"} onClick={() => close(true)}>
                {pending.confirmLabel ?? "Confirm"}
              </Button>
            </div>
          </div>
        )}
      </dialog>
    </ConfirmContext.Provider>
  );
}
