"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";
import { BAND_THRESHOLDS } from "@/lib/data-availability-aggregation";
import { isSearching, LOWEST_N, sortKeyLabel, type MatrixSortKey } from "./matrix-rows";

/** Kotak cari Lembaga / kode / distrik — sama di heatmap & radar. */
export function MatrixSearch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Cari Lembaga / kode / distrik"
        className="h-8 w-[220px] pl-8 text-xs"
        aria-label="Cari Lembaga"
      />
    </div>
  );
}

/** Tombol "Ringkas — 10 … pertama saja" / "Tampilkan semua (n) — m tersembunyi"; `unit` = "baris" | "kartu". */
export function MatrixLimitToggle({
  showAll,
  onToggle,
  total,
  hiddenCount,
  sortKey,
  sortAsc,
  unit,
}: {
  showAll: boolean;
  onToggle: () => void;
  total: number;
  hiddenCount: number;
  sortKey: MatrixSortKey;
  sortAsc: boolean;
  unit: "baris" | "kartu";
}) {
  return (
    <Button variant="ghost" size="sm" className="h-7" onClick={onToggle}>
      {showAll
        ? `Ringkas — ${LOWEST_N} ${unit} pertama saja (urut ${sortKeyLabel(sortKey)} ${sortAsc ? "menaik" : "menurun"})`
        : `Tampilkan semua (${formatNumber(total)}) — ${formatNumber(hiddenCount)} tersembunyi`}
    </Button>
  );
}

/** Keadaan kosong bersama (spasi saja = bukan pencarian, selaras `isSearching`). */
export const emptyRowsMessage = (query: string) =>
  isSearching(query) ? `Tidak ada Lembaga yang cocok dengan "${query.trim()}".` : "Tidak ada Lembaga Petani pada filter ini.";

/** Ringkasan header: "{n} Lembaga · {k} berskor kritis (<50)" — satu sumber untuk heatmap & radar. */
export const rowsSummary = (total: number, critical: number) =>
  `${formatNumber(total)} Lembaga${critical > 0 ? ` · ${formatNumber(critical)} berskor kritis (<${BAND_THRESHOLDS.warn})` : ""}`;
