"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, ZoomIn, ZoomOut } from "lucide-react";
import { fetchCachedPdf } from "@/lib/pdfPreviewCache";

interface PdfPreviewProps {
  driveId: string;
  ext?: string;
  title: string;
  fallbackUrl: string;
  onReady?: () => void;
  onFail?: () => void;
}

export default function PdfPreview({
  driveId,
  ext = "pdf",
  title,
  fallbackUrl,
  onReady,
  onFail,
}: PdfPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1.25);
  const [pageCount, setPageCount] = useState(0);
  const [failed, setFailed] = useState(false);
  const [rendering, setRendering] = useState(true);

  const renderPdf = useCallback(async () => {
    setRendering(true);
    setFailed(false);
    const container = containerRef.current;
    if (!container) return;

    try {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

      const blob = await fetchCachedPdf(driveId, ext);
      const data = await blob.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data }).promise;

      container.innerHTML = "";
      setPageCount(pdf.numPages);

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.className =
          "mx-auto mb-4 max-w-full shadow-sm border border-border rounded-lg bg-white block";
        canvas.setAttribute("role", "img");
        canvas.setAttribute(
          "aria-label",
          `${title} — page ${pageNum} of ${pdf.numPages}`,
        );

        const ctx = canvas.getContext("2d");
        if (!ctx) continue;

        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        container.appendChild(canvas);
      }

      setRendering(false);
      onReady?.();
    } catch {
      setFailed(true);
      setRendering(false);
      onFail?.();
    }
  }, [driveId, ext, scale, title, onReady, onFail]);

  useEffect(() => {
    void renderPdf();
  }, [renderPdf]);

  return (
    <div className="relative h-full w-full flex flex-col bg-background">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-card/90 px-3 py-2 text-xs shrink-0">
        <span className="text-muted font-medium truncate">
          {pageCount > 0 ? `${pageCount} page${pageCount === 1 ? "" : "s"}` : "PDF preview"}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setScale((s) => Math.max(0.75, s - 0.15))}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted hover:text-foreground hover:bg-surface transition-colors"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <span className="w-10 text-center font-semibold text-foreground tabular-nums">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setScale((s) => Math.min(2.5, s + 0.15))}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted hover:text-foreground hover:bg-surface transition-colors"
            aria-label="Zoom in"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar p-4 sm:p-6">
        {rendering && !failed && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted">
            <span className="loading-orb" aria-hidden />
            <p className="text-sm font-medium">Rendering PDF…</p>
          </div>
        )}

        {failed && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-muted">
            <p className="text-sm">Could not render this PDF in-app.</p>
            <a
              href={fallbackUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline underline-offset-4 text-sm inline-flex items-center gap-1 font-semibold"
            >
              Open on Drive <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}

        <div ref={containerRef} className="max-w-4xl mx-auto" />
      </div>
    </div>
  );
}
