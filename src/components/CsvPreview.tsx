"use client";

import { useMemo } from "react";

const PREVIEW_ROWS = 30;

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch === "\r") {
      /* skip */
    } else {
      cell += ch;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

export default function CsvPreview({ content }: { content: string }) {
  const { headers, body, totalRows } = useMemo(() => {
    const rows = parseCsv(content);
    if (rows.length === 0) {
      return { headers: [] as string[], body: [] as string[][], totalRows: 0 };
    }
    const [headerRow, ...dataRows] = rows;
    return {
      headers: headerRow,
      body: dataRows.slice(0, PREVIEW_ROWS),
      totalRows: dataRows.length,
    };
  }, [content]);

  if (headers.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-muted">
        Empty or unreadable CSV.
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-auto bg-background">
      <div className="sticky top-0 z-[1] border-b border-border bg-card/95 backdrop-blur px-4 py-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Dataset preview</p>
          <p className="text-[11px] text-muted mt-0.5">
            Showing {Math.min(PREVIEW_ROWS, totalRows)} of {totalRows} rows ·{" "}
            {headers.length} columns
          </p>
        </div>
      </div>
      <div className="p-3 sm:p-4 overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-[12px]">
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th
                  key={i}
                  className="sticky top-[57px] bg-surface border border-border px-2.5 py-2 font-semibold text-foreground whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, ri) => (
              <tr key={ri} className="odd:bg-card even:bg-surface/40">
                {headers.map((_, ci) => (
                  <td
                    key={ci}
                    className="border border-border px-2.5 py-1.5 text-foreground/90 whitespace-nowrap max-w-[14rem] truncate"
                    title={row[ci] ?? ""}
                  >
                    {row[ci] ?? ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
