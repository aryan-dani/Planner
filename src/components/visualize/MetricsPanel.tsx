"use client";

import { AlgorithmMetrics } from "@/lib/visualize/types";

export interface MetricsPanelProps {
  metrics: AlgorithmMetrics | null;
  frontierLabel?: string;
  pathLabel?: string;
}

export function MetricsPanel({
  metrics,
  frontierLabel = "Still to try",
  pathLabel = "Path length",
}: MetricsPanelProps) {
  const items = [
    { label: "Cells checked", value: metrics ? String(metrics.nodesExplored) : "—" },
    { label: frontierLabel, value: metrics ? String(metrics.frontierSize) : "—" },
    {
      label: pathLabel,
      value:
        metrics && metrics.pathCost > 0 && metrics.pathCost !== Infinity
          ? Number.isInteger(metrics.pathCost)
            ? String(metrics.pathCost)
            : metrics.pathCost.toFixed(2)
          : "—",
    },
    { label: "Steps in this run", value: metrics ? String(metrics.totalSteps) : "—" },
  ];

  return (
    <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-xs text-muted">{item.label}</dt>
          <dd className="font-mono text-lg text-foreground mt-0.5">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
