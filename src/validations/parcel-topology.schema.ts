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
