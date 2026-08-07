"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";

function StatsCounter({ value }: { value: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const numericVal = parseInt(value.replace(/\D/g, ""), 10);
  const hasPlus = value.includes("+");

  useEffect(() => {
    if (!isInView) return;

    let start = 0;
    const end = numericVal;
    if (Number.isNaN(end) || end === 0) {
      setCount(end);
      return;
    }

    const totalDuration = 1000;
    const increment = Math.ceil(end / (totalDuration / 30));

    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 30);

    return () => clearInterval(timer);
  }, [numericVal, isInView]);

  return (
    <span ref={ref}>
      {count}
      {hasPlus && "+"}
    </span>
  );
}

const STATS = [
  { label: "Subjects", value: "10+" },
  { label: "Resources", value: "50+" },
  { label: "Semesters", value: "8" },
  { label: "Branches", value: "3" },
] as const;

export default function HomeStats() {
  return (
    <section className="w-full border-t border-border bg-background-subtle py-14">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6">
        {STATS.map(({ label, value }) => (
          <div
            key={label}
            className="bg-card border border-border card-premium-hover p-6 rounded-2xl shadow-xs text-center relative overflow-hidden"
          >
            <p className="text-4xl font-black text-foreground tracking-tight">
              <StatsCounter value={value} />
            </p>
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-foreground-subtle mt-2">
              {label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
