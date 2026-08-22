import { CspState } from "@/lib/visualize/csp";
import { AlgorithmStep } from "@/lib/visualize/types";

function attackingCells(
  queens: number[],
  row: number,
  col: number,
): { row: number; col: number }[] {
  const cells: { row: number; col: number }[] = [];
  for (let r = 0; r < row; r++) {
    const c = queens[r];
    if (c < 0) continue;
    if (c === col || Math.abs(c - col) === Math.abs(r - row)) {
      cells.push({ row: r, col: c });
    }
  }
  return cells;
}

function isSafe(queens: number[], row: number, col: number): boolean {
  return attackingCells(queens, row, col).length === 0;
}

export function generateNQueensSteps(
  n: number = 4,
): AlgorithmStep<CspState>[] {
  const steps: AlgorithmStep<CspState>[] = [];
  let stepCounter = 0;
  let solutionsFound = 0;
  let placementsTried = 0;

  const queens = Array.from({ length: n }, () => -1);

  function snapshot(): CspState {
    return {
      n,
      queens: [...queens],
      currentRow: null,
      currentCol: null,
      attackingCells: [],
      status: "trying",
      solutionsFound,
    };
  }

  function pushStep(
    description: string,
    line: number,
    extra: Partial<CspState>,
  ) {
    const state: CspState = {
      ...snapshot(),
      ...extra,
      queens: extra.queens ? [...extra.queens] : [...queens],
      attackingCells: extra.attackingCells
        ? extra.attackingCells.map((c) => ({ ...c }))
        : [],
      solutionsFound,
    };
    steps.push({
      stepIndex: stepCounter++,
      description,
      highlightedLine: line,
      state,
      metrics: {
        nodesExplored: placementsTried,
        frontierSize: n - queens.filter((c) => c >= 0).length,
        pathCost: queens.filter((c) => c >= 0).length,
        totalSteps: 0,
      },
    });
  }

  pushStep(
    `Initialized N-Queens for N = ${n}. Place one queen per row so none share a column or diagonal.`,
    1,
    { status: "trying" },
  );

  function solve(row: number): boolean {
    if (row === n) {
      solutionsFound += 1;
      pushStep(
        `Complete assignment found. ${n} queens placed with no attacks.`,
        6,
        { status: "solution", currentRow: null, currentCol: null },
      );
      return true;
    }

    for (let col = 0; col < n; col++) {
      placementsTried += 1;
      const attacks = attackingCells(queens, row, col);

      pushStep(
        `Trying queen at row ${row + 1}, column ${col + 1}.`,
        2,
        {
          status: "trying",
          currentRow: row,
          currentCol: col,
          attackingCells: attacks,
        },
      );

      if (!isSafe(queens, row, col)) {
        pushStep(
          `Conflict: column or diagonal already occupied by ${attacks.length} queen${attacks.length === 1 ? "" : "s"}.`,
          3,
          {
            status: "conflict",
            currentRow: row,
            currentCol: col,
            attackingCells: attacks,
          },
        );
        continue;
      }

      queens[row] = col;
      pushStep(
        `Placed queen at (${row + 1}, ${col + 1}). Domain for remaining rows reduced.`,
        4,
        {
          status: "placed",
          currentRow: row,
          currentCol: col,
        },
      );

      if (solve(row + 1)) {
        return true;
      }

      queens[row] = -1;
      pushStep(
        `Backtracking from row ${row + 1}, column ${col + 1}. No valid completion from this placement.`,
        5,
        {
          status: "backtrack",
          currentRow: row,
          currentCol: col,
        },
      );
    }

    return false;
  }

  const found = solve(0);
  pushStep(
    found
      ? "Search finished. First valid solution is shown on the board."
      : "Search finished. No solution exists for this N (unexpected for N ≥ 4).",
    7,
    { status: "done", currentRow: null, currentCol: null },
  );

  steps.forEach((s) => (s.metrics.totalSteps = steps.length));
  return steps;
}
