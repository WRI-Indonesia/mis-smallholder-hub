/**
 * Ringkasan satu-baris satelit lahan (#296) untuk tabel padat — Report Lahan
 * dan tab Lahan di detail Petani. Murni, tanpa Prisma.
 */

export interface DocSummaryInput {
  type: string;
  number: string | null;
  holderName: string | null;
  statedArea: number | null;
}

/** Kode singkat jenis: enum → akronim ("SHM", "SKT", …); OTHER → "Lainnya". Dipakai UI & PDF. */
export function documentTypeShort(type: string): string {
  if (type === "OTHER") return "Lainnya";
  if (type === "JUAL_BELI") return "Jual Beli";
  if (type === "HIBAH") return "Hibah";
  return type;
}

/**
 * Pemeta UL Parcel Code — nilai `LandParcelExternalId.source`. Kolomnya berarti
 * **siapa yang memetakan**, bukan nama kolom Excel asalnya: seluruh 6.953 kode
 * yang ada berasal dari Meridia, vendor yang ditugaskan donor (UL); ke depan
 * pemetaan bisa swadaya atau dibantu WRI (keputusan owner 2026-08-28, migrasi
 * data `parcel_code` → `MERIDIA`). Nilai di luar daftar tetap diterima
 * (isian bebas) dan ditampilkan apa adanya.
 */
export const PARCEL_MAPPERS = [
  { value: "MERIDIA", short: "Meridia", label: "Meridia — vendor pemetaan (ditugaskan UL)" },
  { value: "WRI", short: "WRI", label: "WRI Indonesia" },
  { value: "SWADAYA", short: "Swadaya", label: "Swadaya petani/lembaga" },
] as const;

export const DEFAULT_PARCEL_MAPPER = "MERIDIA";

const PARCEL_MAPPER_LABELS: Record<string, string> = Object.fromEntries(PARCEL_MAPPERS.map((m) => [m.value, m.label]));
const PARCEL_MAPPER_SHORT: Record<string, string> = Object.fromEntries(PARCEL_MAPPERS.map((m) => [m.value, m.short]));

/** Label panjang pemeta (tab Legalitas); sumber tak dikenal ditampilkan apa adanya. */
export function parcelMapperLabel(source: string): string {
  return PARCEL_MAPPER_LABELS[source] ?? source;
}

/** Label pendek pemeta (PDF, tabel padat). */
export function parcelMapperShort(source: string): string {
  return PARCEL_MAPPER_SHORT[source] ?? source;
}

