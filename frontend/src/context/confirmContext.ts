import { createContext } from "react";

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  // Red confirm button for destructive actions.
  danger?: boolean;
}

// Resolves true when the user confirms, false when they cancel (button, Escape or backdrop).
export type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

export const ConfirmContext = createContext<ConfirmFn | null>(null);
