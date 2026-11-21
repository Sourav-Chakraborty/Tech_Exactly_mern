import { createContext } from "react";

export interface ToastInput {
  title: string;
  message?: string;
  // Optional in-app link, e.g. "/posts/my-slug"
  link?: { to: string; label: string };
  icon?: string;
}

export interface ToastApi {
  show(toast: ToastInput): void;
}

export const ToastContext = createContext<ToastApi | null>(null);
