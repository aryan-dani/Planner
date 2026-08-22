"use client";

import React, { useState, useMemo, useCallback } from "react";
import { GridState, Position } from "@/lib/visualize/grid";

export interface GridCanvasProps {
  gridState: GridState;
  onToggleWall?: (pos: Position) => void;
  onMoveStart?: (pos: Position) => void;
  onMoveGoal?: (pos: Position) => void;
  isInteractive?: boolean;
  showRunLegend?: boolean;
}

export function GridCanvas({
  gridState,
  onToggleWall,
  onMoveStart,
  onMoveGoal,
  isInteractive = true,
  showRunLegend = false,
}: GridCanvasProps) {
  const [isPointerDown, setIsPointerDown] = useState(false);
  const [dragMode, setDragMode] = useState<
    "wall" | "erase-wall" | "move-start" | "move-goal" | null
  >(null);

  const {
    grid,
    startPos,
    goalPos,
    currentNode,
    openSetPositions,
    closedSetPositions,
    pathPositions,
    consideredNeighbors,
  } = gridState;

  const openSetKeys = useMemo(
    () => new Set(openSetPositions.map((p) => `${p.row},${p.col}`)),
    [openSetPositions],
  );
  const closedSetKeys = useMemo(
    () => new Set(closedSetPositions.map((p) => `${p.row},${p.col}`)),
    [closedSetPositions],
  );
  const pathSetKeys = useMemo(
    () => new Set(pathPositions.map((p) => `${p.row},${p.col}`)),
    [pathPositions],
  );
  const neighborKeys = useMemo(
    () => new Set(consideredNeighbors.map((p) => `${p.row},${p.col}`)),
    [consideredNeighbors],
  );

  const handlePointerDown = useCallback(
    (row: number, col: number) => {
      if (!isInteractive) return;
      setIsPointerDown(true);

      const isStart = row === startPos.row && col === startPos.col;
      const isGoal = row === goalPos.row && col === goalPos.col;
      const cell = grid[row]?.[col];

      if (isStart) {
        setDragMode("move-start");
      } else if (isGoal) {
        setDragMode("move-goal");
      } else if (cell?.type === "wall") {
        setDragMode("erase-wall");
        onToggleWall?.({ row, col });
      } else {
        setDragMode("wall");
        onToggleWall?.({ row, col });
      }
    },
    [isInteractive, startPos, goalPos, grid, onToggleWall],
  );

  const handlePointerEnter = useCallback(
    (row: number, col: number) => {
      if (!isInteractive || !isPointerDown || !dragMode) return;

      const isStart = row === startPos.row && col === startPos.col;
      const isGoal = row === goalPos.row && col === goalPos.col;
      const cell = grid[row]?.[col];

      if (dragMode === "move-start") {
        if (!isGoal && cell?.type !== "wall") {
          onMoveStart?.({ row, col });
        }
      } else if (dragMode === "move-goal") {
        if (!isStart && cell?.type !== "wall") {
          onMoveGoal?.({ row, col });
        }
      } else if (dragMode === "wall") {
        if (!isStart && !isGoal && cell?.type !== "wall") {
          onToggleWall?.({ row, col });
        }
      } else if (dragMode === "erase-wall") {
        if (cell?.type === "wall") {
          onToggleWall?.({ row, col });
        }
      }
    },
    [
      isInteractive,
      isPointerDown,
      dragMode,
      startPos,
      goalPos,
      grid,
      onMoveStart,
      onMoveGoal,
      onToggleWall,
    ],
  );

  const handlePointerUp = useCallback(() => {
    setIsPointerDown(false);
    setDragMode(null);
  }, []);

  const numCols = grid[0]?.length || 1;

  return (
    <div
      className="w-full flex flex-col gap-3 select-none"
      onPointerLeave={handlePointerUp}
      onPointerUp={handlePointerUp}
    >
      <p className="text-xs text-muted">
        {isInteractive
          ? "Drag S or G to move them. Drag empty cells to add walls."
          : showRunLegend
            ? "Dark fill = already checked. Soft fill = waiting. Trail = the path."
            : null}
      </p>

      <div className="max-w-full overflow-x-auto">
        <div
          className="grid gap-px bg-border/80 border border-border w-max min-w-full touch-none shadow-[inset_0_1px_0_rgb(var(--foreground)/0.04)]"
          style={{
            gridTemplateColumns: `repeat(${numCols}, minmax(1.85rem, 1fr))`,
          }}
          role="grid"
          aria-label="Pathfinding grid"
        >
          {grid.map((rowNodes, rIdx) =>
            rowNodes.map((node, cIdx) => {
              const posKey = `${rIdx},${cIdx}`;
              const isStart = rIdx === startPos.row && cIdx === startPos.col;
              const isGoal = rIdx === goalPos.row && cIdx === goalPos.col;
              const isCurrent =
                currentNode?.row === rIdx && currentNode?.col === cIdx;
              const isPath = pathSetKeys.has(posKey);
              const isFrontier = openSetKeys.has(posKey);
              const isVisited = closedSetKeys.has(posKey);
              const isNeighbor = neighborKeys.has(posKey);
              const isWall = node.type === "wall";

              let cellStyles = "bg-background text-muted";
              let label = "";
              let extra = "";

              if (isStart) {
                cellStyles = "bg-foreground text-background font-semibold";
                label = "S";
              } else if (isGoal) {
                cellStyles =
                  "bg-background text-foreground font-semibold ring-1 ring-inset ring-foreground";
                label = "G";
              } else if (isWall) {
                cellStyles = "bg-foreground/80 text-background";
              } else if (isPath) {
                cellStyles = "bg-foreground/22 text-foreground font-semibold viz-cell-path";
                label = "·";
              } else if (isCurrent) {
                cellStyles = "bg-foreground text-background font-bold viz-cell-current";
                label = "▸";
              } else if (isNeighbor) {
                cellStyles = "bg-surface text-foreground";
              } else if (isFrontier) {
                cellStyles = "bg-surface/80 text-foreground";
              } else if (isVisited) {
                cellStyles = "bg-surface text-muted";
              }

              if (isInteractive && !isStart && !isGoal && !isWall) {
                extra = "hover:bg-surface";
              }

              return (
                <div
                  key={posKey}
                  role="gridcell"
                  aria-label={`Row ${rIdx + 1}, column ${cIdx + 1}${label ? `, ${label}` : ""}`}
                  onPointerDown={() => handlePointerDown(rIdx, cIdx)}
                  onPointerEnter={() => handlePointerEnter(rIdx, cIdx)}
                  className={`viz-cell aspect-square min-h-[1.85rem] flex items-center justify-center text-[11px] ${
                    isInteractive ? "cursor-pointer" : "cursor-default"
                  } ${cellStyles} ${extra}`}
                >
                  {label}
                </div>
              );
            }),
          )}
        </div>
      </div>
    </div>
  );
}
