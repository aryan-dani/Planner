"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, ChevronLeft, MapPin } from "lucide-react";
import type { FacultySeat } from "@/lib/ishani";

interface SeatingClientProps {
  initialSeating: FacultySeat[];
  configured: boolean;
}

export default function SeatingClient({
  initialSeating,
  configured,
}: SeatingClientProps) {
  const [seating, setSeating] = useState(initialSeating);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setSeating(initialSeating);
  }, [initialSeating]);

  useEffect(() => {
    if (!configured) return;
    let cancelled = false;
    (async () => {
      try {
        setRefreshing(true);
        const res = await fetch("/api/campus/faculty-seating");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data.faculty_seating)) {
          setSeating(data.faculty_seating);
        }
      } catch {
        /* keep SSR data */
      } finally {
        if (!cancelled) setRefreshing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [configured]);

  const types = useMemo(() => {
    const set = new Set<string>();
    seating.forEach((s) => {
      const t = String(s.Type || "").trim();
      if (t) set.add(t);
    });
    return Array.from(set).sort();
  }, [seating]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return seating.filter((s) => {
      const typeOk =
        typeFilter === "ALL" ||
        String(s.Type || "").toLowerCase() === typeFilter.toLowerCase();
      if (!typeOk) return false;
      if (!q) return true;
      const hay = [
        s.Name_of_Faculty,
        s.Designation,
        s.Department,
        s.Seating_ID,
        s.Type,
      ]
        .map((v) => String(v || "").toLowerCase())
        .join(" ");
      return hay.includes(q);
    });
  }, [seating, search, typeFilter]);

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 min-h-[80vh]">
      <div className="mb-8 border-b border-border pb-6">
        <Link
          href="/campus"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-foreground transition-colors mb-4"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Campus
        </Link>
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="w-4 h-4 text-foreground shrink-0" />
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted">
            Faculty seating
          </p>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Cabin & seating chart
        </h1>
        <p className="text-sm text-muted mt-1">
          {configured
            ? `${filtered.length} of ${seating.length} entries${refreshing ? " · refreshing…" : ""}`
            : "Campus data unavailable — set ISHANI_API_URL to enable live seating."}
        </p>
      </div>

      {!configured ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/40 px-6 py-16 text-center">
          <p className="text-sm font-medium text-foreground mb-1">
            Campus data unavailable
          </p>
          <p className="text-xs text-muted max-w-sm mx-auto">
            Configure the Ishani API URL on the server to load faculty seating.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, cabin, department…"
                className="w-full bg-surface border border-border rounded-xl pl-9 pr-3 py-2.5 text-sm text-foreground outline-none focus:ring-0 input-premium-focus placeholder:text-muted"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setTypeFilter("ALL")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  typeFilter === "ALL"
                    ? "bg-foreground text-background"
                    : "bg-surface border border-border text-muted hover:text-foreground"
                }`}
              >
                All
              </button>
              {types.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    typeFilter === t
                      ? "bg-foreground text-background"
                      : "bg-surface border border-border text-muted hover:text-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-surface/40 px-6 py-12 text-center text-sm text-muted">
              No seating entries match your filters.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border shadow-sm">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-surface/60 border-b border-border text-left">
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted">
                      Name
                    </th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted">
                      Designation
                    </th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted">
                      Department
                    </th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted">
                      Seating ID
                    </th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted">
                      Type
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filtered.map((row, idx) => (
                    <tr
                      key={`${row.Seating_ID}-${row.Name_of_Faculty}-${idx}`}
                      className="bg-card hover:bg-surface/40 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
                        {String(row.Name_of_Faculty || "—")}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {String(row.Designation || "—")}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {String(row.Department || "—")}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-foreground">
                        {String(row.Seating_ID || "—")}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-surface border border-border text-muted">
                          {String(row.Type || "—")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
