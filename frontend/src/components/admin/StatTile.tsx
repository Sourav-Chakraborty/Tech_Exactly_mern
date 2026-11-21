const compact = new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 });
const full = new Intl.NumberFormat();

// Headline number: label (sentence case) + value (auto-compact: 1,284 / 12.9K) + optional note.
// The exact value is in the title/aria-label when the display is compacted.
export function StatTile({ label, value, note }: { label: string; value: number; note?: string }) {
  const display = value >= 10_000 ? compact.format(value) : full.format(value);
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-600">{label}</p>
      <p
        className="mt-2 text-3xl font-semibold tabular-nums text-slate-900"
        title={full.format(value)}
        aria-label={`${label}: ${full.format(value)}`}
      >
        {display}
      </p>
      {note && <p className="mt-1 text-xs text-slate-500">{note}</p>}
    </div>
  );
}
