/** Shared disclaimer: handwritten notes are reference-only, not exam guarantees. */
export const NOTES_DISCLAIMER =
  "Handwritten and shared notes are for personal study reference only. They do not predict exam questions and do not guarantee that any topic will appear on an exam.";

export function NotesDisclaimer({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <p
        className={`text-xs text-muted leading-relaxed ${className}`}
        role="note"
      >
        {NOTES_DISCLAIMER}
      </p>
    );
  }

  return (
    <aside
      className={`border border-border bg-surface/50 px-4 py-3 rounded-lg ${className}`}
      role="note"
      aria-label="Notes disclaimer"
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted mb-1">
        Reference only
      </p>
      <p className="text-sm text-foreground-subtle leading-relaxed">
        {NOTES_DISCLAIMER}
      </p>
    </aside>
  );
}
