import type { ReactNode } from "react";

const styles = {
  error: "border-red-200 bg-red-50 text-red-700",
  success: "border-green-200 bg-green-50 text-green-700",
  info: "border-indigo-200 bg-indigo-50 text-indigo-700",
};

export function Alert({ kind = "error", children }: { kind?: keyof typeof styles; children: ReactNode }) {
  return (
    <div role={kind === "error" ? "alert" : "status"} className={`rounded-md border px-4 py-3 text-sm ${styles[kind]}`}>
      {children}
    </div>
  );
}
