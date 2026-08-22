export function RippleMark() {
  return (
    <svg viewBox="0 0 64 40" className="w-16 h-10 text-foreground" aria-hidden>
      <circle cx="12" cy="20" r="3" fill="currentColor" />
      <circle cx="12" cy="20" r="8" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.45" />
      <circle cx="12" cy="20" r="14" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.22" />
      <circle cx="12" cy="20" r="20" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.1" />
    </svg>
  );
}

export function StarMark() {
  return (
    <svg viewBox="0 0 64 40" className="w-16 h-10 text-foreground" aria-hidden>
      <path
        d="M6 28 L18 22 L28 26 L40 12 L52 16 L58 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="58" cy="10" r="2.5" fill="currentColor" />
      <circle cx="6" cy="28" r="2.5" fill="currentColor" />
    </svg>
  );
}

export function QueenMark() {
  return (
    <svg viewBox="0 0 64 40" className="w-16 h-10 text-foreground" aria-hidden>
      <rect x="18" y="8" width="12" height="12" fill="currentColor" opacity="0.12" />
      <rect x="30" y="8" width="12" height="12" fill="currentColor" opacity="0.04" />
      <rect x="18" y="20" width="12" height="12" fill="currentColor" opacity="0.04" />
      <rect x="30" y="20" width="12" height="12" fill="currentColor" opacity="0.12" />
      <text x="33" y="29" fontSize="9" fill="currentColor" fontFamily="ui-sans-serif">
        Q
      </text>
    </svg>
  );
}

export function LivingGrid() {
  const cells = Array.from({ length: 40 }, (_, i) => i);
  return (
    <div
      className="grid grid-cols-8 gap-px w-[9.5rem] opacity-80"
      aria-hidden
    >
      {cells.map((i) => (
        <span
          key={i}
          className={`viz-hero-dot aspect-square bg-foreground ${
            i === 3 || i === 12 || i === 19 || i === 27 || i === 34
              ? "opacity-70"
              : "opacity-10"
          }`}
        />
      ))}
    </div>
  );
}
