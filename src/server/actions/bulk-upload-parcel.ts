"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { landParcelSchema, type LandParcelInput } from "@/validations/land-parcel.schema";
import { formatFieldErrors } from "@/lib/validation-message";
import { getAccessContext } from "@/lib/access-context";
import { parcelIdentityUpsertArgs } from "@/lib/land-parcel-identity";
import { parseShapefileZip } from "@/lib/shapefile-server";
import type { ActionResult } from "@/types/action-result";

export async function parseShapefile(base64Data: string) {
  if (!(await hasPermission("bulk-upload-parcels", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }

  return parseShapefileZip(base64Data);
}

export async function getFarmersForMapping() {
  if (!(await hasPermission("bulk-upload-parcels", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }

  const access = await getAccessContext();

  const accessFilter =
    access.mode === "BY_FARMER_GROUP" ? { farmerGroupId: { in: access.ids } } :
    access.mode === "BY_DISTRICT" ? { farmerGroup: { districtId: { in: access.ids } } } :
    {};

  return prisma.farmer.findMany({
    where: { ...accessFilter, isActive: true },
    select: {
      id: true,
      name: true,
      farmerId: true,
    },
    orderBy: { name: "asc" },
  });
}

export async function getExistingParcelIds() {
  if (!(await hasPermission("bulk-upload-parcels", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }

  const access = await getAccessContext();

  const accessFilter =
    access.mode === "BY_FARMER_GROUP" ? { farmer: { farmerGroupId: { in: access.ids } } } :
    access.mode === "BY_DISTRICT" ? { farmer: { farmerGroup: { districtId: { in: access.ids } } } } :
    {};

  return prisma.landParcel.findMany({
    where: { ...accessFilter, isActive: true },
    select: {
      farmerId: true,
      parcelId: true,
      geometry: true,
      revision: true,
    },
  });
}

function isGeometryEqual(g1: unknown, g2: unknown) {
  if (!g1 || !g2) return false;
  try {
    const obj1 = (typeof g1 === "string" ? JSON.parse(g1) : g1) as { coordinates?: unknown };
    const obj2 = (typeof g2 === "string" ? JSON.parse(g2) : g2) as { coordinates?: unknown };
    return JSON.stringify(obj1.coordinates) === JSON.stringify(obj2.coordinates);
  } catch {
    return false;
  }
}

export async function bulkCreateLandParcels(
  dataList: Record<string, unknown>[]
): Promise<ActionResult<{ count: number }>> {
  if (!(await hasPermission("bulk-upload-parcels", "CREATE"))) {
    return { success: false, error: "Tidak memiliki izin untuk menyimpan data" };
  }

  const session = await auth();
  const userId = session?.user?.id ?? null;

  // CRIT-3: Validasi semua farmerId ada dalam scope akses user
  const access = await getAccessContext();
  if (access.mode !== "ALL") {
    const accessFilter =
      access.mode === "BY_FARMER_GROUP" ? { farmerGroupId: { in: access.ids } } :
      { farmerGroup: { districtId: { in: access.ids } } };

    const allowedFarmers = await prisma.farmer.findMany({
      where: { ...accessFilter, isActive: true },
      select: { id: true },
    });
    const allowedFarmerIds = new Set(allowedFarmers.map((f) => f.id));

    const unauthorizedRow = dataList.find((item) => !allowedFarmerIds.has(item.farmerId as string));
    if (unauthorizedRow) {
      return {
        success: false,
        error: `Tidak memiliki izin untuk membuat lahan bagi petani dengan ID: "${String(unauthorizedRow.farmerId)}"`,
      };
    }
  }

  // Validate all records before saving
  const validatedRecords: Array<LandParcelInput & { revision?: number }> = [];
  for (const item of dataList) {
    const parsed = landParcelSchema.safeParse(item);
    if (!parsed.success) {
      return {
        success: false,
        error: formatFieldErrors(
          parsed.error.flatten().fieldErrors,
          "Ada baris yang tidak lolos validasi",
        ),
      };
    }
    validatedRecords.push(parsed.data);
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Prefetch semua pasangan aktif (farmerId, parcelId) dalam satu query
      // (audit #233) — semula findFirst per baris = N round-trip. Loop create
      // per-baris TETAP: dibutuhkan revision tracking + repoint produksi/pohon
      // (TD-022/#238). Map di-update setiap create agar pasangan yang muncul
      // dua kali dalam satu batch tetap terdeteksi duplikat (perilaku setara
      // findFirst dalam transaksi yang melihat tulisan sendiri).
      const pairKey = (farmerId: string, parcelId: string) => `${farmerId}\u0000${parcelId}`;
      const existing = await tx.landParcel.findMany({
        where: {
          isActive: true,
          OR: [...new Map(
            validatedRecords.map((r) => [pairKey(r.farmerId, r.parcelId), { farmerId: r.farmerId, parcelId: r.parcelId }])
          ).values()],
        },
        select: { id: true, farmerId: true, parcelId: true, revision: true, geometry: true },
      });
      const activeByPair = new Map(
        existing.map((d) => [pairKey(d.farmerId, d.parcelId), { id: d.id, revision: d.revision, geometry: d.geometry }])
      );

      for (const record of validatedRecords) {
        const duplicate = activeByPair.get(pairKey(record.farmerId, record.parcelId)) ?? null;

        let finalRevision = record.revision ?? 0;

        if (duplicate) {
          if (isGeometryEqual(duplicate.geometry, record.geometry)) {
            throw new Error(`ID Lahan "${record.parcelId}" sudah terdaftar untuk petani tersebut dengan polygon yang sama`);
          } else {
            // Set old active record to inactive
            await tx.landParcel.update({
              where: { id: duplicate.id },
              data: { isActive: false },
            });
            finalRevision = duplicate.revision + 1;
          }
        }

        // Identitas stabil antar revisi (Decision Log 2026-08-27): revisi
        // memakai identitas yang sama, sehingga satelit (dokumen/STDB/dll.)
        // tak perlu ikut di-repoint seperti produksi & pohon di bawah.
        const identity = await tx.landParcelIdentity.upsert(parcelIdentityUpsertArgs(record, userId));

        const created = await tx.landParcel.create({
          data: {
            ...record,
            parcelUid: identity.id,
            geometry: record.geometry ?? null,
            revision: finalRevision,
            createdBy: userId,
          },
          select: { id: true },
        });

        // Revisi = baris lahan BARU (id baru), baris lama dinonaktifkan. Produksi
        // masih menunjuk id lama, jadi harus ikut dipindahkan — kalau tidak,
        // atribusi per-lahan putus: lahan terbaca "tanpa data produksi" padahal
        // tonasenya tetap masuk pembilang produktivitas BMP (TD-022).
        // Semua revisi ikut dipindah (bukan hanya yang aktif) agar riwayat utuh.
        if (duplicate) {
          await tx.productionRecord.updateMany({
            where: { parcelId: duplicate.id },
            data: { parcelId: created.id, modifiedBy: userId },
          });
          // Titik pohon (#238) juga menunjuk id baris lahan — ikut repoint
          // dengan alasan yang sama; semua revisi pohon dipindah agar utuh.
          await tx.tree.updateMany({
            where: { landParcelId: duplicate.id },
            data: { landParcelId: created.id, modifiedBy: userId },
          });
        }

        // Baris yang baru dibuat kini jadi baris aktif untuk pasangan ini.
        activeByPair.set(pairKey(record.farmerId, record.parcelId), {
          id: created.id,
          revision: finalRevision,
          geometry: record.geometry ?? null,
        });
      }
    });

    return { success: true, data: { count: validatedRecords.length } };
  } catch (error) {
    console.error("Bulk save land parcels error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message || "Gagal menyimpan data ke database" };
  }
}
