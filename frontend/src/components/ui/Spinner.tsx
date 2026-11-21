export function Spinner({ fullPage = false }: { fullPage?: boolean }) {
  const spinner = (
    <div
      role="status"
      aria-label="Loading"
      className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600"
    />
  );
  if (!fullPage) return spinner;
  return <div className="flex min-h-[50vh] items-center justify-center">{spinner}</div>;
}
