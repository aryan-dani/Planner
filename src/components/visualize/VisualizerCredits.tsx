"use client";

import { VISUALIZE_AUTHORS } from "@/lib/visualize/types";

export function VisualizerCredits() {
  return (
    <p className="text-[11px] text-muted/80 leading-relaxed">{VISUALIZE_AUTHORS}</p>
  );
}
