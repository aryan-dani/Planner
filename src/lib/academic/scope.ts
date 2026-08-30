/** Single source of truth for academic scope options. */

export const BRANCHES = ["AIDS", "CSE", "ECE"] as const;
export type Branch = (typeof BRANCHES)[number];

export const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
export type Semester = (typeof SEMESTERS)[number];

export const BRANCH_SET = new Set<string>(BRANCHES);
export const SEMESTER_SET = new Set<number>(SEMESTERS);

/** Short labels (sidebar, admin). */
export const BRANCH_OPTIONS = BRANCHES.map((value) => ({
  value,
  label: value,
}));

/** Long labels (profile settings). */
export const BRANCH_OPTIONS_LONG: { value: Branch; label: string }[] = [
  { value: "AIDS", label: "Artificial Intelligence & Data Science" },
  { value: "CSE", label: "Computer Science & Engineering" },
  { value: "ECE", label: "Electronics & Communication Engineering" },
];

export const SEMESTER_OPTIONS = SEMESTERS.map((value) => ({
  value,
  label: `Semester ${value}`,
}));

export const SEMESTER_OPTIONS_SHORT = SEMESTERS.map((value) => ({
  value,
  label: `Sem ${value}`,
}));

export function isBranch(value: string): value is Branch {
  return BRANCH_SET.has(value);
}

export function isSemester(value: number): value is Semester {
  return SEMESTER_SET.has(value);
}
