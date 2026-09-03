"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Code2,
  X,
  Maximize,
  Table2,
  Play,
  ImageIcon,
} from "lucide-react";
import { ResourceItem } from "@/lib/dataFetcher";
import {
  getFileExtension,
  getDriveFileId,
  getDriveEmbedUrl,
  isCodeExtension,
  isNotebookExtension,
  isCsvExtension,
  isImageExtension,
} from "@/lib/fileUtils";
import { motion } from "framer-motion";
import { cleanResourceTitle, shortCodeLabel } from "@/lib/titleUtils";
import NotebookViewer from "@/components/NotebookViewer";
import CsvPreview from "@/components/CsvPreview";
import {
  folderIdForResource,
  folderLabelFromId,
  getResourceFileRole,
} from "@/lib/resourceGroups";
import { auth } from "@/lib/firebase";

interface ResourceViewerProps {
  resource: ResourceItem;
  onClose: () => void;
  /** @deprecated Prefer assignmentSiblings */
  relatedCodes?: ResourceItem[];
  /** @deprecated Prefer assignmentSiblings */
  relatedWriteups?: ResourceItem[];
  /** @deprecated Prefer assignmentSiblings */
  relatedDatasets?: ResourceItem[];
  /** All files in the same assignment (writeup, codes, datasets) */
  assignmentSiblings?: ResourceItem[];
  onOpenRelated?: (item: ResourceItem) => void;
}

function getViewerUrl(resource: ResourceItem) {
  const extension = getFileExtension(resource.title, resource.file_url);
  const driveId = getDriveFileId(resource.file_url);

  if (driveId) {
    return getDriveEmbedUrl(driveId);
  }

  if (extension === "pdf") {
    return resource.file_url;
  }

  if (extension === "ppt" || extension === "pptx") {
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(resource.file_url)}`;
  }

  return resource.file_url;
}

function getDirectUrl(resource: ResourceItem) {
  const isDrive = resource.file_url.includes("drive.google.com");
  if (isDrive) {
    const driveId = getDriveFileId(resource.file_url);
    if (driveId) {
      return `https://drive.google.com/uc?export=download&id=${driveId}`;
    }
  }
  return resource.file_url;
}

