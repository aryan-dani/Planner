export type Position = {
  row: number;
  col: number;
};

export type CellType = "empty" | "start" | "goal" | "wall";

export interface GridNode {
  row: number;
  col: number;
  type: CellType;
  gCost: number;
  hCost: number;
  fCost: number;
  parent: Position | null;
}

export interface GridState {
  grid: GridNode[][];
  startPos: Position;
  goalPos: Position;
  currentNode: Position | null;
  openSetPositions: Position[];
  closedSetPositions: Position[];
  pathPositions: Position[];
  consideredNeighbors: Position[];
}

export type SavedGridData = {
  startPos: Position;
  goalPos: Position;
  walls: Position[];
  rows: number;
  cols: number;
};

export function cloneGrid(grid: GridNode[][]): GridNode[][] {
  return grid.map((row) =>
    row.map((node) => ({
      ...node,
      parent: node.parent ? { ...node.parent } : null,
    })),
  );
}

/** A simple wall so first-time runs show a path going around something. */
export const STARTER_WALLS: Position[] = [
  { row: 1, col: 10 },
  { row: 2, col: 10 },
  { row: 3, col: 10 },
  { row: 4, col: 10 },
  { row: 5, col: 10 },
  { row: 6, col: 10 },
  { row: 7, col: 10 },
  { row: 8, col: 10 },
  { row: 9, col: 10 },
  { row: 9, col: 11 },
  { row: 9, col: 12 },
  { row: 1, col: 11 },
  { row: 1, col: 12 },
];

export const DEFAULT_START: Position = { row: 5, col: 3 };
export const DEFAULT_GOAL: Position = { row: 5, col: 18 };

export function createInitialGrid(
  rows: number,
  cols: number,
  startPos: Position,
  goalPos: Position,
  wallPositions: Position[] = [],
): GridNode[][] {
  const wallSet = new Set(wallPositions.map((p) => `${p.row},${p.col}`));
  const grid: GridNode[][] = [];

  for (let r = 0; r < rows; r++) {
    const rowNodes: GridNode[] = [];
    for (let c = 0; c < cols; c++) {
      const isStart = r === startPos.row && c === startPos.col;
      const isGoal = r === goalPos.row && c === goalPos.col;
      const isWall = wallSet.has(`${r},${c}`);

      rowNodes.push({
        row: r,
        col: c,
        type: isStart ? "start" : isGoal ? "goal" : isWall ? "wall" : "empty",
        gCost: Infinity,
        hCost: Infinity,
        fCost: Infinity,
        parent: null,
      });
    }
    grid.push(rowNodes);
  }

  return grid;
}
