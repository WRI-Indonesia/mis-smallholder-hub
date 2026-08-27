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
