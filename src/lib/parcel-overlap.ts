/**
 * Tumpang tindih lahan (#317 Fase 2, tab Tumpang Tindih) — helper MURNI (tanpa
 * Prisma/Next) agar bisa diuji langsung: ambang buang, persen, jenis pasangan,
 * label, dan filter halaman. Kueri DB-nya di `src/server/actions/parcel-overlap.ts`.
 *
 * Persen dasar = luas irisan ÷ luas lahan yang LEBIH KECIL (keputusan owner
 * 2026-09-23); % terhadap masing-masing lahan ikut ditampilkan. Semua luas
 * dihitung PostGIS `ST_Area(::geography)` dari poligon, bukan kolom `area`.
 */

/** Irisan dibuang bila luasnya < 100 m² DAN < 1% lahan terkecil (keputusan #317). */
export const OVERLAP_MIN_AREA_M2 = 100;
export const OVERLAP_MIN_PCT = 1;
/** Di atas ambang ini (terhadap lahan terkecil) lahan dianggap "Duplikat"/"Tercakup". */
export const OVERLAP_DUPLICATE_PCT = 90;

/**
 * Pilihan filter persen (terhadap lahan terkecil). "all" = semua temuan yang
 * lolos ambang buang — sekaligus bawaan (keputusan owner 2026-09-23; irisan
 * tepi < 100 m² dan < 1% sudah dibuang ambang, jadi "Semua" tidak berisik).
 */
export const OVERLAP_PCT_OPTIONS = ["all", "10", "25", "50", "75", "90"] as const;
export type OverlapPctOption = (typeof OVERLAP_PCT_OPTIONS)[number];
export const OVERLAP_PCT_DEFAULT: OverlapPctOption = "all";

export const OVERLAP_KINDS = ["SAME_FARMER", "SAME_GROUP", "CROSS_GROUP"] as const;
export type OverlapKind = (typeof OVERLAP_KINDS)[number];
export const OVERLAP_KIND_LABEL: Record<OverlapKind, string> = {
  SAME_FARMER: "Petani sama",
  SAME_GROUP: "Beda petani, satu Lembaga",
  CROSS_GROUP: "Lintas Lembaga",
};

/**
 * Label tingkat irisan. Terukur 2026-09-23 (mis-dev): dari 70 pasangan >90%
 * terhadap lahan terkecil, hanya 25 yang juga >90% terhadap lahan besar —
 * sisanya lahan kecil yang berada DI DALAM lahan besar. Keduanya perlu tindak
 * lanjut berbeda (gabung entri ganda vs cek batas), jadi labelnya dipisah.
 */
export const OVERLAP_LEVELS = ["DUPLICATE", "CONTAINED", "PARTIAL"] as const;
export type OverlapLevel = (typeof OVERLAP_LEVELS)[number];
export const OVERLAP_LEVEL_LABEL: Record<OverlapLevel, string> = {
  DUPLICATE: "Duplikat",
  CONTAINED: "Tercakup",
  PARTIAL: "Sebagian",
};
/** Arti tiap label — tooltip badge di halaman (satu sumber dengan tutorial Bantuan). */
export const OVERLAP_LEVEL_HINT: Record<OverlapLevel, string> = {
  DUPLICATE: `Irisan > ${OVERLAP_DUPLICATE_PCT}% dari kedua lahan — poligon hampir identik, umumnya entri ganda.`,
  CONTAINED: `Lahan kecil > ${OVERLAP_DUPLICATE_PCT}% berada di dalam lahan yang lebih besar — cek pemecahan lahan atau batasnya.`,
  PARTIAL: "Hanya sebagian lahan yang menumpuk — cek batas di lapangan.",
};

export interface OverlapSide {
  /** LandParcel.id baris aktif. */
  id: string;
  parcelId: string;
  /** Kelompok Tani per lahan (`sub_group_lv2`). */
  kelompokTani: string | null;
  farmerId: string;
  farmerCode: string;
  farmerName: string;
  groupId: string;
  groupName: string;
  districtId: string;
  districtName: string;
  /** Luas poligon (ha), hasil `ST_Area(::geography)`. */
  areaHa: number;
  /** Luas irisan ÷ luas lahan ini (%). */
  pct: number;
  /** Lahan di scope user — hanya menentukan tautan Detail Lahan (lihat action). */
  inScope: boolean;
}

export interface ParcelOverlapRow {
  /** Kunci pasangan stabil: `${a.id}|${b.id}` dengan a.id < b.id. */
  key: string;
  a: OverlapSide;
  b: OverlapSide;
  intersectionHa: number;
  /** % terhadap lahan yang lebih kecil = max(a.pct, b.pct). */
  pctMin: number;
  kind: OverlapKind;
  level: OverlapLevel;
}

/** Baris mentah hasil kueri (luas dalam m²) sebelum dihitung persen/jenis. */
export interface OverlapRaw {
  intersectionM2: number;
  a: Omit<OverlapSide, "areaHa" | "pct" | "inScope"> & { areaM2: number };
  b: Omit<OverlapSide, "areaHa" | "pct" | "inScope"> & { areaM2: number };
}

const round = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d;
const pctOf = (part: number, whole: number) => (whole > 0 ? Math.min(100, (part / whole) * 100) : 0);

