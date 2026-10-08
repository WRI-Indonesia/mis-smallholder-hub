import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { dataMonthsPerYear, type DataMonthsByYear } from "@/lib/productivity-annualize";

/**
 * Bulan ber-data per tahun satu Lembaga — basis penyetahunan produktivitas di Peta BMP,
 * detail Petani/Lahan, dan Profil Lahan (keputusan owner 2026-10-08). Satu groupBy per
 * periode atas record aktif petani aktif Lembaga (populasi snapshot BMP), DITAMBAH record
 * yang ikut dihitung di halaman pemanggil tetapi di luar populasi itu (`also`): record
 * petani nonaktif yang sedang dibuka SUPERADMIN, atau record persil yang tercatat atas
 * nama pemilik lain — supaya bulan mereka tidak hilang dari pembagi (review 7cbf0f1).
 * `groupWhere` wajib sudah memuat scope akses pengguna (atau menunjuk Lembaga yang
 * sudah lolos scope).
 */
export async function fetchGroupDataMonths(
  groupWhere: Prisma.FarmerGroupWhereInput,
  also: Prisma.ProductionRecordWhereInput[] = []
): Promise<DataMonthsByYear> {
  const rows = await prisma.productionRecord.groupBy({
    by: ["period"],
    where: { isActive: true, OR: [{ farmer: { isActive: true, farmerGroup: groupWhere } }, ...also] },
    _sum: { yieldKg: true },
    _count: { parcelId: true },
  });
  return dataMonthsPerYear(rows.map((r) => ({ period: r.period, kg: r._sum.yieldKg ?? 0, linked: r._count.parcelId })));
}
