import type { ReactNode } from "react";

const tones = {
  neutral: "bg-slate-100 text-slate-700",
  indigo: "bg-indigo-100 text-indigo-700",
  green: "bg-green-100 text-green-800",
  red: "bg-red-100 text-red-700",
  amber: "bg-amber-100 text-amber-800",
};

// Always carries a text label, so state is never conveyed by color alone.
export function Badge({ tone = "neutral", children }: { tone?: keyof typeof tones; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}
