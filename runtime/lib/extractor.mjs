/**
 * runtime/lib/extractor.mjs
 * Structure-aware text extraction — returns positioned units per slide/page/section.
 */

import "./dom-polyfill.mjs";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { pathToFileURL } from "url";
import path from "path";
import { unzipSync } from "fflate";
import officeparser from "officeparser";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";

try {
  const workerPath = path.join(
    process.cwd(),
    "node_modules",
    "pdfjs-dist",
    "legacy",
    "build",
    "pdf.worker.mjs",
  );
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).toString();
} catch (e) {
  console.warn("⚠️ Failed to resolve pdf.worker.mjs path:", e);
}

/**
 * @typedef {{ text: string, sectionLabel: string, sectionIndex: number, heading?: string }} ExtractUnit
 */

/**
 * @param {Buffer} buffer
 * @param {string} extension
 * @returns {Promise<{ units: ExtractUnit[], pages: number, fullText: string }>}
 */
export async function extractStructured(buffer, extension) {
  const ext = extension.toLowerCase().replace(".", "");

  if (ext === "pdf") return extractPdf(buffer);
  if (ext === "pptx") return extractPptx(buffer);
  if (ext === "docx") return extractDocx(buffer);
  if (ext === "xlsx") return extractXlsx(buffer);

  if (["doc", "ppt", "xls"].includes(ext)) {
    throw new Error(
      `Legacy Office format .${ext} is not supported (use .docx/.pptx/.xlsx)`,
    );
  }

  throw new Error(`Unsupported file extension: ${ext}`);
}

/** Backward-compatible flat extraction. */
export async function extractText(buffer, extension) {
  const { units, pages, fullText } = await extractStructured(buffer, extension);
  return {
    text: fullText || units.map((u) => u.text).join("\n\n"),
    pages,
    units,
  };
}

async function extractPdf(buffer) {
  const data = new Uint8Array(buffer);
  const doc = await pdfjs.getDocument({ data }).promise;
  /** @type {ExtractUnit[]} */
  const units = [];

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) continue;
    units.push({
      text,
      sectionLabel: `Page ${pageNum}`,
      sectionIndex: pageNum,
      heading: text.split(/\s+/).slice(0, 8).join(" "),
    });
  }

  const fullText = units.map((u) => u.text).join("\n\n");
  return { units, pages: doc.numPages, fullText };
}

function extractXmlTextRuns(xml) {
  const runs = [];
  const regex = /<a:t[^>]*>([^<]*)<\/a:t>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    const t = match[1]
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .trim();
    if (t) runs.push(t);
  }
  return runs;
}

async function extractPptx(buffer) {
  const files = unzipSync(new Uint8Array(buffer));
  const slideKeys = Object.keys(files)
    .filter((k) => /^ppt\/slides\/slide\d+\.xml$/.test(k))
    .sort((a, b) => {
      const na = parseInt(a.match(/slide(\d+)/)?.[1] || "0", 10);
      const nb = parseInt(b.match(/slide(\d+)/)?.[1] || "0", 10);
      return na - nb;
    });

  /** @type {ExtractUnit[]} */
  const units = [];

  for (const key of slideKeys) {
    const slideNum = parseInt(key.match(/slide(\d+)/)?.[1] || "0", 10);
    const xml = new TextDecoder().decode(files[key]);
    const runs = extractXmlTextRuns(xml);
    const notesKey = `ppt/notesSlides/notesSlide${slideNum}.xml`;
    let notesText = "";
    if (files[notesKey]) {
      const notesXml = new TextDecoder().decode(files[notesKey]);
      notesText = extractXmlTextRuns(notesXml).join(" ");
    }

    const body = runs.join(" ").replace(/\s+/g, " ").trim();
    const combined = [body, notesText ? `Notes: ${notesText}` : ""]
      .filter(Boolean)
      .join("\n");
    if (!combined.trim()) continue;

    units.push({
      text: combined,
      sectionLabel: `Slide ${slideNum}`,
      sectionIndex: slideNum,
      heading: runs[0] || `Slide ${slideNum}`,
    });
  }

  if (units.length === 0) {
    return extractOfficeFallback(buffer, "pptx");
  }

  const fullText = units.map((u) => u.text).join("\n\n");
  return { units, pages: units.length, fullText };
}

async function extractDocx(buffer) {
  const { text } = await parseOfficeBuffer(buffer, "docx");
  const clean = text.replace(/\u0000/g, "").replace(/\s+/g, " ").trim();
  /** @type {ExtractUnit[]} */
  const units = [];
  const headingPattern =
    /(?:Unit\s+[IVXLC\d]+[^.]*|Chapter\s+\d+[^.]*|Module\s+\d+[^.]*|Section\s+\d+[^.]*)/gi;
  const parts = clean.split(headingPattern);
  const headings = clean.match(headingPattern) || [];

  if (headings.length === 0) {
    units.push({
      text: clean,
      sectionLabel: "Document",
      sectionIndex: 1,
    });
  } else {
    for (let i = 0; i < headings.length; i++) {
      const heading = headings[i].trim();
      const body = (parts[i + 1] || "").trim();
      if (!body) continue;
      units.push({
        text: `${heading}\n${body}`,
        sectionLabel: `Section: ${heading}`,
        sectionIndex: i + 1,
        heading,
      });
    }
  }

  return { units, pages: units.length, fullText: clean };
}

async function extractXlsx(buffer) {
  const tempPath = join(tmpdir(), `office-${randomUUID()}.xlsx`);
  try {
    await writeFile(tempPath, buffer);
    const parse =
      typeof officeparser.parseOffice === "function"
        ? officeparser.parseOffice.bind(officeparser)
        : officeparser;
    const parsed = await parse(tempPath);
    const text =
      typeof parsed === "string"
        ? parsed
        : typeof parsed?.toText === "function"
          ? parsed.toText()
          : parsed?.text || JSON.stringify(parsed);
    const clean = String(text ?? "").trim();
    const sheetParts = clean.split(/(?:Sheet\s+\d+|Worksheet\s+\d+)/i);
    /** @type {ExtractUnit[]} */
    const units = sheetParts
      .map((part, idx) => part.trim())
      .filter(Boolean)
      .map((part, idx) => ({
        text: part,
        sectionLabel: `Sheet ${idx + 1}`,
        sectionIndex: idx + 1,
      }));

    if (units.length === 0 && clean) {
      units.push({ text: clean, sectionLabel: "Sheet 1", sectionIndex: 1 });
    }

    return { units, pages: units.length, fullText: clean };
  } finally {
    try {
      await unlink(tempPath);
    } catch {}
  }
}

async function extractOfficeFallback(buffer, ext) {
  const { text } = await parseOfficeBuffer(buffer, ext);
  const clean = text.trim();
  return {
    units: [{ text: clean, sectionLabel: "Document", sectionIndex: 1 }],
    pages: 1,
    fullText: clean,
  };
}

async function parseOfficeBuffer(buffer, ext) {
  const tempPath = join(tmpdir(), `office-${randomUUID()}.${ext}`);
  try {
    await writeFile(tempPath, buffer);
    const parse =
      typeof officeparser.parseOffice === "function"
        ? officeparser.parseOffice.bind(officeparser)
        : officeparser;
    const parsed = await parse(tempPath);
    const text =
      typeof parsed === "string"
        ? parsed
        : typeof parsed?.toText === "function"
          ? parsed.toText()
          : parsed?.text || JSON.stringify(parsed);
    return { text: typeof text === "string" ? text : String(text ?? "") };
  } finally {
    try {
      await unlink(tempPath);
    } catch {}
  }
}
