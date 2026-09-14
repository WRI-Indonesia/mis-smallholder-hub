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
  /** null bila tetangga di luar scope user — dibuang di SERVER, bukan disembunyikan di UI. */
  farmerName: string | null;
  farmerCode: string | null;
  /** Nama Lembaga selalu ada — label pengganti nama untuk tetangga di luar scope. */
  groupName: string;
  inScope: boolean;
  /** Milik petani yang sama dengan lahan yang dilihat ("lahan sendiri"). */
  sameFarmer: boolean;
}

/** Baris mentah dari kueri — nama masih lengkap, scope belum diterapkan. */
export interface ParcelNeighborRaw extends Omit<ParcelNeighbor, "inScope" | "farmerName" | "farmerCode"> {
  farmerName: string;
  farmerCode: string;
}

/**
 * Terapkan aturan scope (keputusan owner 2026-09-14): poligon SEMUA tetangga
 * tetap digambar, tetapi nama & kode petani hanya untuk yang ada di scope
 * user; di luar scope tinggal nama Lembaga. Pengecualian scope ini lebih
 * konservatif daripada #317 Fase 2 (yang menampilkan sisi lawan lengkap untuk
 * verifikasi tumpang tindih) karena Profil Lahan bisa dicetak siapa pun
 * yang punya akses menu Lahan/Peta/Petani. Tercatat di
 * docs/product/access-context.md.
 */
export function applyNeighborScope(rows: ParcelNeighborRaw[], inScopeIds: ReadonlySet<string>): ParcelNeighbor[] {
  return rows.map((r) => {
    const inScope = inScopeIds.has(r.id);
    return {
      ...r,
      inScope,
      farmerName: inScope ? r.farmerName : null,
      farmerCode: inScope ? r.farmerCode : null,
    };
  });
}

/** Urut jarak lalu ID lahan, potong ke `limit`; `omitted` = yang tak ikut. */
export function capNeighbors<T extends { distanceM: number; parcelId: string }>(rows: T[], limit: number): { neighbors: T[]; omitted: number } {
  const sorted = [...rows].sort((a, b) => a.distanceM - b.distanceM || a.parcelId.localeCompare(b.parcelId));
  return { neighbors: sorted.slice(0, limit), omitted: Math.max(0, sorted.length - limit) };
}

/** Label pemilik untuk legenda/popup: nama petani bila dalam scope, selain itu "—". */
export function neighborOwnerLabel(n: Pick<ParcelNeighbor, "farmerName" | "sameFarmer">): string {
  if (n.sameFarmer) return "Petani ini (lahan sendiri)";
  return n.farmerName ?? "—";
}
