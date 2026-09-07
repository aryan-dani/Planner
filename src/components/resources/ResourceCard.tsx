"use client";

import type { MouseEvent } from "react";
import {
  FileText,
  FileSpreadsheet,
  HardDrive,
  ExternalLink,
  CheckCircle2,
  PenTool,
  Code2,
  Link2,
  Star,
} from "lucide-react";
import { ResourceItem, ResourceCategory } from "@/lib/dataFetcher";
import { getFileExtension, isCodeExtension } from "@/lib/fileUtils";
import { cleanResourceTitle } from "@/lib/titleUtils";
import { Button, IconButton } from "@/components/ui";

interface ResourceCardProps {
  item: ResourceItem;
  onOpenResource: (item: ResourceItem) => void;
  onShare?: (item: ResourceItem) => void;
  onFavorite?: (item: ResourceItem) => void;
  isFavorite?: boolean;
  relatedCodes?: ResourceItem[];
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

export default function ResourceCard({
  item,
  onOpenResource,
  onShare,
  onFavorite,
  isFavorite = false,
  relatedCodes = [],
}: ResourceCardProps) {
  const extension = getFileExtension(item.title, item.file_url);
  const isDrivePreview = item.file_url.includes("drive.google.com/file/d/");
  const isPdf = extension === "pdf" || (isDrivePreview && !extension);
  const isPpt = extension === "ppt" || extension === "pptx";
  const isDoc = extension === "doc" || extension === "docx";
  const isCode = isCodeExtension(extension) || item.category === "codes";
  const opensInViewer = isPdf || isPpt || isDrivePreview || isCode;
  const isSolved = item.category === "solved-question-bank";
  const config = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG["other"];
  const hasRelatedCode = relatedCodes.length > 0;

  const handleOpen = () => {
    if (opensInViewer) {
      onOpenResource(item);
    } else {
      window.open(item.file_url, "_blank", "noopener,noreferrer");
    }
  };

  const stop = (e: MouseEvent, fn: () => void) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  };

  const handleOpenCode = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (relatedCodes.length === 1) {
      onOpenResource(relatedCodes[0]);
      return;
    }
    onOpenResource(item);
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

  const actionCount = 1 + (onShare ? 1 : 0) + (hasRelatedCode ? 1 : 0);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleOpen();
        }
      }}
      className="group bg-card hover:bg-surface/50 p-5 flex flex-col gap-3.5 text-left cursor-pointer relative overflow-hidden h-full transition-colors duration-200 w-full focus-visible:outline-offset-2 focus-visible:z-10"
      style={
        {
          ["--card-accent" as string]: config.color,
        } as React.CSSProperties
      }
    >
      <div
        className="absolute top-0 left-0 right-0 h-[3px] opacity-60 group-hover:opacity-100 transition-opacity"
        style={{ background: "var(--card-accent)" }}
      />

      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-[0.025] transition-opacity duration-300 pointer-events-none"
        style={{
          background: `radial-gradient(circle at center, var(--card-accent) 0%, transparent 80%)`,
        }}
      />

      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
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

        <div className="flex items-center gap-1 flex-shrink-0">
          {hasRelatedCode && (
            <span
              className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md inline-flex items-center gap-1"
              style={{
                background: `color-mix(in srgb, var(--accent-codes) 12%, transparent)`,
                color: "var(--accent-codes)",
                border: `1px solid color-mix(in srgb, var(--accent-codes) 25%, transparent)`,
              }}
              title={relatedCodes.map((c) => c.title).join("\n")}
            >
              <Code2 className="w-3 h-3" />
              {relatedCodes.length > 1 ? `${relatedCodes.length} codes` : "Code"}
            </span>
          )}
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
          {onFavorite && (
            <IconButton
              size="sm"
              label={isFavorite ? "Remove favorite" : "Add favorite"}
              variant={isFavorite ? "primary" : "ghost"}
              onClick={(e) => stop(e, () => onFavorite(item))}
              className="relative z-10"
            >
              <Star
                className={`w-3.5 h-3.5 ${isFavorite ? "fill-current" : ""}`}
              />
            </IconButton>
          )}
        </div>
      </div>

      <p className="text-xs font-semibold text-muted uppercase tracking-wider mt-auto">
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

      <div
        className={`grid gap-2 ${
          actionCount >= 3
            ? "grid-cols-2 sm:grid-cols-2"
            : actionCount === 2
              ? "grid-cols-2"
              : "grid-cols-1"
        }`}
      >
        {onShare && (
          <Button
            size="sm"
            variant="secondary"
            onClick={(e) => stop(e, () => onShare(item))}
            aria-label="Copy share link"
            title="Copy share link"
            className="w-full gap-1.5 min-h-11 rounded-xl"
          >
            <Link2 className="w-3.5 h-3.5 text-muted" />
            Share
          </Button>
        )}
        <Button
          size="sm"
          variant="secondary"
          onClick={(e) => stop(e, handleOpen)}
          className="w-full gap-1.5 min-h-11 rounded-xl"
        >
          <ExternalLink className="w-3.5 h-3.5 text-muted" />
          Open
        </Button>
        {hasRelatedCode && (
          <Button
            size="sm"
            variant="secondary"
            onClick={handleOpenCode}
            title={
              relatedCodes.length === 1
                ? relatedCodes[0].title
                : "Open writeup to pick a related code"
            }
            className="w-full gap-1.5 min-h-11 rounded-xl"
          >
            <Code2 className="w-3.5 h-3.5 text-muted" />
            Code
          </Button>
        )}
      </div>
    </div>
  );
}
