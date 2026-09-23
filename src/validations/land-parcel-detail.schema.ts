import { z } from "zod";
import { cleanGroupInput } from "@/lib/group-placeholder";
import { LAND_DOCUMENT_TYPES } from "@/lib/land-parcel-detail-import";
import { LAND_STDB_STAGES } from "@/lib/land-parcel-satellite-format";

const trimmed = z.string().trim().max(200);

/** Satu baris hasil validasi klien (`validateParcelDetailRows`), dikirim ke server. */
export const landParcelDetailRowSchema = z.object({
  parcelUid: z.string().min(1, "parcelUid wajib"),
  farmerDbId: z.string().min(1, "farmerDbId wajib"),
  parcelId: z.string().min(1, "ID Lahan wajib"),
  document: z
    .object({
      type: z.enum(LAND_DOCUMENT_TYPES),
      typeRaw: trimmed.nullable(),
      number: trimmed.nullable(),
      holderName: trimmed.nullable(),
      statedArea: z.number().positive().max(10000).nullable(),
      custodyNote: z.string().max(500).nullable(),
    })
    .nullable(),
  custodyNote: z.string().max(500).nullable(),
  // `number` boleh null sejak #306: sel "belum ada"/"n/a" menghasilkan baris
  // PERSIAPAN_DATA tanpa nomor, bukan dibuang diam-diam.
  stdb: z
    .object({
      number: trimmed.min(1).nullable(),
      issuedYear: z.number().int().min(1990).max(2100).nullable(),
      stage: z.enum(LAND_STDB_STAGES),
    })
    .nullable(),
  externalCode: trimmed.nullable(),
  // Isian pengganti "Tidak Ada"/"-" = kosong (#374) → tak mengisi KT lahan.
  subGroupLv2: z.preprocess((v) => (typeof v === "string" ? cleanGroupInput(v) : v), trimmed.nullable()),
  // Sepadan (#326): sisi null = tidak disentuh (bukan dikosongkan); objek null/absen
  // = tak ada sel sepadan. Opsional agar skrip import lama & fixture tetap sah.
  border: z
    .object({
      north: trimmed.nullable(),
      east: trimmed.nullable(),
      south: trimmed.nullable(),
      west: trimmed.nullable(),
    })
    .nullable()
    .optional(),
  /** Blok: isi hanya bila DB kosong (pola subGroupLv2). */
  blok: trimmed.nullable().optional(),
  // NKT (#328): status wajib bila objek ada; categories null = tidak disentuh.
  // Invarian "kategori ≥ 1 kecuali NOT_AFFECTED" DIJAGA DI SINI juga — bukan hanya
  // di validator klien — supaya pemanggil lain (skrip lokal) tak bisa menulis
  // baris AFFECTED tanpa kategori.
  nkt: z
    .object({
      status: z.enum(["INCLUDED", "AFFECTED", "NOT_AFFECTED"]),
      categories: z.array(z.enum(["NKT_1", "NKT_2", "NKT_3", "NKT_4", "NKT_5", "NKT_6"])).nullable(),
      affectedAreaHa: z.number().positive().max(10000).nullable(),
      affectedLengthM: z.number().positive().max(100_000).nullable(),
      assessedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
      assessor: trimmed.nullable(),
    })
    .superRefine((n, ctx) => {
      if (n.status !== "NOT_AFFECTED" && !(n.categories && n.categories.length > 0)) {
        ctx.addIssue({ code: "custom", path: ["categories"], message: "Kategori NKT wajib untuk lahan yang termasuk/terdampak" });
      }
    })
    .nullable()
    .optional(),
});

/**
 * Pemeta UL Parcel Code (`LandParcelExternalId.source`) untuk satu berkas import
 * — daftar `PARCEL_MAPPERS` plus isian bebas (pemeta baru tak perlu rilis kode).
 */
export const parcelMapperSchema = z
  .string()
  .trim()
  .min(2, "Pemeta wajib diisi")
  .max(60, "Nama pemeta maksimal 60 karakter");

export const landParcelDetailBatchSchema = z
  .array(landParcelDetailRowSchema)
  .min(1, "Tidak ada baris valid untuk disimpan")
  .max(20000, "Maksimal 20.000 baris per unggahan");

export type LandParcelDetailRowInput = z.infer<typeof landParcelDetailRowSchema>;
