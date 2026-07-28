"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { getAccessContext, farmerGroupAccessFilter } from "@/lib/access-context";
import { buildAvailabilityEntry } from "@/lib/data-availability-aggregation";
import type { CompletenessGroupInput } from "@/types/data-completeness";
import type { AvailabilityGroupEntry, BmpFarmerGroupCategory, DataAvailabilityView } from "@/types/dashboard";

/**
 * Payload Dashboard Ketersediaan Data (DA-03, #193): satu entri per Lembaga
 * Petani berisi skor kelengkapan 5 domain + ringkasan anomali, dalam scope
 * data-access user. Scoring per Lembaga direuse dari DA-02 (computeCompleteness)
 * lewat `buildAvailabilityEntry` — angka dashboard dijamin sama dengan halaman
 * Analisa Ketersediaan Data.
 *
 * Live query seperti Dashboard Pelatihan (bukan snapshot): baris yang dibaca
 * berkolom sedikit sehingga volumenya masih ringan. Bila kelak melambat, jalur
 * fallback-nya snapshot per konvensi docs/database/dashboard-snapshots.md.
 */
export async function getDataAvailabilityView(): Promise<DataAvailabilityView> {
  if (!(await hasPermission("data-analyst-data-availability", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses dashboard ketersediaan data");
  }

  const access = await getAccessContext();
  const groupScope = farmerGroupAccessFilter(access);

  // Paket wajib (isActive, exclude OTHER) — basis cakupan domain Pelatihan,
  // identik dengan `analyzeFarmerGroupCompleteness`.
  const trainingPackages = await prisma.trainingPackage.findMany({
    where: { isActive: true, code: { not: "OTHER" } },
    select: { code: true, name: true },
    orderBy: { code: "asc" },
  });

  // Satu query nested mengikuti bentuk DA-02, lintas seluruh Lembaga dalam
  // scope — MINUS kolom `geometry` (GeoJSON poligon; memuat semuanya sekaligus
  // membengkakkan payload padahal scoring hanya butuh ada/tidaknya).
  const groups = await prisma.farmerGroup.findMany({
    where: { isActive: true, ...groupScope },
    select: {
      id: true,
      name: true,
      code: true,
      abrv: true,
      category: true,
      joinYear: true,
      locationLat: true,
      locationLong: true,
      districtId: true,
      district: { select: { id: true, name: true } },
      activities: {
        where: { isActive: true },
        select: { package: { select: { code: true } } },
      },
      farmers: {
        where: { isActive: true },
        select: {
          id: true,
          farmerId: true,
          name: true,
          nik: true,
          address: true,
          birthDate: true,
          joinedYear: true,
          landParcels: {
            where: { isActive: true },
            select: {
              id: true,
              parcelId: true,
              area: true,
              plantingYear: true,
              cropType: true,
              landStatus: true,
            },
          },
          // Nested where tidak bisa merujuk id Lembaga pemilik baris — partisipasi
          // "tamu" (activity Lembaga lain) disaring di JS di bawah, mengikuti
          // pola getTrainingDashboardView.
          trainingParticipants: {
            where: { isActive: true, activity: { isActive: true } },
            select: {
              id: true,
              preTestScore: true,
              postTestScore: true,
              activity: { select: { farmerGroupId: true, package: { select: { code: true } } } },
            },
          },
          productionRecords: {
            where: { isActive: true },
            select: { id: true, parcelId: true },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  // Kehadiran geometry per persil — id saja, poligonnya tidak ikut terangkut.
  // `farmer.isActive` ikut difilter agar himpunannya sama dengan persil yang
  // memang dinilai di atas. Scope digabung lewat relasi farmer (bukan spread
  // `districtId` literal — pitfall BUG-007).
  const withGeometry = await prisma.landParcel.findMany({
    where: {
      isActive: true,
      geometry: { not: Prisma.DbNull },
      farmer: { isActive: true, farmerGroup: { isActive: true, ...groupScope } },
    },
    select: { id: true },
  });
  const geometryIds = new Set(withGeometry.map((p) => p.id));

  const entries: AvailabilityGroupEntry[] = groups.map((g) => {
    const input: CompletenessGroupInput = {
      id: g.id,
      name: g.name,
      code: g.code,
      abrv: g.abrv,
      joinYear: g.joinYear,
      locationLat: g.locationLat,
      locationLong: g.locationLong,
      district: g.district,
      trainingPackages,
      activities: g.activities.map((a) => ({ packageCode: a.package.code })),
      farmers: g.farmers.map((f) => ({
        id: f.id,
        farmerId: f.farmerId,
        name: f.name,
        nik: f.nik,
        address: f.address,
        birthDate: f.birthDate,
        joinedYear: f.joinedYear,
        // Sentinel `{}` bila persil punya geometry — scoring DA-02 hanya
        // memeriksa null/tidaknya.
        landParcels: f.landParcels.map((p) => ({
          parcelId: p.parcelId,
          geometry: geometryIds.has(p.id) ? {} : null,
          area: p.area,
          plantingYear: p.plantingYear,
          cropType: p.cropType,
          landStatus: p.landStatus,
        })),
        // Hanya partisipasi pada activity Lembaga ini — sama dengan filter
        // `activity.farmerGroupId` di DA-02.
        trainingParticipants: f.trainingParticipants
          .filter((tp) => tp.activity.farmerGroupId === g.id)
          .map((tp) => ({
            id: tp.id,
            preTestScore: tp.preTestScore,
            postTestScore: tp.postTestScore,
            packageCode: tp.activity.package.code,
          })),
        productionRecords: f.productionRecords,
      })),
    };

    return buildAvailabilityEntry(input, {
      category: g.category as BmpFarmerGroupCategory,
      districtId: g.districtId,
    });
  });

  return {
    data: { groups: entries },
    generatedAt: new Date().toISOString(),
  };
}
