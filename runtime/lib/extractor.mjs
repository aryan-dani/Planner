/**
 * runtime/lib/extractor.mjs
 * Universal text extraction from various file formats.
 * Supports PDF, DOCX, PPTX.
 */

import "./dom-polyfill.mjs";
import * as pdfParse from "pdf-parse";
const { PDFParse } = pdfParse;
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { pathToFileURL } from "url";
import path from "path";

try {
  const workerPath = path.join(process.cwd(), "node_modules", "pdfjs-dist", "legacy", "build", "pdf.worker.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).toString();
} catch (e) {
  console.warn("⚠️ Failed to resolve pdf.worker.mjs path:", e);
}

import officeparser from "officeparser";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";

/**
 * Extract text from a buffer based on file extension.
 */
export async function extractText(buffer, extension) {
  const ext = extension.toLowerCase().replace(".", "");

  if (ext === "pdf") {
    const parser = new PDFParse({ data: buffer });
    try {
      const info = await parser.getInfo();
      const textResult = await parser.getText();
      return {
        text: textResult.text,
        pages: info.total,
      };
    } finally {
      await parser.destroy();
    }
  }

  if (["docx", "pptx", "xlsx"].includes(ext)) {
    const tempPath = join(tmpdir(), `office-${randomUUID()}.${ext}`);
    try {
      await writeFile(tempPath, buffer);

      // officeparser v7: async API (callback form also rethrows — do not mix)
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

      return {
        text: typeof text === "string" ? text : String(text ?? ""),
        pages: 1,
      };
    } catch (err) {
      console.error(`Office Parse Error (${ext}):`, err.message || err);
      throw err;
    } finally {
      try {
        await unlink(tempPath);
      } catch {}
    }
  }

  if (["doc", "ppt", "xls"].includes(ext)) {
    throw new Error(
      `Legacy Office format .${ext} is not supported for text extraction (use .docx/.pptx/.xlsx)`,
    );
  }

  throw new Error(`Unsupported file extension: ${ext}`);
}
