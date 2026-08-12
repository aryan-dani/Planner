"use client";

import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy } from "lucide-react";

type NotebookOutput = {
  output_type?: string;
  text?: string | string[];
  data?: Record<string, string | string[]>;
  ename?: string;
  evalue?: string;
  traceback?: string[];
};

type NotebookCell = {
  cell_type?: string;
  source?: string | string[];
  outputs?: NotebookOutput[];
  execution_count?: number | null;
};

type NotebookDoc = {
  cells?: NotebookCell[];
};

function joinSource(source: string | string[] | undefined): string {
  if (!source) return "";
  return Array.isArray(source) ? source.join("") : source;
}

function mimeText(value: string | string[] | undefined): string {
  if (!value) return "";
  return Array.isArray(value) ? value.join("") : value;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* ignore */
        }
      }}
      className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wide text-zinc-400 hover:text-zinc-100 hover:bg-white/5 border border-transparent hover:border-white/10 transition-colors"
      title="Copy cell"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-400" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function CellOutputs({ outputs }: { outputs: NotebookOutput[] }) {
  if (!outputs?.length) return null;

  return (
    <div className="border-t border-white/5 bg-[#0a0a0c]">
      {outputs.map((output, idx) => {
        if (output.output_type === "stream") {
          const text = mimeText(output.text);
          if (!text.trim()) return null;
          return (
            <pre
              key={idx}
              className="px-4 py-3 text-[12px] leading-relaxed font-mono text-zinc-300 whitespace-pre-wrap overflow-x-auto"
            >
              {text}
            </pre>
          );
        }

        if (
          output.output_type === "execute_result" ||
          output.output_type === "display_data"
        ) {
          const data = output.data || {};
          const png = mimeText(data["image/png"]);
          const jpeg = mimeText(data["image/jpeg"]);
          const html = mimeText(data["text/html"]);
          const plain = mimeText(data["text/plain"]);

          return (
            <div key={idx} className="px-4 py-3 space-y-3 overflow-x-auto">
              {png && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`data:image/png;base64,${png}`}
                  alt="Notebook output"
                  className="max-w-full rounded-lg border border-white/10 bg-white"
                />
              )}
              {!png && jpeg && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`data:image/jpeg;base64,${jpeg}`}
                  alt="Notebook output"
                  className="max-w-full rounded-lg border border-white/10 bg-white"
                />
              )}
              {html && plain && (
                <pre className="text-[12px] leading-relaxed font-mono text-zinc-300 whitespace-pre-wrap">
                  {plain}
                </pre>
              )}
              {html && !plain && (
                <pre className="text-[12px] leading-relaxed font-mono text-zinc-400 whitespace-pre-wrap opacity-80">
                  [HTML output omitted for security]
                </pre>
              )}
              {!png && !jpeg && !html && plain && (
                <pre className="text-[12px] leading-relaxed font-mono text-zinc-300 whitespace-pre-wrap">
                  {plain}
                </pre>
              )}
            </div>
          );
        }

        if (output.output_type === "error") {
          return (
            <pre
              key={idx}
              className="px-4 py-3 text-[12px] leading-relaxed font-mono text-red-300 whitespace-pre-wrap overflow-x-auto"
            >
              {output.ename}: {output.evalue}
              {"\n"}
              {(output.traceback || []).join("\n")}
            </pre>
          );
        }

        return null;
      })}
    </div>
  );
}

export default function NotebookViewer({ content }: { content: string }) {
  const cells = useMemo(() => {
    try {
      const doc = JSON.parse(content) as NotebookDoc;
      return Array.isArray(doc.cells) ? doc.cells : [];
    } catch {
      return null;
    }
  }, [content]);

  if (!cells) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-zinc-400">
        Could not parse this notebook.
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-auto bg-[#0c0c0e]">
      <div className="max-w-4xl mx-auto py-6 px-3 sm:px-6 space-y-4">
        {cells.map((cell, index) => {
          const source = joinSource(cell.source);
          if (cell.cell_type === "markdown") {
            if (!source.trim()) return null;
            return (
              <div
                key={index}
                className="rounded-xl border border-white/10 bg-[#121216] px-4 py-4 sm:px-5"
              >
                <div className="prose prose-invert prose-sm max-w-none prose-headings:text-zinc-100 prose-p:text-zinc-300 prose-strong:text-zinc-100 prose-a:text-sky-300 prose-code:text-zinc-200 prose-pre:bg-black/40">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {source}
                  </ReactMarkdown>
                </div>
              </div>
            );
          }

          if (cell.cell_type === "code") {
            const exec =
              cell.execution_count != null ? `[${cell.execution_count}]` : "[ ]";
            return (
              <div
                key={index}
                className="rounded-xl border border-white/10 overflow-hidden bg-[#101014]"
              >
                <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-white/5 bg-black/30">
                  <span className="text-[10px] font-mono font-bold text-sky-400/90 tracking-wide">
                    In {exec}
                  </span>
                  <CopyButton text={source} />
                </div>
                <pre className="px-4 py-3 text-[12px] sm:text-[13px] leading-relaxed font-mono text-zinc-200 whitespace-pre-wrap overflow-x-auto">
                  <code>{source}</code>
                </pre>
                <CellOutputs outputs={cell.outputs || []} />
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}
