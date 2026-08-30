import type { QueryIntent, RoutedQuery } from "@/lib/rag/types";

const SUBJECT_PATTERNS = [
  /\b(dbms|database management)\b/i,
  /\b(daa|design and analysis of algorithms)\b/i,
  /\b(aies|artificial intelligence|expert systems)\b/i,
  /\b(data engineering)\b/i,
  /\b(data visualization)\b/i,
  /\b(ui\/ux|user interface)\b/i,
  /\b(operating systems?|os)\b/i,
  /\b(computer networks?|cn)\b/i,
];

export function routeQuery(rawQuery: string): RoutedQuery {
  const cleanQuery = rawQuery.trim();
  const lower = cleanQuery.toLowerCase();

  let intent: QueryIntent = "explain";

  if (/^(what is|what are|define|definition of)\b/.test(lower)) {
    intent = "definition";
  } else if (/\b(compare|difference between|vs\.?|versus)\b/.test(lower)) {
    intent = "compare";
  } else if (/\b(pyq|previous year|question paper|exam paper)\b/.test(lower)) {
    intent = "pyq";
  } else if (/\b(syllabus|unit \d|module \d|curriculum)\b/.test(lower)) {
    intent = "syllabus";
  } else if (/\b(where|find|locate|which file|which ppt|which notes)\b/.test(lower)) {
    intent = "locate";
  } else if (/\b(homework help|write my assignment|do my project for me)\b/.test(lower)) {
    intent = "out_of_scope";
  }

  let subject: string | undefined;
  for (const pattern of SUBJECT_PATTERNS) {
    const match = lower.match(pattern);
    if (match) {
      subject = match[1] || match[0];
      break;
    }
  }

  const unitMatch = lower.match(/\bunit\s+([ivxlc\d]+)\b/i);
  const unitNumber = unitMatch
    ? parseUnitNumber(unitMatch[1])
    : undefined;

  let category: string | undefined;
  if (intent === "pyq") category = "pyq";
  else if (/\b(notes|note)\b/.test(lower)) category = "notes";
  else if (/\b(ppt|slides|presentation)\b/.test(lower)) category = "ppt";

  return { intent, subject, unitNumber, category, cleanQuery };
}

function parseUnitNumber(raw: string): number | undefined {
  const roman: Record<string, number> = {
    i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8,
  };
  const lower = raw.toLowerCase();
  if (roman[lower]) return roman[lower];
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : undefined;
}

export function modelForIntent(intent: QueryIntent): "fast" | "chat" {
  if (intent === "definition" || intent === "syllabus" || intent === "locate") {
    return "fast";
  }
  return "chat";
}

export function compactHistory(
  messages: Array<{ role: string; content: string }>,
  maxTurns = 6,
): Array<{ role: "user" | "assistant"; content: string }> {
  const recent = messages.slice(-maxTurns * 2);
  return recent.map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content.slice(0, 2000),
  }));
}

export function stripInvalidCitations(
  text: string,
  validMarkers: Set<string>,
): string {
  return text.replace(/\[S\d+\]/g, (marker) =>
    validMarkers.has(marker.slice(1, -1)) ? marker : "",
  );
}

export function validMarkerSet(sources: Array<{ marker: string }>): Set<string> {
  return new Set(sources.map((s) => s.marker));
}
