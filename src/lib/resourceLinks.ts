import { ResourceItem } from "@/lib/dataFetcher";
import {
  getFileExtension,
  isCodeExtension,
  isCsvExtension,
  isImageExtension,
} from "@/lib/fileUtils";
import { isSubjectMatch } from "@/lib/subjectMatcher";

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

export function isDatasetResource(item: ResourceItem): boolean {
  const ext = getFileExtension(item.title, item.file_url);
  if (isCsvExtension(ext) || isImageExtension(ext)) return true;
  return /Dataset/i.test(item.title);
}

function isCodeResource(item: ResourceItem): boolean {
  if (isDatasetResource(item)) return false;
  if (item.category === "codes") return true;
  return isCodeExtension(getFileExtension(item.title, item.file_url));
}

function sameSubject(a: ResourceItem, b: ResourceItem): boolean {
  return (
    a.subject_name === b.subject_name ||
    isSubjectMatch(a.subject_name, b.subject_name)
  );
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
      if (!sameSubject(item, writeup)) return false;
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
      if (!sameSubject(item, code)) return false;
      if (item.category !== "writeup") return false;
      const writeupKey = parseWriteUpKey(item.title);
      return writeupKey ? keysMatch(writeupKey, key) : false;
    })
    .sort((a, b) => a.title.localeCompare(b.title));
}

/** Datasets linked to an assignment notebook/code via Assignment_K ↔ Dataset. */
export function findRelatedDatasets(
  resource: ResourceItem,
  pool: ResourceItem[],
): ResourceItem[] {
  const key = parseAssignmentKey(resource.title);
  if (!key) return [];

  return pool
    .filter((item) => {
      if (item.id === resource.id) return false;
      if (!sameSubject(item, resource)) return false;
      if (!isDatasetResource(item)) return false;
      const assignmentKey = parseAssignmentKey(item.title);
      return assignmentKey ? keysMatch(key, assignmentKey) : false;
    })
    .sort((a, b) => a.title.localeCompare(b.title));
}
