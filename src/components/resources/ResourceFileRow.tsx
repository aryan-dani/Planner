"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import {
  Code2,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  HardDrive,
  ImageIcon,
  Link2,
  PenTool,
  Star,
  Table2,
} from "lucide-react";
import { ResourceItem } from "@/lib/dataFetcher";
import {
  getFileExtension,
  getDriveFileId,
  isCodeExtension,
  isCsvExtension,
  isImageExtension,
  isNotebookExtension,
} from "@/lib/fileUtils";
import { getResourceFileRole } from "@/lib/resourceGroups";
import { cleanResourceTitle } from "@/lib/titleUtils";
import { getDirectDownloadUrl } from "@/lib/driveFileCache";

interface ResourceFileRowProps {
  item: ResourceItem;
  onOpenResource: (item: ResourceItem) => void;
  onSummarize?: (item: ResourceItem) => void;
  onShare?: (item: ResourceItem) => void;
  onFavorite?: (item: ResourceItem) => void;
  isFavorite?: boolean;
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
  onFavorite,
  isFavorite = false,
  depth = 0,
  highlight = false,
  scrollTarget = false,
}: ResourceFileRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [offline, setOffline] = useState(false);
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
  const driveId = getDriveFileId(item.file_url);
  const driveItemKey = `${driveId}:${item.id}`;
  const [prevDriveItem, setPrevDriveItem] = useState(driveItemKey);
  if (prevDriveItem !== driveItemKey) {
    setPrevDriveItem(driveItemKey);
    setOffline(false);
  }

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

  useEffect(() => {
    if (!driveId || typeof caches === "undefined") return;
    let cancelled = false;
    const url = getDirectDownloadUrl(driveId);
    caches
      .match(url)
      .then((hit) => {
        if (!cancelled) setOffline(!!hit);
      })
      .catch(() => {
        if (!cancelled) setOffline(false);
      });
    return () => {
      cancelled = true;
    };
  }, [driveId, item.id]);

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
        <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mt-0.5 flex items-center gap-1.5">
          <span>
            {roleLabel(item)}
            {extension ? ` · ${extension.toUpperCase()}` : ""}
          </span>
          {offline && (
            <span
              className="inline-flex items-center gap-0.5 normal-case tracking-normal text-[10px] font-medium text-foreground/70"
              title="Available offline"
            >
              <HardDrive className="w-2.5 h-2.5" />
              Offline
            </span>
          )}
        </p>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        {onFavorite && (
          <button
            type="button"
            onClick={(e: MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              onFavorite(item);
            }}
            className={`inline-flex items-center justify-center min-h-11 min-w-11 sm:min-h-0 sm:min-w-0 p-2 sm:p-1.5 rounded-lg border border-border transition-colors ${
              isFavorite
                ? "bg-foreground text-background"
                : "bg-surface hover:bg-surface-hover text-muted hover:text-foreground"
            }`}
            aria-label={isFavorite ? "Remove favorite" : "Add favorite"}
            title={isFavorite ? "Remove favorite" : "Favorite"}
          >
            <Star
              className={`w-3.5 h-3.5 ${isFavorite ? "fill-current" : ""}`}
            />
          </button>
        )}
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
