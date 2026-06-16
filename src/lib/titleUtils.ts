/**
 * src/lib/titleUtils.ts
 * Formats resource filenames to make them neat, clean, and highly readable.
 */
export function cleanResourceTitle(title: string): string {
  if (!title) return "";

  // 1. Remove file extension
  let clean = title.replace(/\.[^/.]+$/, "");

  // 2. Replace all underscores and hyphens with spaces
  clean = clean.replace(/[_\-]+/g, " ").trim();

  // 3. Match patterns like "Sem 4 AIESL WriteUp 1 A*Star" -> "Writeup 1: A*Star"
  // or "Sem 4 PBL-II WriteUp 3" -> "Writeup 3"
  const writeupMatch = clean.match(/(?:Sem\s+\d+\s+)?(?:[A-Z0-9-]+\s+)?Write[\s\-]?up\s+(\d+|[A-Z0-9]+)\s*(.*)/i);
  if (writeupMatch) {
    const num = writeupMatch[1];
    const rest = writeupMatch[2].trim();
    return `Writeup ${num}${rest ? `: ${rest}` : ""}`;
  }

  // 4. Match patterns like "DE PPT Unit I" -> "Unit I"
  // or "DE PPT Unit 2 Intro" -> "Unit II: Intro"
  // or "SS PPT Unit 4" -> "Unit IV"
  const pptMatch = clean.match(/^[A-Z0-9]+\s+PPT\s+Unit\s+([ivx\d]+)\s*(.*)/i);
  if (pptMatch) {
    const unit = pptMatch[1].toUpperCase();
    const rest = pptMatch[2].trim();
    return `Unit ${unit}${rest ? `: ${rest}` : ""}`;
  }

  // 5. Clean up "Unit1" -> "Unit 1"
  clean = clean.replace(/\bUnit(\d+)\b/gi, "Unit $1");
  clean = clean.replace(/\bUnit\s*([IVXLCDM]+)\b/gi, (m, g1) => `Unit ${g1.toUpperCase()}`);

  // 6. Squeeze multiple spaces
  clean = clean.replace(/\s+/g, " ").trim();

  // 7. Strip leading/trailing punctuation or spaces
  clean = clean.replace(/^[\s\-:]+|[\s\-:]+$/g, "");

  return clean || title;
}