/** Buang irisan kecil di batas lahan: < 100 m² DAN < 1% lahan terkecil. */
export function isNegligibleOverlap(intersectionM2: number, smallerAreaM2: number): boolean {
  return intersectionM2 < OVERLAP_MIN_AREA_M2 && pctOf(intersectionM2, smallerAreaM2) < OVERLAP_MIN_PCT;
}

export function overlapKind(a: { farmerId: string; groupId: string }, b: { farmerId: string; groupId: string }): OverlapKind {
  if (a.farmerId === b.farmerId) return "SAME_FARMER";
  return a.groupId === b.groupId ? "SAME_GROUP" : "CROSS_GROUP";
}

export function overlapLevel(pctOfSmaller: number, pctOfLarger: number): OverlapLevel {
  if (pctOfSmaller <= OVERLAP_DUPLICATE_PCT) return "PARTIAL";
  return pctOfLarger > OVERLAP_DUPLICATE_PCT ? "DUPLICATE" : "CONTAINED";
}

/**
 * Rakit baris tampilan dari baris mentah: persen per sisi, jenis, label, lalu
 * buang irisan yang tak berarti. Urutan: % terbesar dulu, lalu luas irisan.
 */
export function buildOverlapRows(raws: OverlapRaw[], inScopeIds: ReadonlySet<string>): ParcelOverlapRow[] {
  const rows: ParcelOverlapRow[] = [];
  for (const r of raws) {
    const smaller = Math.min(r.a.areaM2, r.b.areaM2);
    if (isNegligibleOverlap(r.intersectionM2, smaller)) continue;
    const side = (s: OverlapRaw["a"]): OverlapSide => {
      const { areaM2, ...rest } = s;
      return { ...rest, areaHa: round(areaM2 / 10_000, 4), pct: round(pctOf(r.intersectionM2, areaM2), 1), inScope: inScopeIds.has(s.id) };
    };
    const a = side(r.a);
    const b = side(r.b);
    const pctMin = Math.max(a.pct, b.pct);
    rows.push({
      key: `${a.id}|${b.id}`,
      a,
      b,
      intersectionHa: round(r.intersectionM2 / 10_000, 4),
      pctMin,
      kind: overlapKind(a, b),
      level: overlapLevel(pctMin, Math.min(a.pct, b.pct)),
    });
  }
  return rows.sort((x, y) => y.pctMin - x.pctMin || y.intersectionHa - x.intersectionHa || x.key.localeCompare(y.key));
}

export interface OverlapFilters {
  pct: OverlapPctOption;
  kind: OverlapKind | null;
  level: OverlapLevel | null;
  /** Cocok bila SALAH SATU sisi di Lembaga/Kabupaten ini. */
  groupId: string | null;
  districtId: string | null;
}

/** Nilai `?persen=` dari URL → opsi valid (tak dikenal → bawaan). */
export function parsePctOption(v: string | null | undefined): OverlapPctOption {
  return (OVERLAP_PCT_OPTIONS as readonly string[]).includes(v ?? "") ? (v as OverlapPctOption) : OVERLAP_PCT_DEFAULT;
}

export function parseKind(v: string | null | undefined): OverlapKind | null {
  return (OVERLAP_KINDS as readonly string[]).includes(v ?? "") ? (v as OverlapKind) : null;
}

export function parseLevel(v: string | null | undefined): OverlapLevel | null {
  return (OVERLAP_LEVELS as readonly string[]).includes(v ?? "") ? (v as OverlapLevel) : null;
}

/** Ambang ketat ">": pilihan >90% tidak memuat pasangan yang tepat 90,0%. */
export function filterOverlapRows(rows: ParcelOverlapRow[], f: OverlapFilters): ParcelOverlapRow[] {
  const min = f.pct === "all" ? null : Number(f.pct);
  return rows.filter(
    (r) =>
      (min === null || r.pctMin > min) &&
      (!f.kind || r.kind === f.kind) &&
      (!f.level || r.level === f.level) &&
      (!f.groupId || r.a.groupId === f.groupId || r.b.groupId === f.groupId) &&
      (!f.districtId || r.a.districtId === f.districtId || r.b.districtId === f.districtId)
  );
}

/** Opsi filter Lembaga/Kabupaten diambil dari temuan itu sendiri (kedua sisi), urut nama. */
export function overlapFilterOptions(rows: ParcelOverlapRow[]): {
  groups: { id: string; name: string }[];
  districts: { id: string; name: string }[];
} {
  const groups = new Map<string, string>();
  const districts = new Map<string, string>();
  for (const r of rows) {
    for (const s of [r.a, r.b]) {
      groups.set(s.groupId, s.groupName);
      districts.set(s.districtId, s.districtName);
    }
  }
  const sorted = (m: Map<string, string>) =>
    [...m].map(([id, name]) => ({ id, name })).sort((x, y) => x.name.localeCompare(y.name, "id"));
  return { groups: sorted(groups), districts: sorted(districts) };
}

/**
 * Jumlah pasangan per lahan (LandParcel.id) — satu lahan bisa beririsan dengan
 * beberapa lahan sekaligus; halaman menandainya "+N pasangan lain". Dihitung
 * dari SEMUA temuan (bukan hasil filter) supaya tandanya tidak berubah-ubah.
 */
export function pairCountByParcel(rows: ParcelOverlapRow[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    m.set(r.a.id, (m.get(r.a.id) ?? 0) + 1);
    m.set(r.b.id, (m.get(r.b.id) ?? 0) + 1);
  }
  return m;
}
