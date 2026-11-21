import type { PaginationMeta } from "../../types";

interface Props {
  meta: PaginationMeta;
  onPageChange(page: number): void;
}

export function Pagination({ meta, onPageChange }: Props) {
  if (meta.totalPages <= 1) return null;

  const btn =
    "rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-4">
      <button className={btn} disabled={meta.page <= 1} onClick={() => onPageChange(meta.page - 1)}>
        ← Previous
      </button>
      <span className="text-sm text-slate-600">
        Page {meta.page} of {meta.totalPages}
      </span>
      <button className={btn} disabled={meta.page >= meta.totalPages} onClick={() => onPageChange(meta.page + 1)}>
        Next →
      </button>
    </nav>
  );
}
