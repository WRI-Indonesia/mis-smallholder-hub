import { useMemo, useState } from "react";
import { AVAILABILITY_DOMAIN_LABELS, bandDistribution, domainScoreOf } from "@/lib/data-availability-aggregation";
import type { AvailabilityDomainKey, AvailabilityGroupEntry } from "@/types/dashboard";

/**
 * Urutan & pencarian baris DA-03 — satu sumber untuk heatmap dan sidik jari
 * radar (#352 putaran 4) supaya kunci `?urut=`/`?arah=` dari kartu domain
 * menghasilkan urutan yang sama di kedua tampilan.
 */
export type MatrixSortKey = "name" | "totalFarmers" | "health" | AvailabilityDomainKey;

export function filterMatrixRows(rows: AvailabilityGroupEntry[], query: string): AvailabilityGroupEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter(
    (e) => e.name.toLowerCase().includes(q) || (e.code ?? "").toLowerCase().includes(q) || e.districtName.toLowerCase().includes(q),
  );
}

export function sortMatrixRows(rows: AvailabilityGroupEntry[], sortKey: MatrixSortKey, asc: boolean): AvailabilityGroupEntry[] {
  const value = (e: AvailabilityGroupEntry): string | number => {
    if (sortKey === "name") return e.name.toLowerCase();
    if (sortKey === "totalFarmers") return e.totalFarmers;
    if (sortKey === "health") return e.healthScore;
    return domainScoreOf(e, sortKey);
  };
  return [...rows].sort((a, b) => {
    const va = value(a);
    const vb = value(b);
    const cmp = typeof va === "string" ? va.localeCompare(vb as string) : (va as number) - (vb as number);
    return asc ? cmp : -cmp;
  });
}

/** Label kunci urut untuk teks "urut … menaik/menurun". */
export function sortKeyLabel(sortKey: MatrixSortKey): string {
  if (sortKey === "health") return "skor total";
  if (sortKey === "name") return "nama";
  if (sortKey === "totalFarmers") return "jumlah petani";
  return AVAILABILITY_DOMAIN_LABELS[sortKey].toLowerCase();
}

/** Batas tampilan "Ringkas": 10 baris/kartu pertama menurut urutan aktif. */
export const LOWEST_N = 10;

/**
 * State bersama heatmap & radar (review #352 putaran 4: sebelumnya disalin):
 * kotak cari, toggle Ringkas/semua, hasil urut+saring, jumlah tersembunyi,
 * jumlah Lembaga kritis untuk ringkasan header.
 */
export function useMatrixRows(rows: AvailabilityGroupEntry[], sortKey: MatrixSortKey, sortAsc: boolean) {
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(true);
  const sorted = useMemo(() => sortMatrixRows(filterMatrixRows(rows, query), sortKey, sortAsc), [rows, query, sortKey, sortAsc]);
  const limited = showAll || query ? sorted : sorted.slice(0, LOWEST_N);
  return {
    query,
    setQuery,
    showAll,
    setShowAll,
    sorted,
    limited,
    hiddenCount: sorted.length - limited.length,
    critical: bandDistribution(rows).bad,
    /** Toggle Ringkas hanya relevan tanpa pencarian dan bila ada yang bisa disembunyikan. */
    canLimit: !query && sorted.length > LOWEST_N,
  };
}