export default function ResourceViewer({
  resource,
  onClose,
  relatedCodes = [],
  relatedWriteups = [],
  relatedDatasets = [],
  assignmentSiblings = [],
  onOpenRelated,
}: ResourceViewerProps) {
  const extension = getFileExtension(resource.title, resource.file_url);
  const isDrive = resource.file_url.includes("drive.google.com");
  const isPdf = extension === "pdf";
  const isPresentation = extension === "ppt" || extension === "pptx";
  const isNotebook = isNotebookExtension(extension);
  const isCsv = isCsvExtension(extension);
  const isImage = isImageExtension(extension);
  const isCode =
    !isCsv &&
    !isImage &&
    (isCodeExtension(extension) || resource.category === "codes");
  const isTextFetch = isCode || isCsv || isNotebook;
  const embedUrl = useMemo(() => getViewerUrl(resource), [resource]);
  const downloadUrl = useMemo(() => getDirectUrl(resource), [resource]);
  const driveId = useMemo(
    () => getDriveFileId(resource.file_url),
    [resource.file_url],
  );
  const driveViewUrl = driveId
    ? `https://drive.google.com/file/d/${driveId}/view`
    : resource.file_url;

  const colabUrl = driveId
    ? `https://colab.research.google.com/drive/${driveId}`
    : null;
  const imageUrl = driveId
    ? `https://drive.google.com/uc?export=view&id=${driveId}`
    : resource.file_url;

  const FileIcon = isImage
    ? ImageIcon
    : isCsv
      ? Table2
      : isCode
        ? Code2
        : isPresentation
          ? FileSpreadsheet
          : FileText;

  const siblings = useMemo(() => {
    if (assignmentSiblings.length > 0) return assignmentSiblings;
    // Fallback: merge legacy related props
    const seen = new Set<string>();
    const merged: ResourceItem[] = [];
    for (const item of [
      ...relatedWriteups,
      ...relatedCodes,
      ...relatedDatasets,
    ]) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      merged.push(item);
    }
    return merged;
  }, [assignmentSiblings, relatedCodes, relatedWriteups, relatedDatasets]);

  const hasRelatedBar = siblings.length > 0 && !!onOpenRelated;

  const folderLabel = folderLabelFromId(folderIdForResource(resource));
  const trailParts = [
    resource.subject_name,
    folderLabel,
    cleanResourceTitle(resource.title),
  ].filter(Boolean) as string[];

  const containerRef = useRef<HTMLDivElement>(null);
  const downloadRef = useRef<HTMLAnchorElement>(null);
  const externalRef = useRef<HTMLAnchorElement>(null);

  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [codeContent, setCodeContent] = useState<string | null>(null);
  const usesIframePreview =
    !isTextFetch && !isNotebook && !isImage && !!embedUrl;
  const activeIframeSrc = embedUrl;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    setLoadError(false);
    setCodeContent(null);
  }, [embedUrl, resource.file_url, resource.id]);

  useEffect(() => {
    if (!isTextFetch) return;

    let cancelled = false;

    async function loadText() {
      setIsLoading(true);
      setLoadError(false);
      try {
        if (driveId) {
          const user = auth.currentUser;
          const headers: HeadersInit = {};
          if (user) {
            headers.Authorization = `Bearer ${await user.getIdToken()}`;
          }
          const res = await fetch(`/api/resources/code?id=${driveId}`, { headers });
          if (res.status === 413) {
            throw new Error("File too large to preview in-app");
          }
          if (!res.ok) throw new Error("Failed to load file");
          const text = await res.text();
          if (!cancelled) {
            setCodeContent(text);
            setIsLoading(false);
          }
          return;
        }

        const res = await fetch(resource.file_url);
        if (!res.ok) throw new Error("Failed to load file");
        const text = await res.text();
        if (!cancelled) {
          setCodeContent(text);
          setIsLoading(false);
        }
      } catch {
        if (!cancelled) {
          setLoadError(true);
          setIsLoading(false);
        }
      }
    }

    loadText();
    return () => {
      cancelled = true;
    };
  }, [isTextFetch, resource.file_url, driveId]);

  useEffect(() => {
    if (!usesIframePreview || !isLoading) return;
    const timer = setTimeout(() => {
      setLoadError(true);
    }, 20000);
    return () => clearTimeout(timer);
  }, [usesIframePreview, isLoading, activeIframeSrc]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      if (event.key.toLowerCase() === "f") {
        if (!document.fullscreenElement) {
          containerRef.current?.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      }
      if (event.key.toLowerCase() === "d") downloadRef.current?.click();
      if (event.key.toLowerCase() === "o") externalRef.current?.click();

      if (event.key === "Tab") {
        if (!containerRef.current) return;
        const focusableElements = containerRef.current.querySelectorAll(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[
          focusableElements.length - 1
        ] as HTMLElement;

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            event.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            event.preventDefault();
          }
        }
      }
    }

    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    document.documentElement.style.overscrollBehavior = "none";
    window.addEventListener("keydown", handleKeyDown);
    containerRef.current?.focus();

    return () => {
      document.body.style.overflow = "";
      document.body.style.overscrollBehavior = "";
      document.documentElement.style.overscrollBehavior = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const viewerKindLabel = isNotebook
    ? "Notebook"
    : isImage
      ? "Image"
      : isCsv
        ? "Dataset"
        : isCode
          ? `${extension.toUpperCase() || "CODE"} source`
          : isPdf
            ? "PDF"
            : isPresentation
              ? "Presentation"
              : "File";

  const content = (
    <motion.div
      ref={containerRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="viewer-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[100] bg-background outline-none flex flex-col overscroll-none"
    >
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-card border border-border rounded-xl pl-1.5 pr-2.5 py-1.5 shadow-popover max-w-[min(58vw,20rem)]"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface">
          <FileIcon className="h-4 w-4 text-foreground" />
        </div>
        <div className="min-w-0 leading-tight">
          <h2
            id="viewer-title"
            className="truncate text-sm font-semibold text-foreground"
            title={
              resource.category === "notes" || /notes?/i.test(resource.title)
                ? `${resource.title} — Reference only. Not a guarantee of exam content.`
                : resource.title
            }
          >
            {cleanResourceTitle(resource.title)}
          </h2>
          <p
            className="text-[10px] text-muted truncate"
            title={trailParts.join(" / ")}
          >
            {trailParts.slice(0, -1).join(" / ") || viewerKindLabel}
            {trailParts.length > 1 && (
              <span className="ml-1.5 uppercase tracking-wide">
                · {viewerKindLabel}
              </span>
            )}
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-card border border-border rounded-xl p-1 shadow-popover"
      >
        <div className="hidden sm:flex items-center gap-1.5 px-2 border-r border-border/50 mr-0.5 text-[10px] font-semibold tracking-wide text-muted uppercase">
          <span>O</span>
          <span>F</span>
          <span>D</span>
          <span>Esc</span>
        </div>
        {isNotebook && colabUrl && (
          <a
            href={colabUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-semibold text-foreground bg-surface hover:bg-surface-hover border border-border transition-colors"
            title="Open in Google Colab"
          >
            <Play className="h-3.5 w-3.5" />
            Colab
          </a>
        )}
        <a
          ref={externalRef}
          href={isDrive ? driveViewUrl : resource.file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-foreground"
          title="Open in new tab (O)"
          aria-label="Open in new tab"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
        <button
          onClick={() => {
            if (!document.fullscreenElement) {
              containerRef.current?.requestFullscreen().catch(() => {});
            } else {
              document.exitFullscreen().catch(() => {});
            }
          }}
          className="hidden sm:flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-foreground"
          title="Fullscreen (F)"
          aria-label="Fullscreen"
        >
          <Maximize className="h-4 w-4" />
        </button>
        <a
          ref={downloadRef}
          href={downloadUrl}
          download
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-foreground"
          title="Download (D)"
          aria-label="Download"
        >
          <Download className="h-4 w-4" />
        </a>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface/50 text-foreground transition-colors hover:bg-destructive/10 hover:text-destructive border border-transparent hover:border-destructive/20"
          title="Close viewer (Esc)"
          aria-label="Close viewer"
        >
          <X className="h-4 w-4" />
        </button>
      </motion.div>

      <div
        className={`flex-1 w-full h-full p-2 sm:p-3 pt-14 sm:pt-16 relative ${
          hasRelatedBar ? "pb-20 sm:pb-24" : ""
        }`}
      >
        <motion.div
          initial={{ scale: 0.97, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          className="h-full w-full overflow-hidden rounded-2xl border border-border bg-card relative shadow-md"
        >
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-between justify-between p-8 bg-background z-20">
              <div className="w-full flex-1 flex flex-col gap-6 mt-12 max-w-4xl mx-auto">
                <div className="skeleton h-8 rounded-lg w-1/3" />
                <div className="skeleton h-4 rounded-lg w-full" />
                <div className="skeleton h-4 rounded-lg w-5/6" />
                <div className="skeleton h-4 rounded-lg w-4/5" />
                <div className="flex-1 min-h-[200px] border border-border/40 rounded-xl p-6 flex flex-col gap-4">
                  <div className="skeleton h-6 rounded-lg w-1/4" />
                  <div className="skeleton h-40 rounded-lg w-full" />
                  <div className="skeleton h-4 rounded-lg w-3/4" />
                  <div className="skeleton h-4 rounded-lg w-1/2" />
                </div>
              </div>

              <div className="w-full text-center pb-8 flex flex-col items-center gap-3">
                <span className="loading-orb" aria-hidden />
                <p className="text-sm font-medium text-foreground/75 mt-2 tracking-wide">
                  {isNotebook
                    ? "Loading notebook..."
                    : isImage
                      ? "Loading image..."
                      : isCsv
                        ? "Loading dataset..."
                        : isCode
                          ? "Loading source..."
                          : "Preparing document preview..."}
                </p>
                {loadError && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-muted flex flex-col items-center gap-1.5 mt-2"
                  >
                    <span>Having trouble loading?</span>
                    <a
                      href={resource.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground underline underline-offset-4 hover:text-muted transition-colors font-bold inline-flex items-center gap-1"
                    >
                      Open directly <ExternalLink className="h-3 w-3 inline" />
                    </a>
                  </motion.div>
                )}
              </div>
            </div>
          )}

          {isNotebook ? (
            <div className="h-full w-full">
              {codeContent !== null && <NotebookViewer content={codeContent} />}
              {!isLoading && loadError && codeContent === null && (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-center text-muted">
                  <p className="text-sm">Could not load notebook in-app.</p>
                  <a
                    href={resource.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground underline underline-offset-4 text-sm"
                  >
                    Open on Drive
                  </a>
                </div>
              )}
            </div>
          ) : isImage ? (
            <div className="h-full w-full overflow-auto bg-background flex items-center justify-center p-4 sm:p-8">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={cleanResourceTitle(resource.title)}
                className="max-w-full max-h-full object-contain rounded-xl border border-border shadow-sm bg-card"
                onLoad={() => setIsLoading(false)}
                onError={() => {
                  setLoadError(true);
                  setIsLoading(false);
                }}
              />
              {!isLoading && loadError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center text-muted bg-background/80">
                  <p className="text-sm">Could not preview image in-app.</p>
                  <a
                    href={downloadUrl}
                    className="text-foreground underline underline-offset-4 text-sm"
                  >
                    Download image
                  </a>
                </div>
              )}
            </div>
          ) : isCsv ? (
            <div className="h-full w-full">
              {codeContent !== null && <CsvPreview content={codeContent} />}
              {!isLoading && loadError && codeContent === null && (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-center text-muted">
                  <p className="text-sm">Could not load dataset in-app.</p>
                  <a
                    href={downloadUrl}
                    className="text-foreground underline underline-offset-4 text-sm"
                  >
                    Download CSV
                  </a>
                </div>
              )}
            </div>
          ) : isCode ? (
            <div className="h-full w-full overflow-auto bg-[#0c0c0e] p-4 sm:p-6">
              {codeContent !== null && (
                <pre className="text-[12px] sm:text-[13px] leading-relaxed font-mono text-zinc-200 whitespace-pre tab-size-4">
                  <code>{codeContent}</code>
                </pre>
              )}
              {!isLoading && loadError && codeContent === null && (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-center text-zinc-400">
                  <p className="text-sm">Could not load source in-app.</p>
                  <a
                    href={resource.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-100 underline underline-offset-4 text-sm"
                  >
                    Open on Drive
                  </a>
                </div>
              )}
            </div>
          ) : usesIframePreview && activeIframeSrc ? (
            <>
              <iframe
                src={activeIframeSrc}
                title={resource.title}
                className="h-full w-full bg-background"
                loading="eager"
                allow="autoplay; encrypted-media"
                referrerPolicy="no-referrer-when-downgrade"
                onLoad={() => setIsLoading(false)}
              />
              {!isLoading && loadError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center text-muted bg-background/90 z-10 p-6">
                  <p className="text-sm">Preview is taking longer than usual.</p>
                  <a
                    href={isDrive ? driveViewUrl : resource.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground underline underline-offset-4 text-sm inline-flex items-center gap-1"
                  >
                    Open file <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </>
          ) : (
            <div className="h-full w-full flex flex-col items-center justify-center gap-3 text-center text-muted">
              <p className="text-sm">Preview not available in-app.</p>
              <a
                href={isDrive ? driveViewUrl : resource.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline underline-offset-4 text-sm inline-flex items-center gap-1"
              >
                Open file <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </motion.div>
      </div>

      {hasRelatedBar && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          className="absolute bottom-4 inset-x-0 z-10 flex justify-center px-4 pointer-events-none"
        >
          <div className="pointer-events-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-card border border-border rounded-2xl pl-3 pr-1.5 py-1.5 shadow-popover max-w-[min(96vw,48rem)]">
            <RelatedChipRow
              label={folderLabel ? `This assignment` : "Related files"}
              icon={<Code2 className="h-3.5 w-3.5 text-muted" />}
              items={siblings}
              onOpenRelated={onOpenRelated}
            />
          </div>
        </motion.div>
      )}
    </motion.div>
  );

  if (!mounted) return null;
  return createPortal(content, document.body);
}

function siblingIcon(item: ResourceItem) {
  const role = getResourceFileRole(item);
  if (role === "dataset") return <Table2 className="h-3.5 w-3.5 text-muted shrink-0" />;
  if (role === "writeup") return <FileText className="h-3.5 w-3.5 text-muted shrink-0" />;
  if (role === "notebook" || role === "code")
    return <Code2 className="h-3.5 w-3.5 text-muted shrink-0" />;
  return <FileText className="h-3.5 w-3.5 text-muted shrink-0" />;
}

function siblingLabel(item: ResourceItem): string {
  const role = getResourceFileRole(item);
  if (role === "dataset" || role === "notebook" || role === "code") {
    return shortCodeLabel(item.title);
  }
  return cleanResourceTitle(item.title);
}

function RelatedChipRow({
  label,
  icon,
  items,
  onOpenRelated,
}: {
  label: string;
  icon: ReactNode;
  items: ResourceItem[];
  onOpenRelated?: (item: ResourceItem) => void;
}) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex items-center gap-1.5 h-8 shrink-0">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted whitespace-nowrap leading-none">
          {label}
        </span>
      </div>
      <div className="w-px h-4 bg-border shrink-0" />
      <div className="flex items-center flex-wrap gap-1.5 min-w-0">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onOpenRelated?.(item)}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl bg-surface hover:bg-surface-hover border border-border text-xs font-medium text-foreground transition-colors max-w-full leading-none"
            title={item.title}
          >
            {siblingIcon(item)}
            <span className="truncate">{siblingLabel(item)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
