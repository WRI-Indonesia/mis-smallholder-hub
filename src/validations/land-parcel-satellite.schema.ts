import { z } from "zod";
import { LAND_DOCUMENT_TYPES } from "@/lib/land-parcel-detail-import";
import { LAND_STDB_STAGES, LAND_NKT_STATUSES, NKT_CATEGORIES } from "@/lib/land-parcel-satellite-format";

/**
 * CRUD manual satelit lahan (#296 tahap 3c). Semua input mengacu ke baris
 * lahan (`landParcelId` = LandParcel.id) — server menerjemahkannya ke
 * `parcelUid` setelah cek scope; klien tidak pernah mengirim parcelUid.
 */

/** Teks opsional: "" → null, trim, maks `max` — dipakai juga skema patok (#329), jangan digandakan. */
export const optText = (max = 200) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v), z.string().trim().max(max).nullable().optional());

const optNumber = (msg: string, max = 10000, maxMsg = "Luas terlalu besar") =>
  z.preprocess((v) => {
    if (v === "" || v === undefined || v === null) return null;
    const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
    return Number.isNaN(n) ? NaN : n;
  }, z.number({ message: msg }).positive(msg).max(max, maxMsg).nullable().optional());

const optYear = z.preprocess((v) => {
  if (v === "" || v === undefined || v === null) return null;
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  return Number.isNaN(n) ? NaN : n;
}, z.number({ message: "Tahun tidak valid" }).int().min(1900, "Tahun minimal 1900").max(2100, "Tahun maksimal 2100").nullable().optional());

/** Tanggal opsional dari input `date` ("" → null) — dipakai juga skema patok (#329). */
export const optDate = z.preprocess((v) => {
  if (v === "" || v === undefined || v === null) return null;
  return typeof v === "string" ? new Date(v) : v;
}, z.date({ message: "Tanggal tidak valid" }).nullable().optional());

// ---- Dokumen kepemilikan
export const landParcelDocumentSchema = z.object({
  landParcelId: z.string().min(1, "Lahan tidak valid"),
  type: z.enum(LAND_DOCUMENT_TYPES, { message: "Jenis surat wajib dipilih" }),
  typeRaw: optText(200),
  number: optText(200),
  holderName: optText(200),
  statedArea: optNumber("Luas tertera harus angka lebih dari 0"),
  issuedYear: optYear,
  custodyNote: optText(500),
  notes: optText(1000),
});
export const updateLandParcelDocumentSchema = landParcelDocumentSchema.omit({ landParcelId: true }).extend({ id: z.string().min(1) });

// ---- STDB (per petani, ditautkan ke lahan)
/**
 * Tahapan penerbitan (#306). Nomor baru terbit di tahap terakhir, jadi aturan
 * "wajib" bergantung pada `stage` — ditegakkan lewat `superRefine`, bukan
 * `z.string().min(1)` seperti sebelumnya. Basis tanpa refine karena zod 4
 * membuang refine saat `.omit`/`.extend` (pola yang sama dipakai program).
 */
const stdbBase = z.object({
  stage: z.enum(LAND_STDB_STAGES, { message: "Tahap wajib dipilih" }).default("TERBIT"),
  number: optText(200),
  holderName: optText(200),
  statedArea: optNumber("Luas tertera harus angka lebih dari 0"),
  issuedYear: optYear,
  issuedAt: optDate,
  preparedAt: optDate,
  submittedAt: optDate,
  submittedTo: optText(200),
  stageNote: optText(1000),
  notes: optText(1000),
});

type StdbShape = z.infer<typeof stdbBase>;

/**
 * Aturan lintas-field yang harus sama di kedua varian (create & update):
 * - nomor & tanggal/tahun terbit HANYA untuk `TERBIT` — mencetak baris
 *   pengajuan seolah STDB terbit adalah kesalahan yang paling mahal di sini;
 * - `stageNote` wajib saat `REVISI`/`DITOLAK`: tanpa alasan, dua tahap itu
 *   akan dipakai bergantian dan funnel jadi tak terbaca.
 */
function refineStdbStage(d: StdbShape, ctx: z.RefinementCtx) {
  const terbit = d.stage === "TERBIT";
  if (terbit && !d.number?.trim()) {
    ctx.addIssue({ code: "custom", path: ["number"], message: "Nomor STDB wajib diisi untuk tahap Terbit" });
  }
  if (!terbit) {
    if (d.issuedAt) ctx.addIssue({ code: "custom", path: ["issuedAt"], message: "Tanggal terbit hanya untuk tahap Terbit" });
    if (d.issuedYear != null) ctx.addIssue({ code: "custom", path: ["issuedYear"], message: "Tahun terbit hanya untuk tahap Terbit" });
  }
  if ((d.stage === "REVISI" || d.stage === "DITOLAK") && !d.stageNote?.trim()) {
    ctx.addIssue({ code: "custom", path: ["stageNote"], message: "Alasan wajib diisi untuk tahap Revisi/Ditolak" });
  }
}

export const landStdbSchema = stdbBase
  .extend({ landParcelId: z.string().min(1, "Lahan tidak valid") })
  .superRefine(refineStdbStage);
export const updateLandStdbSchema = stdbBase
  .extend({ id: z.string().min(1) })
  .superRefine(refineStdbStage);

