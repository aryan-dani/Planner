"use client";

import { Select } from "@/components/ui/Select";

export type HeuristicOption<T extends string> = {
  value: T;
  label: string;
};

export function HeuristicPicker<T extends string>({
  value,
  options,
  onChange,
  label = "Heuristic",
}: {
  value: T;
  options: HeuristicOption<T>[];
  onChange: (value: T) => void;
  label?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted">
      <label className="flex items-center gap-2">
        <span className="text-2xs font-mono uppercase tracking-wider">{label}</span>
        <Select<T>
          value={value}
          options={options}
          onChange={onChange}
          size="sm"
          className="min-w-[10rem]"
        />
      </label>
    </div>
  );
}
