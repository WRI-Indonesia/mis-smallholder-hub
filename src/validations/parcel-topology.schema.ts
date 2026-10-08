import { z } from "zod";
import { OVERLAP_GEOMETRY_CHUNK } from "@/lib/parcel-overlap";

/**
 * Input action geometri Tumpang Tindih Lahan (#317). `purpose` divalidasi saat runtime:
 * izin EXPORT & batas satu baris untuk preview bergantung padanya — nilai di luar
 * enum dulu lolos sebagai "bukan export" = cukup izin VIEW untuk ribuan geometri
 * (review ef4ed79).
 */
export const geometryPurposeSchema = z.enum(["preview", "export"]);

const previewOrExport = <T extends z.ZodTypeAny>(item: T) =>
  z.discriminatedUnion("purpose", [
    z.object({ purpose: z.literal("preview"), items: z.array(item).length(1) }),
    z.object({ purpose: z.literal("export"), items: z.array(item).min(1).max(OVERLAP_GEOMETRY_CHUNK) }),
  ]);

/** Kunci pasangan "idA|idB" (tab Tumpang Tindih). */
export const overlapGeometryInputSchema = previewOrExport(z.string().max(130).regex(/^[a-z0-9]+\|[a-z0-9]+$/i));

/** Id lahan temuan (tab Luar Boundary & Selisih Luas); boundary hanya untuk preview. */
export const findingGeometryInputSchema = previewOrExport(z.string().min(1).max(40).regex(/^[a-z0-9]+$/i)).and(
  z.object({ withBoundary: z.boolean() })
);

/** Batas baris per cek tumpang tindih upload — di atas jumlah lahan satu berkas Lembaga terbesar (±2.200). */
export const UPLOAD_OVERLAP_MAX_ROWS = 5000;

/**
 * Input cek tumpang tindih bulk upload shapefile (#317 Fase 3). Geometri dikirim sebagai
 * teks GeoJSON Polygon/MultiPolygon (diurai PostGIS `ST_GeomFromGeoJSON`); tipe dicek di
 * sini agar titik/garis tidak sampai ke kueri.
 */
export const uploadOverlapInputSchema = z
  .array(
    z.object({
      rowNum: z.number().int().positive(),
      farmerId: z.string().min(1).max(40),
      // DBF menampung teks sampai 254 karakter; simpan pun tak membatasi.
      parcelId: z.string().min(1).max(255),
      geometry: z
        .string()
        .max(2_000_000)
        .refine((g) => /^\{\s*"type"\s*:\s*"(Multi)?Polygon"/.test(g), "Geometri harus Polygon/MultiPolygon"),
    })
  )
  .max(UPLOAD_OVERLAP_MAX_ROWS, `Maksimal ${UPLOAD_OVERLAP_MAX_ROWS} lahan per cek`);
