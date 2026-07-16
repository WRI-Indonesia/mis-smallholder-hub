// Fetch + perakitan data Farm Passport ("Profil Lahan") satu lahan — dipakai
// action Peta Lahan (map.ts) dan detail Petani (#172, farmer.ts).
// NOTE: TIDAK melakukan cek permission menu — caller WAJIB guard `hasPermission`
// sesuai menunya masing-masing; scope data (farmer group) di-enforce di sini.

import { centroid } from "@turf/turf";
import type { Polygon, MultiPolygon } from "geojson";
import { prisma } from "@/lib/prisma";
import { getAccessContext, farmerGroupAccessFilter } from "@/lib/access-context";
import { summarizeProduction } from "@/lib/map-data";
import type { ActionResult } from "@/types/action-result";
import type { FarmerTrainingItem, ParcelPassport } from "@/types/map";

// Main training packages shown on the passport (OTHER excluded).
export const TRAINING_PACKAGES: { code: string; label: string }[] = [
  { code: "PAKET_1_BMP_PC_RSPO_NKT", label: "Paket 1 - BMP" },
  { code: "PAKET_2_MK", label: "Paket 2 - MK" },
  { code: "PAKET_2_K3", label: "Paket 2 - HSE" },
  { code: "PAKET_3_4_GEDSI_FINANCIAL_LIVELIHOOD_BUSDEV", label: "Paket 3 & 4" },
];

/** Training completion items for a farmer (no permission/scope check). */
export async function computeFarmerTrainingItems(farmerId: string): Promise<FarmerTrainingItem[]> {
  const participations = await prisma.trainingParticipant.findMany({
    where: {
      farmerId,
      isActive: true,
      activity: { isActive: true, package: { code: { not: "OTHER" } } },
    },
    select: { activity: { select: { trainingDate: true, package: { select: { code: true } } } } },
  });

  const earliest = new Map<string, Date>();
  for (const p of participations) {
    const code = p.activity.package.code;
    const date = p.activity.trainingDate;
    const current = earliest.get(code);
    if (!current || date < current) earliest.set(code, date);
  }

  return TRAINING_PACKAGES.map(({ code, label }) => {
    const date = earliest.get(code);
    return { code, label, completed: date != null, date: date ? date.toISOString() : null };
  });
}

/**
 * All data for the Farm Passport PDF of a single parcel: farmer identity, land
 * info + geometry, training completion, and real per-year production.
 * RBAC-scoped via the parcel's farmer group.
 *
 * Pass `includeProduction: false` when the caller already holds the parcel's
 * production summary.
 */
export async function fetchParcelPassport(
  landParcelId: string,
  includeProduction = true
): Promise<ActionResult<ParcelPassport>> {
  const access = await getAccessContext();
  const parcel = await prisma.landParcel.findFirst({
    where: {
      id: landParcelId,
      isActive: true,
      farmer: { isActive: true, farmerGroup: farmerGroupAccessFilter(access) },
    },
    select: {
      parcelId: true,
      area: true,
      landStatus: true,
      cropType: true,
      plantingYear: true,
      notes: true,
      geometry: true,
      farmer: {
        select: {
          id: true,
          name: true,
          farmerId: true,
          gender: true,
          birthPlace: true,
          birthDate: true,
          nik: true,
          address: true,
          joinedYear: true,
          farmerGroup: {
            select: {
              name: true,
              code: true,
              district: { select: { name: true, province: { select: { name: true } } } },
            },
          },
        },
      },
    },
  });

  if (!parcel) {
    return { success: false, error: "Lahan tidak ditemukan atau Anda tidak memiliki akses" };
  }
  const geometry = parcel.geometry as unknown as Polygon | MultiPolygon | null;
  if (!geometry) {
    return { success: false, error: "Lahan tidak memiliki geometri" };
  }
  let center: [number, number];
  try {
    const c = centroid(geometry as never).geometry.coordinates;
    center = [c[0], c[1]];
  } catch {
    return { success: false, error: "Geometri lahan tidak valid" };
  }

  const farmer = parcel.farmer;
  const [training, prodRecords] = await Promise.all([
    computeFarmerTrainingItems(farmer.id),
    includeProduction
      ? prisma.productionRecord.findMany({
          where: { parcelId: landParcelId, isActive: true },
          select: { period: true, yieldKg: true },
        })
      : Promise.resolve([]),
  ]);

  return {
    success: true,
    data: {
      farmer: {
        name: farmer.name,
        code: farmer.farmerId,
        gender: farmer.gender,
        birthPlace: farmer.birthPlace,
        birthDate: farmer.birthDate ? farmer.birthDate.toISOString() : null,
        nik: farmer.nik,
        address: farmer.address,
        joinedYear: farmer.joinedYear,
      },
      group: {
        name: farmer.farmerGroup.name,
        code: farmer.farmerGroup.code,
        districtName: farmer.farmerGroup.district?.name ?? "—",
        provinceName: farmer.farmerGroup.district?.province?.name ?? "—",
      },
      parcel: {
        parcelId: parcel.parcelId,
        area: parcel.area,
        landStatus: parcel.landStatus,
        cropType: parcel.cropType,
        plantingYear: parcel.plantingYear,
        notes: parcel.notes,
        centroid: center,
        geometry,
      },
      training,
      production: summarizeProduction(prodRecords),
    },
  };
}