/** Label program & status (satu sumber untuk tab Legalitas dan PDF Profil Lahan). */
export const LAND_PROGRAM_LABELS: Record<string, string> = { DEMPLOT_PBU: "Demplot PBU" };
export const LAND_PROGRAM_STATUS_LABELS: Record<string, string> = {
  PLANNED: "Direncanakan",
  ACTIVE: "Berjalan",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

/** "SHM 727; SKT 05.16.08.05.1.105108" — null bila tidak ada dokumen. */
export function summarizeDocuments(docs: DocSummaryInput[]): string | null {
  if (docs.length === 0) return null;
  return docs.map((d) => (d.number ? `${documentTypeShort(d.type)} ${d.number}` : documentTypeShort(d.type))).join("; ");
}

/** Nama tertera di surat — distinct, gabung "; "; null bila kosong. */
export function summarizeHolderNames(docs: DocSummaryInput[]): string | null {
  const names = [...new Set(docs.map((d) => d.holderName?.trim()).filter((n): n is string => Boolean(n)))];
  return names.length ? names.join("; ") : null;
}

/** Total luas tertera (Ha) lintas dokumen; null bila tak satu pun terisi. */
export function sumStatedArea(docs: DocSummaryInput[]): number | null {
  const vals = docs.map((d) => d.statedArea).filter((v): v is number => v != null);
  return vals.length ? vals.reduce((a, b) => a + b, 0) : null;
}

/**
 * Ambang "selisih luas tertera vs poligon patut diperiksa" (Ha), #305.
 * SATU konstanta untuk dua tempat: chip amber di tab Legalitas Detail Lahan dan
 * filter/KPI di Laporan Lahan. Kalau keduanya memakai angka sendiri-sendiri,
 * laporan dan detail akan menandai lahan yang berbeda tanpa gejala.
 */
export const AREA_DIFF_THRESHOLD_HA = 0.5;

/** `true` bila selisih luas tertera vs poligon mencapai ambang di atas. */
export function isBigAreaDiff(statedArea: number | null, area: number | null): boolean {
  if (statedArea == null || area == null) return false;
  return Math.abs(statedArea - area) >= AREA_DIFF_THRESHOLD_HA;
}

export interface ExternalIdSummaryInput {
  source: string;
  code: string;
}

/**
 * "ID080d781b4 (Meridia)" — distinct, gabung "; "; null bila kosong (#305).
 * Pemetanya ikut karena kode yang sama bisa datang dari pemeta berbeda dan
 * hidup berdampingan (lihat `PARCEL_MAPPERS`).
 */
export function summarizeExternalIds(items: ExternalIdSummaryInput[]): string | null {
  const parts = [...new Set(items.map((e) => `${e.code.trim()} (${parcelMapperShort(e.source)})`).filter(Boolean))];
  return parts.length ? parts.join("; ") : null;
}

export interface ProgramSummaryInput {
  programType: string;
  status: string;
}

/** "Demplot PBU — Berjalan" — distinct, gabung "; "; null bila kosong (#305). */
export function summarizePrograms(items: ProgramSummaryInput[]): string | null {
  const parts = [
    ...new Set(
      items.map(
        (p) =>
          `${LAND_PROGRAM_LABELS[p.programType] ?? p.programType} — ${LAND_PROGRAM_STATUS_LABELS[p.status] ?? p.status}`,
      ),
    ),
  ];
  return parts.length ? parts.join("; ") : null;
}

// ─── Tahapan penerbitan STDB (#306) ───

export const LAND_STDB_STAGES = ["PERSIAPAN_DATA", "PENGAJUAN", "REVISI", "TERBIT", "DITOLAK"] as const;
export type LandStdbStageCode = (typeof LAND_STDB_STAGES)[number];

export const LAND_STDB_STAGE_LABELS: Record<string, string> = {
  PERSIAPAN_DATA: "Persiapan Data",
  PENGAJUAN: "Pengajuan",
  REVISI: "Revisi",
  TERBIT: "Terbit",
  DITOLAK: "Ditolak",
};

/**
 * Tahap yang berarti "berkas masih terbuka" — dipakai UI, filter, DAN partial
 * unique index `uniq_land_stdb_farmer_open` (satu berkas terbuka per petani).
 * `DITOLAK` sengaja TIDAK ikut: prosesnya berhenti, dan petani harus bisa
 * mengajukan ulang dengan baris baru (keputusan owner #306).
 */
export const LAND_STDB_OPEN_STAGES = ["PERSIAPAN_DATA", "PENGAJUAN", "REVISI"] as const;

export function isOpenStdbStage(stage: string): boolean {
  return (LAND_STDB_OPEN_STAGES as readonly string[]).includes(stage);
}

export function landStdbStageLabel(stage: string): string {
  return LAND_STDB_STAGE_LABELS[stage] ?? stage;
}

export interface StdbSummaryInput {
  number: string | null;
  stage: string;
}

/**
 * "1637/53/1401/6/2025; Pengajuan — belum bernomor" — distinct, null bila
 * kosong. Baris pra-terbit tidak boleh muncul sebagai string kosong di Report
 * dan PDF (#306): pembaca akan menyangka datanya rusak, padahal tahapnya memang
 * belum menghasilkan nomor. Baris TERBIT bernomor ditulis polos (nomor saja)
 * supaya kolom roster harian tidak berubah bentuk.
 */
export function summarizeStdb(items: StdbSummaryInput[]): string | null {
  const parts = items.map((s) => {
    const number = s.number?.trim() || null;
    if (!number) return `${landStdbStageLabel(s.stage)} — belum bernomor`;
    return s.stage === "TERBIT" ? number : `${number} (${landStdbStageLabel(s.stage)})`;
  });
  const u = [...new Set(parts.filter(Boolean))];
  return u.length ? u.join("; ") : null;
}

// ─── Sepadan (#326) ───

/** Empat sisi sepadan, urutan searah jarum jam — satu-satunya sumber urutan & label
 *  (form, detail, PDF, importer). Modul ini daun (tanpa import), aman diimpor dari mana pun. */
export const LAND_BORDER_SIDES = ["north", "east", "south", "west"] as const;
export type LandBorderSide = (typeof LAND_BORDER_SIDES)[number];
export const LAND_BORDER_SIDE_LABELS: Record<LandBorderSide, string> = {
  north: "Utara",
  east: "Timur",
  south: "Selatan",
  west: "Barat",
};

/**
 * Baris sepadan dianggap TERISI bila ada satu sisi atau catatan. Baris yang
 * keempat kolomnya NULL adalah bekas "hapus" (baris tetap ada, lihat
 * land-parcel-border.prisma) dan harus tampil sebagai belum diisi — di Detail
 * Lahan maupun PDF, lewat predikat yang sama.
 */
export function hasBorderContent(
  b: { north: string | null; east: string | null; south: string | null; west: string | null; notes: string | null } | null | undefined,
): boolean {
  return Boolean(b && (b.north || b.east || b.south || b.west || b.notes));
}

// ─── NKT / HCV (#328) ───

export const LAND_NKT_STATUSES = ["INCLUDED", "AFFECTED", "NOT_AFFECTED"] as const;
export type LandNktStatusCode = (typeof LAND_NKT_STATUSES)[number];
export const LAND_NKT_STATUS_LABELS: Record<LandNktStatusCode, string> = {
  INCLUDED: "Termasuk area NKT",
  AFFECTED: "Terdampak NKT",
  NOT_AFFECTED: "Tidak terdampak",
};
/** Label pendek untuk badge/kolom laporan. */
export const LAND_NKT_STATUS_SHORT: Record<LandNktStatusCode, string> = {
  INCLUDED: "Termasuk NKT",
  AFFECTED: "Terdampak NKT",
  NOT_AFFECTED: "Tidak terdampak",
};
export function landNktStatusLabel(status: string, short = false): string {
  return (short ? LAND_NKT_STATUS_SHORT : LAND_NKT_STATUS_LABELS)[status as LandNktStatusCode] ?? status;
}
/** Status yang berarti lahan "kena" NKT — satu-satunya definisi (KPI, layer peta, PDF, tanda turunan patok #329). */
export const NKT_AFFECTED_STATUSES: readonly LandNktStatusCode[] = ["INCLUDED", "AFFECTED"];
export function isNktAffected(status: string | null | undefined): boolean {
  return (NKT_AFFECTED_STATUSES as readonly string[]).includes(status ?? "");
}

export const NKT_CATEGORIES = ["NKT_1", "NKT_2", "NKT_3", "NKT_4", "NKT_5", "NKT_6"] as const;
export type NktCategoryCode = (typeof NKT_CATEGORIES)[number];
/** Label pendek ("NKT 1") — chip, kolom, PDF. */
export function nktCategoryShort(c: string): string {
  return c.replace(/^NKT_/, "NKT ");
}
/** Keterangan satu kalimat per kategori (tooltip / bantuan). */
export const NKT_CATEGORY_DESCRIPTIONS: Record<NktCategoryCode, string> = {
  NKT_1: "Keanekaragaman hayati penting (spesies langka, endemik, terancam)",
  NKT_2: "Lanskap / ekosistem tingkat lanskap yang utuh",
  NKT_3: "Ekosistem langka, terancam, atau hampir punah",
  NKT_4: "Jasa lingkungan penting (sempadan sungai, DAS, pengendali erosi)",
  NKT_5: "Kebutuhan dasar masyarakat lokal",
  NKT_6: "Identitas budaya / tradisi masyarakat",
};
/** "NKT 1, NKT 4" — kosong → null. */
export function summarizeNktCategories(categories: readonly string[] | null | undefined): string | null {
  if (!categories?.length) return null;
  return categories.map(nktCategoryShort).join(", ");
}
/**
 * Ringkasan satu baris untuk PDF/laporan: `Terdampak NKT — NKT 1, NKT 4 (asesmen
 * 2025-03-12, WRI)`. Belum dinilai → "Belum dinilai".
 */
export function summarizeNkt(
  nkt: { status: string; categories: readonly string[]; assessedAt: Date | string | null; assessor: string | null } | null | undefined,
): string {
  if (!nkt) return "Belum dinilai";
  const cats = summarizeNktCategories(nkt.categories);
  const when = nkt.assessedAt ? new Date(nkt.assessedAt).toISOString().slice(0, 10) : null;
  const meta = [when ? `asesmen ${when}` : null, nkt.assessor].filter(Boolean).join(", ");
  return `${landNktStatusLabel(nkt.status, true)}${cats ? ` — ${cats}` : ""}${meta ? ` (${meta})` : ""}`;
}
