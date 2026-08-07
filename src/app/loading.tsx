export default function Loading() {
  return (
    <div className="flex-1 w-full flex flex-col items-center justify-center min-h-[60vh] px-6">
      <div className="w-6 h-6 border-2 border-border border-t-foreground rounded-full animate-spin mb-4" />
      <p className="text-sm text-muted">Loading…</p>
    </div>
  );
}
