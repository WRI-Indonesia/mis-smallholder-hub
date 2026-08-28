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

/** Nomor STDB distinct, gabung "; "; null bila kosong. */
export function summarizeStdb(numbers: string[]): string | null {
  const u = [...new Set(numbers.map((n) => n.trim()).filter(Boolean))];
  return u.length ? u.join("; ") : null;
}
