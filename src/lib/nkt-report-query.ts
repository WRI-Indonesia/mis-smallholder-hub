import { prisma } from "@/lib/prisma";
import { farmerGroupAccessFilter, type AccessContext } from "@/lib/access-context";
import type { NktReportData } from "@/lib/nkt-report";

/**
 * Pemuat data Laporan NKT per Lembaga (#332) — dipakai DUA pintu dengan gate
 * menu masing-masing (pola #313: menu key di-hardcode per entry point, bukan
 * diterima dari klien): Report › Lahan (`report-land-parcel` PRINT) dan Detail
 * Lembaga › tab Lahan (`master-data-groups` PRINT). Tanpa cek permission di sini;
 * cakupan akses (Lembaga dalam scope) tetap diterapkan lewat `access`.
 * Null = Lembaga tidak ada / di luar cakupan.
 */
export async function loadNktReportData(farmerGroupId: string, access: AccessContext): Promise<NktReportData | null> {
  const group = await prisma.farmerGroup.findFirst({
    where: { id: farmerGroupId, isActive: true, AND: farmerGroupAccessFilter(access) },
    select: { id: true, name: true, code: true, abrv: true, district: { select: { name: true } } },
  });
  if (!group) return null;

  const parcels = await prisma.landParcel.findMany({
    where: { isActive: true, farmer: { isActive: true, farmerGroupId } },
    select: {
      id: true, parcelId: true, area: true, subGroupLv2: true, blok: true, geometry: true,
      farmer: { select: { name: true, farmerId: true } },
      identity: { select: { nkt: { select: { status: true, categories: true, affectedAreaHa: true, affectedLengthM: true, assessedAt: true, assessor: true, source: true, notes: true } } } },
    },
    orderBy: { parcelId: "asc" },
  });
  return {
    group: { name: group.name, code: group.code, abrv: group.abrv, districtName: group.district?.name ?? null },
    parcels: parcels.map((p) => ({
      id: p.id,
      parcelId: p.parcelId,
      farmerName: p.farmer.name,
      farmerCode: p.farmer.farmerId,
      subGroupLv2: p.subGroupLv2,
      blok: p.blok,
      area: p.area,
      geometry: p.geometry,
      nkt: p.identity.nkt
        ? { ...p.identity.nkt, assessedAt: p.identity.nkt.assessedAt ? p.identity.nkt.assessedAt.toISOString().slice(0, 10) : null }
        : null,
    })),
    printedAt: new Date().toISOString(),
  };
}
