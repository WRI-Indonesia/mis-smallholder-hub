"use server";

import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { getAccessContext, farmerRelationAccessFilter } from "@/lib/access-context";
import { treeDensity, summarizeTreeSources } from "@/lib/tree-upload";

export interface ParcelTreeData {
  summary: {
    count: number;
    /** Pohon/ha; null bila luas lahan belum diisi. */
    density: number | null;
    revision: number;
    sources: { source: string; count: number }[];
    /** Rata-rata vigor pohon ber-nilai; null bila semua kosong. */
    avgVigor: number | null;
    surveyedAt: Date | null;
    sourceFile: string | null;
    modelVersion: string | null;
    uploadedAt: Date | null;
  };
  points: { longitude: number; latitude: number; source: string | null }[];
}

/**
 * Titik + ringkasan pohon aktif satu lahan (seksi "Pohon Sawit" Detail Lahan).
 * Set aktif satu lahan ±ratusan titik — aman dikirim utuh untuk peta.
 */
export async function getParcelTrees(parcelDbId: string): Promise<ParcelTreeData | null> {
  if (!(await hasPermission("master-data-parcels", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }

  const access = await getAccessContext();

  const parcel = await prisma.landParcel.findFirst({
    where: { id: parcelDbId, ...farmerRelationAccessFilter(access) },
    select: { id: true, area: true },
  });
  if (!parcel) return null;

  const trees = await prisma.tree.findMany({
    where: { landParcelId: parcelDbId, isActive: true },
    select: {
      longitude: true,
      latitude: true,
      source: true,
      vigor: true,
      revision: true,
      surveyedAt: true,
      sourceFile: true,
      modelVersion: true,
      createdAt: true,
    },
    orderBy: { treeId: "asc" },
  });

  if (trees.length === 0) {
    return {
      summary: {
        count: 0,
        density: null,
        revision: 0,
        sources: [],
        avgVigor: null,
        surveyedAt: null,
        sourceFile: null,
        modelVersion: null,
        uploadedAt: null,
      },
      points: [],
    };
  }

  const vigors = trees.filter((t) => t.vigor != null).map((t) => t.vigor as number);
  const first = trees[0];

  return {
    summary: {
      count: trees.length,
      density: treeDensity(trees.length, parcel.area),
      revision: first.revision,
      sources: summarizeTreeSources(trees.map((t) => t.source)),
      avgVigor: vigors.length > 0 ? vigors.reduce((a, b) => a + b, 0) / vigors.length : null,
      surveyedAt: first.surveyedAt,
      sourceFile: first.sourceFile,
      modelVersion: trees.find((t) => t.modelVersion != null)?.modelVersion ?? null,
      uploadedAt: first.createdAt,
    },
    points: trees.map((t) => ({ longitude: t.longitude, latitude: t.latitude, source: t.source })),
  };
}

export interface FarmerTreeParcelSummary {
  parcelDbId: string;
  parcelId: string;
  area: number | null;
  treeCount: number;
  density: number | null;
  surveyedAt: Date | null;
  uploadedAt: Date | null;
}

/**
 * Rekap pohon per lahan aktif milik satu petani (tab "Pohon" Detail Petani).
 * Agregat via groupBy — jangan findMany semua titik (skala 10⁵–10⁶ baris).
 */
export async function getFarmerTreeSummary(farmerId: string): Promise<FarmerTreeParcelSummary[]> {
  if (!(await hasPermission("master-data-farmers", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }

  const access = await getAccessContext();

  const parcels = await prisma.landParcel.findMany({
    where: { farmerId, isActive: true, ...farmerRelationAccessFilter(access) },
    select: { id: true, parcelId: true, area: true },
    orderBy: { parcelId: "asc" },
  });
  if (parcels.length === 0) return [];

  const grouped = await prisma.tree.groupBy({
    by: ["landParcelId"],
    where: { landParcelId: { in: parcels.map((p) => p.id) }, isActive: true },
    _count: { _all: true },
    _max: { surveyedAt: true, createdAt: true },
  });
  const byParcel = new Map(grouped.map((g) => [g.landParcelId, g]));

  return parcels.map((p) => {
    const g = byParcel.get(p.id);
    const treeCount = g?._count._all ?? 0;
    return {
      parcelDbId: p.id,
      parcelId: p.parcelId,
      area: p.area,
      treeCount,
      density: treeCount > 0 ? treeDensity(treeCount, p.area) : null,
      surveyedAt: g?._max.surveyedAt ?? null,
      uploadedAt: g?._max.createdAt ?? null,
    };
  });
}
