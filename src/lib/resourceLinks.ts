import { ResourceItem } from "@/lib/dataFetcher";
import { getFileExtension, isCodeExtension } from "@/lib/fileUtils";

/** e.g. Sem_5_OSL_WriteUp_2.docx → "2", Sem_5_OSL_WriteUp_2A.docx → "2A" */
export function parseWriteUpKey(title: string): string | null {
  const match = title.match(/WriteUp[_-]?(\d+[A-Za-z]?)/i);
  return match ? match[1].toUpperCase() : null;
}

/** e.g. Sem_5_OSL_Assignment_2A_Orphan.c → "2A", …_Assignment_3_FCFS….c → "3" */
export function parseAssignmentKey(title: string): string | null {
  const match = title.match(/Assignment[_-]?(\d+[A-Za-z]?)/i);
  return match ? match[1].toUpperCase() : null;
}

/**
 * WriteUp_2 matches Assignment_2, Assignment_2A, Assignment_2B…
 * WriteUp_2A matches Assignment_2A only (exact).
 */
function keysMatch(writeupKey: string, assignmentKey: string): boolean {
  if (writeupKey === assignmentKey) return true;
  if (!assignmentKey.startsWith(writeupKey)) return false;
  const rest = assignmentKey.slice(writeupKey.length);
  return rest === "" || /^[A-Z]+$/.test(rest);
}

function isCodeResource(item: ResourceItem): boolean {
  if (item.category === "codes") return true;
  return isCodeExtension(getFileExtension(item.title, item.file_url));
}

/** Codes linked to a writeup via WriteUp_K ↔ Assignment_K* under the same subject. */
export function findRelatedCodes(
  writeup: ResourceItem,
  pool: ResourceItem[],
): ResourceItem[] {
  const key = parseWriteUpKey(writeup.title);
  if (!key) return [];

  return pool
    .filter((item) => {
      if (item.id === writeup.id) return false;
      if (item.subject_name !== writeup.subject_name) return false;
      if (!isCodeResource(item)) return false;
      const assignmentKey = parseAssignmentKey(item.title);
      return assignmentKey ? keysMatch(key, assignmentKey) : false;
    })
    .sort((a, b) => a.title.localeCompare(b.title));
}

/** Writeups linked to a code file (Assignment_2A → WriteUp_2 / WriteUp_2A). */
export function findRelatedWriteups(
  code: ResourceItem,
  pool: ResourceItem[],
): ResourceItem[] {
  const key = parseAssignmentKey(code.title);
  if (!key) return [];

  return pool
    .filter((item) => {
      if (item.id === code.id) return false;
      if (item.subject_name !== code.subject_name) return false;
      if (item.category !== "writeup") return false;
      const writeupKey = parseWriteUpKey(item.title);
      return writeupKey ? keysMatch(writeupKey, key) : false;
    })
    .sort((a, b) => a.title.localeCompare(b.title));
}
