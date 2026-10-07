/**
 * Tumpang Tindih Lahan (#317 Fase 2) — tab **Luar Boundary** & **Selisih Luas**.
 * Helper MURNI (tanpa Prisma/Next) agar bisa diuji langsung; kueri DB-nya di
 * `src/server/actions/parcel-boundary-area.ts`.
 *
 * SATU DEFINISI dengan check kualitas DA-02 (Ketersediaan Data,
 * `src/lib/data-completeness.ts`):
 * - "Sepenuhnya di luar" = poligon tidak beririsan dengan satu pun boundary ICS
 *   Lembaganya (= `persil-di-luar-boundary`). "Sebagian" menambah lahan yang
 *   beririsan tetapi sebagiannya keluar — ambang buangnya sama dengan irisan
 *   tumpang tindih (< 100 m² DAN < 1% dibuang), agar tepi boundary tak berisik.
 * - Selisih luas = |kolom − poligon| ÷ yang lebih besar > `PARCEL_AREA_MISMATCH_RATIO`
 *   (= `luas-beda-geometri`). Desain awal #317 menyebut 25%; disamakan ke DA-02
 *   (20%) agar angka di dua menu sama — selisihnya 4 lahan (mis-dev 2026-10-07).
 *
 * Luas poligon dihitung PostGIS `ST_Area(::geography)`; luas "kolom" = `LandParcel.area`
 * (dari atribut shapefile, bukan hitungan geometri).
 */
import { PARCEL_AREA_MISMATCH_RATIO } from "@/lib/data-completeness-registry";
import { OVERLAP_MIN_AREA_M2, OVERLAP_MIN_PCT } from "@/lib/parcel-overlap";

export { PARCEL_AREA_MISMATCH_RATIO };

/** Lahan-lahan temuan ditampilkan bersama identitasnya (sisi tunggal, scope normal). */
export interface ParcelFindingBase {
  /** LandParcel.id baris aktif. */
  id: string;
  parcelId: string;
  kelompokTani: string | null;
  farmerId: string;
  farmerCode: string;
  farmerName: string;
  groupId: string;
  groupName: string;
  districtId: string;
  districtName: string;
  /** Luas poligon PostGIS (ha). */
  polygonHa: number;
}

export const OUTSIDE_KINDS = ["FULL", "PARTIAL"] as const;
export type OutsideKind = (typeof OUTSIDE_KINDS)[number];
export const OUTSIDE_KIND_LABEL: Record<OutsideKind, string> = {
  FULL: "Sepenuhnya di luar",
  PARTIAL: "Sebagian di luar",
};
export const OUTSIDE_KIND_HINT: Record<OutsideKind, string> = {
  FULL: "Poligon tidak beririsan sama sekali dengan boundary ICS Lembaganya — angka yang sama dengan check Ketersediaan Data.",
  PARTIAL: `Poligon beririsan dengan boundary, tetapi sebagiannya keluar (≥ ${OVERLAP_MIN_AREA_M2} m² atau ≥ ${OVERLAP_MIN_PCT}% luas lahan).`,
};

export interface OutsideBoundaryRow extends ParcelFindingBase {
  kind: OutsideKind;
  outsideHa: number;
  /** % luas poligon yang berada di luar boundary (100 untuk FULL). */
  outsidePct: number;
  /** Jarak terdekat ke boundary (m) — hanya FULL. */
  distanceM: number | null;
}

export interface OutsideBoundaryRaw extends Omit<ParcelFindingBase, "polygonHa"> {
  polygonM2: number;
  /** Poligon beririsan dengan boundary Lembaganya (`ST_Intersects`). */
  intersects: boolean;
  /** Luas di luar boundary (m²) — `ST_Difference`; untuk yang tak beririsan = seluruh poligon. */
  outsideM2: number;
  distanceM: number | null;
}

/**
 * Jenis temuan, atau `null` bila bukan temuan: tak beririsan = FULL (definisi DA-02);
 * beririsan tetapi bagian luarnya ≥ 100 m² ATAU ≥ 1% = PARTIAL (aturan buang sama
 * dengan irisan tumpang tindih — < 100 m² DAN < 1% dianggap tepi).
 */
export function outsideKind(polygonM2: number, outsideM2: number, intersects: boolean): OutsideKind | null {
  if (!intersects) return "FULL";
  if (polygonM2 <= 0 || outsideM2 <= 0) return null;
  const pct = (outsideM2 / polygonM2) * 100;
  return outsideM2 < OVERLAP_MIN_AREA_M2 && pct < OVERLAP_MIN_PCT ? null : "PARTIAL";
}

const round = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d;

export function buildOutsideBoundaryRows(raws: OutsideBoundaryRaw[]): OutsideBoundaryRow[] {
  const rows: OutsideBoundaryRow[] = [];
  for (const r of raws) {
    const kind = outsideKind(r.polygonM2, r.outsideM2, r.intersects);
    if (!kind) continue;
    const { polygonM2, outsideM2 } = r;
    rows.push({
      id: r.id, parcelId: r.parcelId, kelompokTani: r.kelompokTani,
      farmerId: r.farmerId, farmerCode: r.farmerCode, farmerName: r.farmerName,
      groupId: r.groupId, groupName: r.groupName, districtId: r.districtId, districtName: r.districtName,
      polygonHa: round(polygonM2 / 10_000, 4),
      kind,
      outsideHa: round((kind === "FULL" ? polygonM2 : outsideM2) / 10_000, 4),
      outsidePct: kind === "FULL" ? 100 : round(Math.min(100, (outsideM2 / polygonM2) * 100), 1),
      distanceM: kind === "FULL" && r.distanceM != null ? Math.round(r.distanceM) : null,
    });
  }
  // Sepenuhnya dulu, lalu yang paling banyak keluar.
  return rows.sort((a, b) => (a.kind === b.kind ? b.outsidePct - a.outsidePct || (b.distanceM ?? 0) - (a.distanceM ?? 0) : a.kind === "FULL" ? -1 : 1));
}

