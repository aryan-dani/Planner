export interface CspState {
  n: number;
  queens: number[];
  currentRow: number | null;
  currentCol: number | null;
  attackingCells: { row: number; col: number }[];
  status: "trying" | "placed" | "conflict" | "backtrack" | "solution" | "done";
  solutionsFound: number;
}
