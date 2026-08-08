"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { getAccessContext, farmerRelationAccessFilter } from "@/lib/access-context";
import { bulkCreateTreesSchema, type BulkCreateTreesInput } from "@/validations/tree.schema";
import type { ActionResult } from "@/types/action-result";
import type { Feature } from "geojson";

/**
 * Urai ZIP shapefile titik pohon (#238). Pola sama dengan parseShapefile lahan
 * (bulk-upload-parcel.ts) — dipisah karena guard menunya berbeda.
 */
export async function parseTreeShapefile(base64Data: string) {
  if (!(await hasPermission("bulk-upload-trees", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }

  // Polyfill self to avoid ReferenceError: self is not defined when running shpjs on the server
  if (typeof self === "undefined") {
    (globalThis as unknown as { self: typeof globalThis }).self = globalThis;
  }

  try {
    const shp = (await import("shpjs")).default;
    const buffer = Buffer.from(base64Data, "base64");
    const geojson = await shp(buffer);

    const features: Feature[] = [];
    if (Array.isArray(geojson)) {
      for (const gc of geojson) {
        if (gc.type === "FeatureCollection") {
          features.push(...gc.features);
        }
      }
    } else if (geojson && geojson.type === "FeatureCollection") {
      features.push(...geojson.features);
    }

    return {
      success: true,
      features: features.map((f, index) => ({
        index,
        properties: f.properties || {},
        geometry: f.geometry || null,
      })),
    };
  } catch (error) {
    console.error("Tree shapefile parsing error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message || "Gagal mengurai file shapefile" };
  }
}

export interface TreeUploadParcel {
  id: string;
  parcelId: string;
  area: number | null;
  farmerName: string;
  /** Jumlah pohon aktif saat ini (0 = belum ada; >0 = upload akan jadi revisi). */
  activeTreeCount: number;
  activeRevision: number | null;
}

/**
 * Lahan aktif dalam scope + jumlah pohon aktifnya — untuk mencocokkan
 * parcel_id file dengan lahan di database saat preview upload.
 */
export async function getTreeUploadParcels(): Promise<TreeUploadParcel[]> {
  if (!(await hasPermission("bulk-upload-trees", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }

  const access = await getAccessContext();

  const parcels = await prisma.landParcel.findMany({
    where: { isActive: true, ...farmerRelationAccessFilter(access) },
    select: {
      id: true,
      parcelId: true,
      area: true,
      farmer: { select: { name: true } },
    },
    orderBy: { parcelId: "asc" },
  });

  const grouped = await prisma.tree.groupBy({
    by: ["landParcelId"],
    where: { landParcelId: { in: parcels.map((p) => p.id) }, isActive: true },
    _count: { _all: true },
    _max: { revision: true },
  });
  const byParcel = new Map(grouped.map((g) => [g.landParcelId, g]));

  return parcels.map((p) => ({
    id: p.id,
    parcelId: p.parcelId,
    area: p.area,
    farmerName: p.farmer.name,
    activeTreeCount: byParcel.get(p.id)?._count._all ?? 0,
    activeRevision: byParcel.get(p.id)?._max.revision ?? null,
  }));
}

/**
 * Simpan set pohon per lahan. Upload ulang untuk lahan yang sama =
 * revisi set: seluruh pohon aktif lahan tsb dinonaktifkan, set baru masuk
 * dengan revision + 1 (idiom revisi LandParcel, diterapkan per-set).
 */
export async function bulkCreateTrees(
  input: BulkCreateTreesInput,
): Promise<ActionResult<{ parcels: number; trees: number }>> {
  if (!(await hasPermission("bulk-upload-trees", "CREATE"))) {
    return { success: false, error: "Tidak memiliki izin untuk menyimpan data" };
  }

  const parsed = bulkCreateTreesSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: `Validasi gagal: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`,
    };
  }

  const session = await auth();
  const userId = session?.user?.id ?? null;

  // Scope: semua parcel_id harus resolve ke lahan aktif dalam jurisdiksi user.
  const access = await getAccessContext();
  const parcelIds = parsed.data.groups.map((g) => g.parcelId);
  const parcels = await prisma.landParcel.findMany({
    where: { parcelId: { in: parcelIds }, isActive: true, ...farmerRelationAccessFilter(access) },
    select: { id: true, parcelId: true },
  });
  const parcelByBusinessId = new Map(parcels.map((p) => [p.parcelId, p.id]));

  const missing = parcelIds.filter((pid) => !parcelByBusinessId.has(pid));
  if (missing.length > 0) {
    return {
      success: false,
      error: `Lahan tidak ditemukan/di luar akses Anda: ${missing.join(", ")}`,
    };
  }

  const sourceFile = parsed.data.sourceFile ?? null;
  let totalTrees = 0;

  try {
    await prisma.$transaction(async (tx) => {
      for (const group of parsed.data.groups) {
        const landParcelId = parcelByBusinessId.get(group.parcelId)!;

        // Nonaktifkan set aktif lama (bila ada) → set baru revision + 1.
        const prev = await tx.tree.aggregate({
          where: { landParcelId, isActive: true },
          _max: { revision: true },
        });
        const revision = prev._max.revision != null ? prev._max.revision + 1 : 0;

        if (prev._max.revision != null) {
          await tx.tree.updateMany({
            where: { landParcelId, isActive: true },
            data: { isActive: false, modifiedBy: userId },
          });
        }

        await tx.tree.createMany({
          data: group.rows.map((row) => ({
            landParcelId,
            parcelId: group.parcelId,
            treeId: row.treeId,
            sequenceNo: row.sequenceNo,
            longitude: row.longitude,
            latitude: row.latitude,
            category: row.category,
            vigor: row.vigor,
            source: row.source,
            modelVersion: row.modelVersion,
            sourceFile,
            revision,
            createdBy: userId,
          })),
        });
        totalTrees += group.rows.length;
      }
    });

    return { success: true, data: { parcels: parsed.data.groups.length, trees: totalTrees } };
  } catch (error) {
    console.error("Bulk save trees error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message || "Gagal menyimpan data ke database" };
  }
}
