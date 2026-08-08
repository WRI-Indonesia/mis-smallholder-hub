"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { getAccessContext, farmerRelationAccessFilter } from "@/lib/access-context";
import { parseShapefileZip } from "@/lib/shapefile-server";
import { bulkCreateTreesSchema, type BulkCreateTreesInput } from "@/validations/tree.schema";
import type { ActionResult } from "@/types/action-result";

/**
 * Urai ZIP shapefile titik pohon (#238) — mesin parse bersama dengan upload
 * Lahan (`lib/shapefile-server.ts`, termasuk workaround proj4 CEA); dipisah
 * sebagai action karena guard menunya berbeda.
 */
export async function parseTreeShapefile(base64Data: string) {
  if (!(await hasPermission("bulk-upload-trees", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }

  return parseShapefileZip(base64Data);
}

export interface TreeUploadParcel {
  id: string;
  parcelId: string;
  area: number | null;
  farmerName: string;
  /** Jumlah pohon aktif saat ini (0 = belum ada; >0 = upload akan jadi revisi). */
  activeTreeCount: number;
}

/**
 * Lahan aktif dalam scope + jumlah pohon aktifnya — untuk mencocokkan
 * parcel_id file dengan lahan di database saat preview upload.
 * Catatan: parcelId hanya unik PER PETANI — bila satu parcelId muncul lebih
 * dari sekali di daftar ini, upload untuk id tsb ambigu dan harus ditolak.
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
  });
  const byParcel = new Map(grouped.map((g) => [g.landParcelId, g]));

  return parcels.map((p) => ({
    id: p.id,
    parcelId: p.parcelId,
    area: p.area,
    farmerName: p.farmer.name,
    activeTreeCount: byParcel.get(p.id)?._count._all ?? 0,
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

  // parcelId hanya unik per petani — id yang dipakai >1 petani tidak bisa
  // dipetakan dengan aman, tolak eksplisit (jangan diam-diam pilih salah satu).
  const rowsPerParcelId = new Map<string, number>();
  for (const p of parcels) {
    rowsPerParcelId.set(p.parcelId, (rowsPerParcelId.get(p.parcelId) ?? 0) + 1);
  }
  const ambiguous = parcelIds.filter((pid) => (rowsPerParcelId.get(pid) ?? 0) > 1);
  if (ambiguous.length > 0) {
    return {
      success: false,
      error: `ID Lahan terdaftar pada lebih dari satu petani (ambigu, tidak bisa dicocokkan otomatis): ${ambiguous.join(", ")}`,
    };
  }

  const parcelByBusinessId = new Map(parcels.map((p) => [p.parcelId, p.id]));
  const missing = parcelIds.filter((pid) => !parcelByBusinessId.has(pid));
  if (missing.length > 0) {
    return {
      success: false,
      error: `Lahan tidak ditemukan/di luar akses Anda: ${missing.join(", ")}`,
    };
  }

  const sourceFile = parsed.data.sourceFile ?? null;
  const totalTrees = parsed.data.groups.reduce((sum, g) => sum + g.rows.length, 0);

  try {
    // Batch tetap 3 query berapa pun jumlah lahan (groupBy → updateMany →
    // createMany) agar transaksi tidak menabrak timeout pada ZIP multi-lahan
    // besar; timeout dinaikkan mengikuti preseden role-permission.ts.
    await prisma.$transaction(
      async (tx) => {
        const landParcelIds = parsed.data.groups.map(
          (g) => parcelByBusinessId.get(g.parcelId)!,
        );

        const prev = await tx.tree.groupBy({
          by: ["landParcelId"],
          where: { landParcelId: { in: landParcelIds }, isActive: true },
          _max: { revision: true },
        });
        const prevRevision = new Map(prev.map((p) => [p.landParcelId, p._max.revision]));

        if (prev.length > 0) {
          await tx.tree.updateMany({
            where: { landParcelId: { in: prev.map((p) => p.landParcelId) }, isActive: true },
            data: { isActive: false, modifiedBy: userId },
          });
        }

        await tx.tree.createMany({
          data: parsed.data.groups.flatMap((group) => {
            const landParcelId = parcelByBusinessId.get(group.parcelId)!;
            const prevMax = prevRevision.get(landParcelId);
            const revision = prevMax != null ? prevMax + 1 : 0;
            return group.rows.map((row) => ({
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
            }));
          }),
        });
      },
      { timeout: 20_000 },
    );

    return { success: true, data: { parcels: parsed.data.groups.length, trees: totalTrees } };
  } catch (error) {
    console.error("Bulk save trees error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message || "Gagal menyimpan data ke database" };
  }
}
