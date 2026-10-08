import { prisma } from "@/lib/prisma";
import { dataMonthsPerYear, type DataMonthsByYear } from "@/lib/productivity-annualize";

/**
 * Bulan ber-data per tahun satu Lembaga — basis penyetahunan produktivitas di Peta BMP
 * dan detail Petani (keputusan owner 2026-10-08). Satu groupBy per periode atas record
 * aktif milik petani aktif Lembaga itu (populasi sama dengan snapshot BMP). Caller
 * wajib sudah memastikan Lembaga ada dalam scope pengguna.
 */
export async function fetchGroupDataMonths(farmerGroupId: string): Promise<DataMonthsByYear> {
  const rows = await prisma.productionRecord.groupBy({
    by: ["period"],
    where: { isActive: true, farmer: { isActive: true, farmerGroupId } },
    _sum: { yieldKg: true },
    _count: { parcelId: true },
  });
  return dataMonthsPerYear(rows.map((r) => ({ period: r.period, kg: r._sum.yieldKg ?? 0, linked: r._count.parcelId })));
}
