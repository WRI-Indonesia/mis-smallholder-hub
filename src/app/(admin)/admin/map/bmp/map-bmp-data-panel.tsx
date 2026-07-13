"use client";

import { useMemo, useState } from "react";
import { Table2, Minimize2, Search, Crosshair, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { enumeratePeriods } from "@/lib/report-production";
import type { BmpParcelFeature } from "@/types/map";

interface Props {
  parcels: BmpParcelFeature[];
  onZoomTo: (parcel: BmpParcelFeature) => void;
}

type YearGroup = { year: number; months: { period: string; month: number }[] };

/**
 * Right-side floating, minimizable panel listing the loaded parcels with a
 * per-month data-availability grid (filled block = a production record exists
 * for that month) plus a per-row "Zoom to" action.
 */
export function MapBmpDataPanel({ parcels, onZoomTo }: Props) {
  // Default minimized; the matrix below is computed lazily only once opened.
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Global month range across all parcels → year-grouped columns.
  const yearGroups = useMemo<YearGroup[]>(() => {
    if (!open) return [];
    let min: string | null = null;
    let max: string | null = null;
    for (const p of parcels) {
      if (p.firstPeriod && (!min || p.firstPeriod < min)) min = p.firstPeriod;
      if (p.lastPeriod && (!max || p.lastPeriod > max)) max = p.lastPeriod;
    }
    if (!min || !max) return [];
    const groups: YearGroup[] = [];
    for (const period of enumeratePeriods(min, max)) {
      const year = Number(period.slice(0, 4));
      const month = Number(period.slice(5, 7));
      let g = groups.find((x) => x.year === year);
      if (!g) {
        g = { year, months: [] };
        groups.push(g);
      }
      g.months.push({ period, month });
    }
    return groups;
  }, [parcels, open]);

  const filtered = useMemo(() => {
    if (!open) return [];
    const q = search.trim().toLowerCase();
    const rows = q
      ? parcels.filter(
          (p) =>
            p.farmerName.toLowerCase().includes(q) ||
            p.farmerCode.toLowerCase().includes(q) ||
            p.parcelId.toLowerCase().includes(q)
        )
      : parcels;
    return [...rows].sort((a, b) => a.farmerName.localeCompare(b.farmerName, "id"));
  }, [parcels, search, open]);

  if (parcels.length === 0) return null;

  // Minimized → just a floating icon button (Peta Lahan pattern).
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Buka tabel ketersediaan data"
        aria-label="Buka tabel ketersediaan data"
        className="absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-md border bg-primary text-primary-foreground shadow-md backdrop-blur-sm"
      >
        <Table2 className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className="absolute top-4 right-4 z-10 w-[880px] max-w-[calc(100%-2rem)] overflow-hidden rounded-md border bg-background/95 shadow-lg backdrop-blur-sm">
      {/* Header bar with minimize button */}
      <div className="flex w-full items-center justify-between gap-2 px-3 py-2">
        <span className="flex items-center gap-1.5 text-sm font-semibold">
          <Table2 className="h-4 w-4" />
          Ketersediaan Data per Lahan
          <span className="text-muted-foreground">({parcels.length})</span>
        </span>
        <button
          onClick={() => setOpen(false)}
          title="Minimalkan"
          aria-label="Minimalkan"
          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Minimize2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Search */}
          <div className="border-t p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama / ID petani / ID lahan"
                className="h-8 w-full rounded-md border bg-background pr-7 pl-7 text-xs outline-none focus:ring-1 focus:ring-ring"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute top-1/2 right-1.5 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                  title="Hapus"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Matrix */}
          <div className="max-h-[60vh] overflow-auto border-t">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-muted-foreground">Tidak ada lahan.</p>
            ) : (
              <table className="w-full border-separate border-spacing-0 text-xs">
                <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur-sm">
                  <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th rowSpan={2} className="border-b border-r px-2 py-1.5 text-left whitespace-nowrap">Aksi</th>
                    <th rowSpan={2} className="border-b border-r px-2 py-1.5 text-left">Nama</th>
                    <th rowSpan={2} className="border-b border-r px-2 py-1.5 text-left">ID Petani</th>
                    <th rowSpan={2} className="border-b border-r px-2 py-1.5 text-left">ID Lahan</th>
                    {yearGroups.map((g) => (
                      <th
                        key={g.year}
                        colSpan={g.months.length}
                        className="border-b border-r px-1 py-1 text-center font-semibold"
                      >
                        {g.year}
                      </th>
                    ))}
                  </tr>
                  <tr className="text-[10px] text-muted-foreground">
                    {yearGroups.flatMap((g) =>
                      g.months.map((m, i) => (
                        <th
                          key={m.period}
                          className={cn(
                            "border-b px-1 py-1 text-center font-normal tabular-nums",
                            i === g.months.length - 1 && "border-r"
                          )}
                        >
                          {m.month}
                        </th>
                      ))
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
                    const present = new Set(p.periods);
                    return (
                      <tr key={p.id} className="hover:bg-muted/30">
                        <td className="border-b border-r px-2 py-1 whitespace-nowrap">
                          <button
                            onClick={() => onZoomTo(p)}
                            title="Zoom ke lahan"
                            aria-label="Zoom ke lahan"
                            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            <Crosshair className="h-3.5 w-3.5" />
                          </button>
                        </td>
                        <td className="border-b border-r px-2 py-1 font-medium">{p.farmerName}</td>
                        <td className="border-b border-r px-2 py-1 font-mono text-muted-foreground">{p.farmerCode}</td>
                        <td className="border-b border-r px-2 py-1 font-mono text-muted-foreground">{p.parcelId}</td>
                        {yearGroups.flatMap((g) =>
                          g.months.map((m, i) => (
                            <td
                              key={m.period}
                              className={cn(
                                "border-b px-0 py-0 text-center",
                                i === g.months.length - 1 && "border-r"
                              )}
                            >
                              <span
                                className={cn(
                                  "block h-5 w-full min-w-[16px]",
                                  present.has(m.period) ? "bg-emerald-500/80" : "bg-transparent"
                                )}
                                title={`${m.period}: ${present.has(m.period) ? "ada data" : "tidak ada"}`}
                              />
                            </td>
                          ))
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="flex items-center gap-2 border-t px-3 py-1.5 text-[10px] text-muted-foreground">
            <span className="inline-block h-3 w-3 rounded-sm bg-emerald-500/80" />
            Ada data produksi
            <span className="ml-2 inline-block h-3 w-3 rounded-sm border" />
            Tidak ada
          </div>
    </div>
  );
}
