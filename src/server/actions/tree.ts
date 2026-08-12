"use server";

import { prisma } from "@/lib/prisma";
import { hasPermission, isSuperAdmin } from "@/lib/rbac";
import { getAccessContext, farmerRelationAccessFilter } from "@/lib/access-context";
import { treeDensity } from "@/lib/tree-upload";

export interface ParcelTreeData {
  summary: {
    count: number;
    /** Pohon/ha; null bila luas lahan belum diisi. */
    density: number | null;
  };
  points: { longitude: number; latitude: number }[];
}

/**
 * Titik + ringkasan pohon aktif satu lahan (kartu Pohon Sawit + overlay peta
 * Informasi Lahan di Detail Lahan). Set aktif satu lahan ±ratusan titik —
 * aman dikirim utuh untuk peta.
 */
export async function getParcelTrees(parcelDbId: string): Promise<ParcelTreeData | null> {
  if (!(await hasPermission("master-data-parcels", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }

  const access = await getAccessContext();

  // Paritas getLandParcelById: lahan nonaktif hanya boleh dibuka SUPERADMIN
  // (soft-delete layer 3) — tanpa ini, titik GPS lahan nonaktif tetap bocor.
  const parcel = await prisma.landParcel.findFirst({
    where: {
      id: parcelDbId,
      ...farmerRelationAccessFilter(access),
      ...((await isSuperAdmin()) ? {} : { isActive: true }),
    },
    select: { id: true, area: true },
  });
  if (!parcel) return null;

  const trees = await prisma.tree.findMany({
    where: { landParcelId: parcelDbId, isActive: true },
    select: { longitude: true, latitude: true },
    orderBy: { treeId: "asc" },
  });

  return {
    summary: {
      count: trees.length,
      density: trees.length > 0 ? treeDensity(trees.length, parcel.area) : null,
    },
    points: trees,
  };
}

/**
 * Titik pohon aktif seluruh lahan aktif satu petani — overlay peta Sebaran
 * Lahan di Detail Petani (tab Lahan). `landParcelId` disertakan agar klien
 * bisa memfilter titik mengikuti checklist Kelompok Tani pada legenda peta.
 * Per petani hanya beberapa lahan × ±ratusan titik, aman dikirim utuh.
 */
export async function getFarmerTreePoints(
  farmerId: string,
): Promise<{ longitude: number; latitude: number; landParcelId: string }[]> {
  if (!(await hasPermission("master-data-farmers", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }

  const access = await getAccessContext();

  return prisma.tree.findMany({
    where: {
      isActive: true,
      landParcel: { farmerId, isActive: true, ...farmerRelationAccessFilter(access) },
    },
    select: { longitude: true, latitude: true, landParcelId: true },
  });
}

/**
 * Jumlah pohon aktif per lahan (kolom Jumlah Pohon di Detail Petani).
 * Tidak ada action-nya lagi: nilainya diturunkan di page detail petani dari
 * `getFarmerTreePoints` + daftar lahan `getFarmerDetail` yang memang sudah
 * di-fetch halaman itu (hapus round-trip `getFarmerTreeSummary`, #241).
 */
export interface FarmerTreeParcelSummary {
  parcelDbId: string;
  parcelId: string;
  treeCount: number;
}
