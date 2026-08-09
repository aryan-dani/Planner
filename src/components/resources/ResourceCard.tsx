"use client";

import {
  FileText,
  FileSpreadsheet,
  HardDrive,
  ExternalLink,
  CheckCircle2,
  PenTool,
  Code2,
} from "lucide-react";
import { ResourceItem, ResourceCategory } from "@/lib/dataFetcher";
import { getFileExtension, isCodeExtension } from "@/lib/fileUtils";
import { cleanResourceTitle } from "@/lib/titleUtils";

interface ResourceCardProps {
  item: ResourceItem;
  onOpenResource: (item: ResourceItem) => void;
  onSummarize: (item: ResourceItem) => void;
}

const CATEGORY_CONFIG: Record<
  ResourceCategory,
  { color: string; label: string }
> = {
  notes: { color: "var(--accent-notes)", label: "Notes" },
  "question-bank": { color: "var(--accent-qb)", label: "Question Bank" },
  "solved-question-bank": {
    color: "var(--accent-qb-solved)",
    label: "Solved QB",
  },
  ppt: { color: "var(--accent-ppt)", label: "Presentation" },
  pyq: { color: "var(--accent-pyq)", label: "PYQ" },
  writeup: { color: "var(--accent-writeup)", label: "Writeup" },
  codes: { color: "var(--accent-codes)", label: "Codes" },
  other: { color: "var(--accent-other)", label: "Other" },
};

// Removed isNewResource utility

export default function ResourceCard({
  item,
  onOpenResource,
  onSummarize,
}: ResourceCardProps) {
  const extension = getFileExtension(item.title, item.file_url);
  const isDrivePreview = item.file_url.includes("drive.google.com/file/d/");
  const isPdf = extension === "pdf" || (isDrivePreview && !extension); // Default to PDF styling for generic drive files if no ext
  const isPpt = extension === "ppt" || extension === "pptx";
  const isDoc = extension === "doc" || extension === "docx";
  const isCode = isCodeExtension(extension) || item.category === "codes";
  const opensInViewer = isPdf || isPpt || isDrivePreview || isCode;
  const isSummarizable = isPdf || isPpt || isDoc || (isDrivePreview && !isCode);
  const isSolved = item.category === "solved-question-bank";
  const isNew = false;
  const config = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG["other"];

  const handleOpen = () => {
    if (opensInViewer) {
      onOpenResource(item);
    } else {
      window.open(item.file_url, "_blank", "noopener,noreferrer");
    }
  };

  const FileIcon = isCode
    ? Code2
    : isPdf
      ? FileText
      : isPpt
        ? FileSpreadsheet
        : item.category === "writeup"
          ? PenTool
          : HardDrive;

  return (
    <div
      onClick={handleOpen}
      className="group bg-card hover:bg-surface/50 p-5 flex flex-col gap-3.5 text-left cursor-pointer relative overflow-hidden h-full transition-colors duration-200"
      style={{
        ["--card-accent" as any]: config.color,
      }}
    >
      {/* Accent top border */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px] opacity-60 group-hover:opacity-100 transition-opacity"
        style={{ background: "var(--card-accent)" }}
      />
      
      {/* Premium accent radial background glow */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-[0.025] transition-opacity duration-300 pointer-events-none"
        style={{ background: `radial-gradient(circle at center, var(--card-accent) 0%, transparent 80%)` }}
      />

      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* File type icon with accent color */}
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
            style={{
              background: `color-mix(in srgb, var(--card-accent) 12%, transparent)`,
              color: "var(--card-accent)",
            }}
          >
            {isSolved ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <FileIcon className="w-4 h-4" />
            )}
          </div>

          <p
            className="text-sm font-medium text-foreground line-clamp-2 leading-snug"
            title={item.title}
          >
            {cleanResourceTitle(item.title)}
          </p>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isSolved && (
            <span
              className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md"
              style={{
                background: `color-mix(in srgb, var(--card-accent) 12%, transparent)`,
                color: "var(--card-accent)",
                border: `1px solid color-mix(in srgb, var(--card-accent) 25%, transparent)`,
              }}
            >
              Solved
            </span>
          )}
        </div>
      </div>

      {/* File info */}
      <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mt-auto">
        {isCode
          ? extension.toUpperCase() || "CODE"
          : isPdf
            ? "PDF"
            : isPpt
              ? "PPT"
              : isDoc
                ? "DOC"
                : extension.toUpperCase()}{" "}
        · {config.label}
      </p>

      {/* Actions */}
      <div
        className={`grid gap-2 ${isSummarizable ? "grid-cols-2" : "grid-cols-1"}`}
      >
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleOpen();
          }}
          className="flex items-center justify-center gap-1.5 w-full py-2 bg-surface hover:bg-surface-hover border border-border rounded-xl text-xs font-medium text-foreground transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5 text-muted" />
          Open
        </button>
        {isSummarizable && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSummarize(item);
            }}
            className="flex items-center justify-center gap-1.5 w-full py-2 bg-foreground text-background hover:opacity-90 rounded-xl text-xs font-medium transition-opacity"
          >
            Summarize
          </button>
        )}
      </div>
    </div>
  );
}
