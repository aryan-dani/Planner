export type PlannerSubTask = {
  id: string;
  text: string;
  done: boolean;
};

export type PlannerTaskCategory =
  | "Revision"
  | "Exam Prep"
  | "Assignment"
  | "Project"
  | "General";

export type PlannerTaskStatus = "todo" | "in-progress" | "done";

export type PlannerTask = {
  id: string;
  text: string;
  done: boolean;
  subtasks: PlannerSubTask[];
  category?: PlannerTaskCategory;
  status?: PlannerTaskStatus;
  isRecurring?: boolean;
  recurringDays?: number[];
};

export type PlanData = Record<string, PlannerTask[]>;

function isoDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Toggle a task's recurring flag and, when enabled, propagate weekly copies
 * through the rest of the task's calendar month.
 */
export function toggleTaskRecurring(
  plan: PlanData,
  date: string,
  taskId: string,
  generateId: () => string,
): { plan: PlanData; propagated: boolean } {
  const updatedDateTasks = (plan[date] || []).map((t) => {
    if (t.id === taskId) {
      const nextRecurring = !t.isRecurring;
      return { ...t, isRecurring: nextRecurring };
    }
    return t;
  });

  const nextData: PlanData = { ...plan, [date]: updatedDateTasks };

  const sourceTask = updatedDateTasks.find((t) => t.id === taskId);
  if (!sourceTask?.isRecurring) {
    return { plan: nextData, propagated: false };
  }

  const startDate = new Date(date + "T00:00:00");
  const activeMonth = startDate.getMonth();
  const activeYear = startDate.getFullYear();

  const tempDate = new Date(startDate);
  tempDate.setDate(tempDate.getDate() + 7);

  while (
    tempDate.getMonth() === activeMonth &&
    tempDate.getFullYear() === activeYear
  ) {
    const isoString = isoDateKey(tempDate);
    const existing = nextData[isoString] || [];
    if (!existing.some((t) => t.text === sourceTask.text)) {
      nextData[isoString] = [
        ...existing,
        {
          ...sourceTask,
          id: generateId(),
          isRecurring: true,
          done: false,
          status: "todo",
          subtasks: [],
        },
      ];
    }
    tempDate.setDate(tempDate.getDate() + 7);
  }

  return { plan: nextData, propagated: true };
}
