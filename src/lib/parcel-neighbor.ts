import type { Polygon, MultiPolygon } from "geojson";

/**
 * Lahan tetangga (#327) — helper MURNI (tanpa Prisma/Next) agar bisa diuji
 * langsung: ambang jarak, konversi meter→derajat, pemangkasan nama di luar
 * scope, dan cap jumlah. Kueri DB-nya di `parcel-neighbor-query.ts`.
 *
 * "Tetangga" = lahan AKTIF yang terdaftar di MIS dan bersinggungan atau
 * berjarak ≤ NEIGHBOR_DISTANCE_M dari batas lahan (keputusan owner
 * 2026-09-14). Jalan, sungai, kebun perusahaan, dan lahan petani yang belum
 * dipetakan TIDAK akan muncul — untuk itu ada sepadan manual (#326).
 */
export const NEIGHBOR_DISTANCE_M = 25;
/** Ruang legenda di Profil Lahan (PDF); sisanya diringkas "+N lahan lain". */
export const NEIGHBOR_LIMIT_PDF = 12;
/** Peta Detail Lahan di layar. */
export const NEIGHBOR_LIMIT_SCREEN = 50;

/**
 * Meter → derajat pada ekuator (1° ≈ 111,32 km). Dipakai agar `ST_DWithin`
 * bekerja pada kolom geometry (bukan geography) dan tetap memakai GiST.
 * Wilayah kerja (Riau, lintang 0–2°) membuat galatnya < 0,1% — ambang 25 m
 * tidak butuh presisi lebih dari itu.
 */
export const metersToDegrees = (m: number) => m / 111_320;

export interface ParcelNeighbor {
  /** LandParcel.id baris aktif tetangga. */
  id: string;
  parcelId: string;
  geometry: Polygon | MultiPolygon;
  /** Jarak batas-ke-batas (m); 0 = bersinggungan atau tumpang tindih. */
  distanceM: number;
  /** Interior kedua poligon beririsan (bukan sekadar bersentuhan) — indikasi #317. */
  overlaps: boolean;
  /** Selalu diisi, apa pun scope (alat verifikasi lapangan — keputusan owner 2026-09-14). */
  farmerName: string;
  farmerCode: string;
  groupName: string;
  /** Hanya menentukan tautan detail: halaman detail tetangga 404 di luar scope. */
  inScope: boolean;
  /** Milik petani yang sama dengan lahan yang dilihat ("lahan sendiri"). */
  sameFarmer: boolean;
}

/** Baris mentah dari kueri — belum diberi tanda `inScope`. */
export type ParcelNeighborRaw = Omit<ParcelNeighbor, "inScope">;

/**
 * Tandai tetangga yang ada di scope user. Keputusan owner 2026-09-14 (revisi
 * saat review): poligon DAN identitas lengkap (nama, kode petani, ID Lahan,
 * Lembaga) SEMUA tetangga ditampilkan apa pun scope — nama pemilik adalah alat
 * verifikasi di lapangan, sama dengan pengecualian #317 Fase 2. `inScope`
 * hanya menentukan apakah tautan ke halaman detail tetangga boleh dibuka
 * (halaman itu 404 di luar scope). Tercatat di docs/product/access-context.md.
 */
export function applyNeighborScope(rows: ParcelNeighborRaw[], inScopeIds: ReadonlySet<string>): ParcelNeighbor[] {
  return rows.map((r) => ({ ...r, inScope: inScopeIds.has(r.id) }));
}

/** Urut jarak lalu ID lahan, potong ke `limit`; `omitted` = yang tak ikut. */
export function capNeighbors<T extends { distanceM: number; parcelId: string }>(rows: T[], limit: number): { neighbors: T[]; omitted: number } {
  const sorted = [...rows].sort((a, b) => a.distanceM - b.distanceM || a.parcelId.localeCompare(b.parcelId));
  return { neighbors: sorted.slice(0, limit), omitted: Math.max(0, sorted.length - limit) };
}

/** Label pemilik untuk legenda/popup: lahan sendiri ditandai, selain itu nama petani. */
export function neighborOwnerLabel(n: Pick<ParcelNeighbor, "farmerName" | "sameFarmer">): string {
  if (n.sameFarmer) return "Petani ini (lahan sendiri)";
  return n.farmerName;
}
