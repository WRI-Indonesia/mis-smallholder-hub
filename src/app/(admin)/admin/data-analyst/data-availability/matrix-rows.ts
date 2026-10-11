import { useMemo } from "react";
import { AVAILABILITY_DOMAIN_LABELS, domainScoreOf } from "@/lib/data-availability-aggregation";
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

/** Spasi saja = bukan pencarian (selaras `filterMatrixRows` yang men-trim). */
export const isSearching = (query: string) => query.trim().length > 0;

/** Baris yang ditampilkan: semua bila "Tampilkan semua" atau sedang mencari, selainnya `LOWEST_N` pertama. */
export const limitRows = <T,>(sorted: T[], showAll: boolean, searching: boolean): T[] => (showAll || searching ? sorted : sorted.slice(0, LOWEST_N));

/** Toggle Ringkas hanya relevan tanpa pencarian dan bila ada yang bisa disembunyikan. */
export const canLimitRows = (total: number, searching: boolean) => !searching && total > LOWEST_N;

/** Kunci urut tampilan Cakupan modul (#417 B): "name" atau kunci modul MODULE_CATALOG. URL: `?urut=modul:<key>`. */
export type ModuleSortKey = "name" | string;
export const MODULE_SORT_PREFIX = "modul:";

/** Urut baris Cakupan modul — modul "belum dimulai" selalu di bawah apa pun arahnya (bukan disamakan dengan 0 %). */
export function sortModuleRows(rows: AvailabilityGroupEntry[], sortKey: ModuleSortKey, asc: boolean): AvailabilityGroupEntry[] {
  if (sortKey === "name") return [...rows].sort((a, b) => (asc ? 1 : -1) * a.name.localeCompare(b.name));
  const pct = (e: AvailabilityGroupEntry) => e.moduleCoverage.find((x) => x.key === sortKey)?.pct ?? null;
  return [...rows].sort((a, b) => {
    const va = pct(a);
    const vb = pct(b);
    if (va == null && vb == null) return a.name.localeCompare(b.name);
    if (va == null) return 1;
    if (vb == null) return -1;
    return (asc ? 1 : -1) * (va - vb) || a.name.localeCompare(b.name);
  });
}

/**
 * Hasil baris bersama ketiga tampilan (#417 B): cari & Ringkas kini milik
 * pemanggil (satu toolbar untuk radar · heatmap · modul), hook ini hanya
 * menyaring, mengurutkan, dan memotong. Bawaan Ringkas 10 (K2) diatur pemanggil.
 */
export function useMatrixRows(
  rows: AvailabilityGroupEntry[],
  sort: (rows: AvailabilityGroupEntry[]) => AvailabilityGroupEntry[],
  query: string,
  showAll: boolean,
) {
  const searching = isSearching(query);
  const sorted = useMemo(() => sort(filterMatrixRows(rows, query)), [rows, query, sort]);
  const limited = limitRows(sorted, showAll, searching);
  return {
    searching,
    sorted,
    limited,
    hiddenCount: sorted.length - limited.length,
    canLimit: canLimitRows(sorted.length, searching),
  };
}
