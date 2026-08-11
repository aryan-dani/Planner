export default function PageSkeleton({
  variant = "list",
}: {
  variant?: "list" | "split" | "simple";
}) {
  if (variant === "simple") {
    return (
      <div className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 min-h-[60vh]">
        <div className="skeleton h-8 w-48 rounded-lg mb-3" />
        <div className="skeleton h-4 w-72 rounded-md mb-10" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-16 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (variant === "split") {
    return (
      <div className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 min-h-[80vh]">
        <div className="skeleton h-8 w-56 rounded-lg mb-2" />
        <div className="skeleton h-4 w-64 rounded-md mb-8" />
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="w-full md:w-60 shrink-0 border border-border rounded-xl bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <div className="skeleton h-3 w-20 rounded" />
            </div>
            <div className="p-2 space-y-1.5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="skeleton h-9 w-full rounded-lg" />
              ))}
            </div>
          </div>
          <div className="flex-1 w-full space-y-4">
            <div className="skeleton h-7 w-40 rounded-lg" />
            <div className="skeleton h-10 w-full rounded-xl" />
            <div className="grid gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton h-20 w-full rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 min-h-[80vh]">
      <div className="skeleton h-8 w-48 rounded-lg mb-2" />
      <div className="skeleton h-4 w-80 rounded-md mb-8" />
      <div className="skeleton h-3 w-full rounded-full mb-8 max-w-xl" />
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="skeleton h-[72px] w-full rounded-2xl"
          />
        ))}
      </div>
    </div>
  );
}
