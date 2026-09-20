"use server";

import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { getAccessContext, farmerGroupAccessFilter } from "@/lib/access-context";
import type { BmpMonevDashboardView, BmpMonevGroupEntry } from "@/lib/bmp-monev-dashboard-aggregation";

/**
 * Payload Dashboard Monev BMP (#344): satu entri per Lembaga Petani beserta
 * seluruh penilaian aktifnya (petani, tahun, skor), dalam scope data-access
 * user. Query langsung seperti Dashboard Pelatihan — volume kecil (≤ 12.000
 * petani × beberapa tahun), agregasi di klien dari payload ini.
 *
 * Terpisah dari BMP Dashboard (Produksi): grain berbeda (penilaian tahunan vs
 * produksi bulanan) dan dashboard produksi bergantung snapshot.
 */
export async function getBmpMonevDashboardView(): Promise<BmpMonevDashboardView> {
  if (!(await hasPermission("dashboard-bmp-monev", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses dashboard Monev BMP");
  }

  const access = await getAccessContext();

  const groups = await prisma.farmerGroup.findMany({
    where: { isActive: true, ...farmerGroupAccessFilter(access) },
    select: {
      id: true,
      name: true,
      code: true,
      districtId: true,
      district: { select: { name: true } },
      // Denominator cakupan: seluruh petani aktif Lembaga (bukan hanya yang dinilai).
      _count: { select: { farmers: { where: { isActive: true } } } },
      farmers: {
        where: { isActive: true, bmpAssessments: { some: { isActive: true } } },
        select: {
          id: true,
          bmpAssessments: {
            where: { isActive: true },
            select: { surveyYear: true, score: true },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const entries: BmpMonevGroupEntry[] = groups.map((g) => ({
    id: g.id,
    name: g.name,
    code: g.code,
    districtId: g.districtId,
    districtName: g.district.name,
    totalFarmers: g._count.farmers,
    assessments: g.farmers.flatMap((f) =>
      f.bmpAssessments.map((a) => ({ farmerId: f.id, surveyYear: a.surveyYear, score: a.score })),
    ),
  }));

  return { data: { groups: entries }, generatedAt: new Date().toISOString() };
}
