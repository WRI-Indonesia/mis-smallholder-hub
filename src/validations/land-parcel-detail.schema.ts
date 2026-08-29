import { z } from "zod";
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
  subGroupLv2: trimmed.nullable(),
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
