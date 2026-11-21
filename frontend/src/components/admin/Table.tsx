import type { ReactNode } from "react";

// Simple responsive data table: scrolls horizontally on narrow screens.
export function Table({ columns, children, caption }: { columns: string[]; children: ReactNode; caption: string }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-slate-50">
          <tr>
            {columns.map((c) => (
              <th key={c} scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-middle text-slate-700 ${className}`}>{children}</td>;
}

export function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-slate-500">
        {text}
      </td>
    </tr>
  );
}

// Small text-style action button for table rows.
export function RowAction({
  children,
  onClick,
  danger = false,
  disabled = false,
}: {
  children: ReactNode;
  onClick(): void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40 ${
        danger ? "text-red-600 hover:text-red-700" : "text-slate-600 hover:text-indigo-600"
      }`}
    >
      {children}
    </button>
  );
}