// ---- UL Parcel Code
export const landParcelExternalIdSchema = z.object({
  landParcelId: z.string().min(1, "Lahan tidak valid"),
  source: z.string().trim().min(1, "Sumber wajib diisi").max(100),
  code: z.string().trim().min(1, "Kode wajib diisi").max(200),
  mappedAt: optDate,
  notes: optText(1000),
});
export const updateLandParcelExternalIdSchema = landParcelExternalIdSchema.omit({ landParcelId: true }).extend({ id: z.string().min(1) });

// ---- Program
export const LAND_PROGRAM_TYPES = ["DEMPLOT_PBU"] as const;
export const LAND_PROGRAM_STATUSES = ["PLANNED", "ACTIVE", "COMPLETED", "CANCELLED"] as const;
// Basis tanpa refine — zod 4 membuang refine saat .omit/.extend, jadi refine
// dipasang di akhir pada kedua varian lewat helper yang sama.
const programBase = z.object({
  programType: z.enum(LAND_PROGRAM_TYPES, { message: "Jenis program wajib dipilih" }),
  status: z.enum(LAND_PROGRAM_STATUSES, { message: "Status wajib dipilih" }),
  startDate: optDate,
  endDate: optDate,
  notes: optText(1000),
});
const programDateOrder = {
  check: (d: { startDate?: Date | null; endDate?: Date | null }) => !d.startDate || !d.endDate || d.endDate >= d.startDate,
  opts: { message: "Tanggal selesai harus setelah tanggal mulai", path: ["endDate"] },
};
export const landParcelProgramSchema = programBase
  .extend({ landParcelId: z.string().min(1, "Lahan tidak valid") })
  .refine(programDateOrder.check, programDateOrder.opts);
export const updateLandParcelProgramSchema = programBase
  .extend({ id: z.string().min(1) })
  .refine(programDateOrder.check, programDateOrder.opts);

// ---- Sepadan (#326) — satelit 1:1, keempat sisi opsional; semua kosong = hapus.
// Urutan & label sisi tinggal di modul daun `land-parcel-satellite-format.ts`;
// diekspor ulang di sini untuk pemakai lama.
export { LAND_BORDER_SIDES, LAND_BORDER_SIDE_LABELS, type LandBorderSide } from "@/lib/land-parcel-satellite-format";
export const landParcelBorderSchema = z.object({
  landParcelId: z.string().min(1, "Lahan tidak valid"),
  north: optText(200),
  east: optText(200),
  south: optText(200),
  west: optText(200),
  notes: optText(500),
});

/** Empat sisi saja (tanpa landParcelId/notes) — dipakai Bulk Upload Lahan (atribut DBF). */
export const landParcelBorderSidesSchema = landParcelBorderSchema.omit({ landParcelId: true, notes: true });

// ---- NKT (#328) — satelit 1:1; kategori wajib ≥ 1 kecuali NOT_AFFECTED; tanggal ≤ hari ini.
const nktBase = z.object({
  status: z.enum(LAND_NKT_STATUSES, { message: "Status NKT wajib dipilih" }),
  // FormData mengirim checkbox berulang → string[]; string "1,4" / "NKT 1; NKT_4" dinormalkan ke kode enum.
  categories: z.preprocess(
    (v) => {
      const list = typeof v === "string" ? v.split(/[,;]+/).map((x) => x.trim()).filter(Boolean) : Array.isArray(v) ? v : [];
      return list.map((x) => (typeof x === "string" ? x.replace(/^\s*(?:NKT[\s_-]*)?(\d)\s*$/i, "NKT_$1") : x));
    },
    z.array(z.enum(NKT_CATEGORIES, { message: "Kategori NKT tidak dikenal" })),
  ),
  affectedAreaHa: optNumber("Luas NKT harus angka lebih dari 0"),
  affectedLengthM: optNumber("Panjang harus angka lebih dari 0", 100_000, "Panjang terlalu besar"),
  assessedAt: optDate,
  assessor: optText(200),
  source: optText(200),
  notes: optText(1000),
});
function refineNkt(d: z.infer<typeof nktBase>, ctx: z.RefinementCtx) {
  if (d.status !== "NOT_AFFECTED" && d.categories.length === 0) {
    ctx.addIssue({ code: "custom", path: ["categories"], message: "Pilih minimal satu kategori NKT untuk lahan yang termasuk/terdampak" });
  }
  if (d.assessedAt && d.assessedAt.getTime() > Date.now() + 24 * 3600 * 1000) {
    ctx.addIssue({ code: "custom", path: ["assessedAt"], message: "Tanggal asesmen tidak boleh di masa depan" });
  }
}
/**
 * Normalisasi SETELAH validasi, sebagai `.transform()` — bukan mutasi di dalam
 * superRefine (review 2026-09-15). Duplikat kategori dibuang diam-diam (checkbox
 * tak bisa ganda; importer bisa). NOT_AFFECTED selalu tanpa kategori — sama dengan
 * importer; kalau tidak, form yang beralih status tanpa mencentang-hapus akan
 * menyimpan "Tidak terdampak — NKT 4".
 */
const normalizeNkt = <T extends z.infer<typeof nktBase>>(d: T): T => ({
  ...d,
  categories: d.status === "NOT_AFFECTED" ? [] : [...new Set(d.categories)],
});
export const landParcelNktSchema = nktBase
  .extend({ landParcelId: z.string().min(1, "Lahan tidak valid") })
  .superRefine(refineNkt)
  .transform(normalizeNkt);

export type LandParcelBorderSidesInput = z.infer<typeof landParcelBorderSidesSchema>;

/** Jenis satelit — dipakai modal & action toggle. */
export type SatelliteKind = "document" | "stdb" | "externalId" | "program";
