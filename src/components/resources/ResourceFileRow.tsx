"use client";

import { useEffect, useRef, type MouseEvent } from "react";
import {
  Code2,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  ImageIcon,
  Link2,
  PenTool,
  Table2,
} from "lucide-react";
import { ResourceItem } from "@/lib/dataFetcher";
import {
  getFileExtension,
  isCodeExtension,
  isCsvExtension,
  isImageExtension,
  isNotebookExtension,
} from "@/lib/fileUtils";
import { getResourceFileRole } from "@/lib/resourceGroups";
import { cleanResourceTitle } from "@/lib/titleUtils";

interface ResourceFileRowProps {
  item: ResourceItem;
  onOpenResource: (item: ResourceItem) => void;
  onSummarize?: (item: ResourceItem) => void;
  onShare?: (item: ResourceItem) => void;
  depth?: number;
  highlight?: boolean;
  scrollTarget?: boolean;
}

function roleLabel(item: ResourceItem): string {
  const role = getResourceFileRole(item);
  switch (role) {
    case "writeup":
      return "Writeup";
    case "notebook":
      return "Notebook";
    case "dataset":
      return "Dataset";
    case "code":
      return "Code";
    case "notes":
      return "Notes";
    case "ppt":
      return "Presentation";
    case "pyq":
      return "PYQ";
    case "qb":
      return item.category === "solved-question-bank" ? "Solved QB" : "QB";
    default:
      return "File";
  }
}

export default function ResourceFileRow({
  item,
  onOpenResource,
  onSummarize,
  onShare,
  depth = 0,
  highlight = false,
  scrollTarget = false,
}: ResourceFileRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const extension = getFileExtension(item.title, item.file_url);
  const isDrivePreview = item.file_url.includes("drive.google.com/file/d/");
  const isPdf = extension === "pdf" || (isDrivePreview && !extension);
  const isPpt = extension === "ppt" || extension === "pptx";
  const isDoc = extension === "doc" || extension === "docx";
  const isNotebook = isNotebookExtension(extension);
  const isCsv = isCsvExtension(extension);
  const isImage = isImageExtension(extension);
  const isCode =
    !isCsv &&
    !isImage &&
    (isCodeExtension(extension) || item.category === "codes");
  const opensInViewer = isPdf || isPpt || isDrivePreview || isCode || isCsv || isImage;
  const isSummarizable =
    (isPdf || isPpt || isDoc || (isDrivePreview && !isCode && !isCsv && !isImage)) &&
    !!onSummarize;
  const role = getResourceFileRole(item);

  const FileIcon =
    role === "dataset" || isCsv
      ? Table2
      : isImage
        ? ImageIcon
        : isNotebook
          ? Code2
          : role === "writeup"
            ? PenTool
            : isCode
              ? Code2
              : isPpt
                ? FileSpreadsheet
                : FileText;

  const handleOpen = () => {
    if (opensInViewer) {
      onOpenResource(item);
    } else {
      window.open(item.file_url, "_blank", "noopener,noreferrer");
    }
  };

  const paddingLeft = 12 + Math.min(depth, 3) * 12;

  useEffect(() => {
    if (scrollTarget && rowRef.current) {
      rowRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [scrollTarget]);

  return (
    <div
      ref={rowRef}
      className={`group flex items-center gap-3 py-2.5 pr-3 border-b border-border/50 last:border-b-0 hover:bg-surface/60 transition-colors cursor-pointer ${
        highlight ? "bg-surface/80" : "bg-card"
      }`}
      style={{ paddingLeft }}
      onClick={handleOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleOpen();
        }
      }}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-surface border border-border text-muted group-hover:text-foreground transition-colors">
        <FileIcon className="w-3.5 h-3.5" />
      </div>

      <div className="min-w-0 flex-1">
        <p
          className="text-sm font-medium text-foreground truncate leading-snug"
          title={item.title}
        >
          {cleanResourceTitle(item.title)}
        </p>
        <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mt-0.5">
          {roleLabel(item)}
          {extension ? ` · ${extension.toUpperCase()}` : ""}
        </p>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        {onShare && (
          <button
            type="button"
            onClick={(e: MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              onShare(item);
            }}
            className="inline-flex items-center gap-1 px-2.5 py-2 min-h-11 rounded-lg bg-surface hover:bg-surface-hover border border-border text-xs font-medium text-foreground transition-colors"
            aria-label="Copy share link"
            title="Copy share link"
          >
            <Link2 className="w-3 h-3 text-muted" />
            Share
          </button>
        )}
        <button
          type="button"
          onClick={(e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            handleOpen();
          }}
          className="inline-flex items-center gap-1 px-2.5 py-2 min-h-11 rounded-lg bg-surface hover:bg-surface-hover border border-border text-xs font-medium text-foreground transition-colors"
        >
          <ExternalLink className="w-3 h-3 text-muted" />
          Open
        </button>
        {isSummarizable && (
          <button
            type="button"
            onClick={(e: MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              onSummarize?.(item);
            }}
            className="inline-flex items-center gap-1 px-2.5 py-2 min-h-11 rounded-lg bg-foreground text-background hover:opacity-90 text-xs font-medium transition-opacity"
          >
            Summarize
          </button>
        )}
      </div>
    </div>
  );
}