export interface AreaMismatchRow extends ParcelFindingBase {
  /** Luas kolom `LandParcel.area` (ha). */
  recordedHa: number;
  /** |kolom − poligon| ÷ yang lebih besar × 100 (definisi DA-02). */
  diffPct: number;
  /** Kolom lebih besar dari poligon (true) atau lebih kecil (false). */
  recordedLarger: boolean;
}

/** Rasio selisih DA-02, atau `null` bila salah satu luas tak ada/≤ 0. */
export function areaMismatchRatio(recordedHa: number | null, polygonHa: number | null): number | null {
  if (recordedHa == null || polygonHa == null || recordedHa <= 0 || polygonHa <= 0) return null;
  return Math.abs(recordedHa - polygonHa) / Math.max(recordedHa, polygonHa);
}

export function isAreaMismatch(recordedHa: number | null, polygonHa: number | null): boolean {
  const r = areaMismatchRatio(recordedHa, polygonHa);
  return r != null && r > PARCEL_AREA_MISMATCH_RATIO;
}

export interface AreaMismatchRaw extends Omit<ParcelFindingBase, "polygonHa"> {
  recordedHa: number;
  polygonM2: number;
}

export function buildAreaMismatchRows(raws: AreaMismatchRaw[]): AreaMismatchRow[] {
  const rows: AreaMismatchRow[] = [];
  for (const r of raws) {
    const polygonHa = r.polygonM2 / 10_000;
    const ratio = areaMismatchRatio(r.recordedHa, polygonHa);
    if (ratio == null || ratio <= PARCEL_AREA_MISMATCH_RATIO) continue;
    rows.push({
      id: r.id, parcelId: r.parcelId, kelompokTani: r.kelompokTani,
      farmerId: r.farmerId, farmerCode: r.farmerCode, farmerName: r.farmerName,
      groupId: r.groupId, groupName: r.groupName, districtId: r.districtId, districtName: r.districtName,
      recordedHa: r.recordedHa,
      polygonHa: round(polygonHa, 4),
      diffPct: round(ratio * 100, 1),
      recordedLarger: r.recordedHa > polygonHa,
    });
  }
  return rows.sort((a, b) => b.diffPct - a.diffPct);
}

/** Jumlah temuan per Lembaga, terbanyak dulu — ringkasan atas tab Luar Boundary. */
export function findingsByGroup<T extends ParcelFindingBase>(rows: T[]): { groupId: string; groupName: string; count: number }[] {
  const m = new Map<string, { groupId: string; groupName: string; count: number }>();
  for (const r of rows) {
    const e = m.get(r.groupId) ?? { groupId: r.groupId, groupName: r.groupName, count: 0 };
    e.count += 1;
    m.set(r.groupId, e);
  }
  return [...m.values()].sort((a, b) => b.count - a.count || a.groupName.localeCompare(b.groupName, "id"));
}

/** Porsi (%) temuan yang ada di `top` Lembaga terbanyak — dasar peringatan "cek boundary-nya dulu". */
export function topGroupsShare(byGroup: { count: number }[], top = 3): number {
  const total = byGroup.reduce((s, g) => s + g.count, 0);
  if (total === 0) return 0;
  return Math.round((byGroup.slice(0, top).reduce((s, g) => s + g.count, 0) / total) * 100);
}

/** Opsi filter Lembaga/Distrik dari temuan itu sendiri, urut nama. */
export function findingFilterOptions(rows: ParcelFindingBase[]): {
  groups: { id: string; name: string }[];
  districts: { id: string; name: string }[];
} {
  const groups = new Map<string, string>();
  const districts = new Map<string, string>();
  for (const r of rows) {
    groups.set(r.groupId, r.groupName);
    districts.set(r.districtId, r.districtName);
  }
  const sorted = (m: Map<string, string>) =>
    [...m].map(([id, name]) => ({ id, name })).sort((x, y) => x.name.localeCompare(y.name, "id"));
  return { groups: sorted(groups), districts: sorted(districts) };
}

export function parseOutsideKind(v: string | null | undefined): OutsideKind | null {
  return (OUTSIDE_KINDS as readonly string[]).includes(v ?? "") ? (v as OutsideKind) : null;
}

/** Halaman Tumpang Tindih Lahan: tab aktif di `?tab=` (bawaan = tumpang tindih). */
export const TOPOLOGY_TABS = ["tumpang-tindih", "luar-boundary", "selisih-luas"] as const;
export type TopologyTab = (typeof TOPOLOGY_TABS)[number];
export function parseTopologyTab(v: string | null | undefined): TopologyTab {
  return (TOPOLOGY_TABS as readonly string[]).includes(v ?? "") ? (v as TopologyTab) : "tumpang-tindih";
}
