import type { PlanData } from "./recurrence";

export type PlanMeta = {
  id?: string;
  title: string;
  month: number;
  year: number;
  is_public: boolean;
  updated_at?: string;
};

export type NormalizedImport = {
  data: PlanData;
  meta?: PlanMeta;
  legacy: boolean;
};

/** Normalize planner JSON from current `{ meta, data }` or legacy raw Record format. */
export function normalizeImportedPlan(parsed: unknown): NormalizedImport {
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid file format");
  }

  const obj = parsed as Record<string, unknown>;

  if ("data" in obj && obj.data) {
    return {
      data: obj.data as PlanData,
      meta: obj.meta as PlanMeta | undefined,
      legacy: false,
    };
  }

  return {
    data: parsed as PlanData,
    legacy: true,
  };
}
