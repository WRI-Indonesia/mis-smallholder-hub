"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { farmerGroupSchema, updateFarmerGroupSchema } from "@/validations/farmer-group.schema";
import type { FarmerGroupInput, UpdateFarmerGroupInput } from "@/validations/farmer-group.schema";
import { hasPermission, isSuperAdmin } from "@/lib/rbac";

import { getAccessContext, farmerGroupAccessFilter } from "@/lib/access-context";
import { buildFarmerGroupDetail } from "@/lib/farmer-group-detail";
import { computeCompleteness } from "@/lib/data-completeness";
import type { CompletenessGroupInput } from "@/types/data-completeness";

export async function getFarmerGroups(search?: string) {
  if (!(await hasPermission("master-data-groups", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }

  const access = await getAccessContext();

  // Soft-delete: hanya SUPERADMIN yang boleh melihat record nonaktif (badge +
  // filter Status di UI, untuk restore). User lain dibatasi ke record aktif.
  const where = {
    ...farmerGroupAccessFilter(access),
    ...((await isSuperAdmin()) ? {} : { isActive: true }),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { code: { contains: search, mode: "insensitive" as const } },
            { abrv: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const groups = await prisma.farmerGroup.findMany({
    where,
    include: {
      district: { select: { name: true } },
    },
    orderBy: { name: "asc" },
  });

  // Agregat turunan (jumlah petani/persil/total luas) diagregasi di DB — hindari
  // menarik 1 baris per petani + per lahan hanya untuk dihitung di JS, dan array
  // mentahnya tidak lagi ikut terkirim ke client (#163).
  const groupIds = groups.map((g) => g.id);
  const [farmers, parcelAggs] = await Promise.all([
    prisma.farmer.findMany({
      where: { isActive: true, farmerGroupId: { in: groupIds } },
      select: { id: true, farmerGroupId: true },
    }),
    prisma.landParcel.groupBy({
      by: ["farmerId"],
      where: { isActive: true, farmer: { isActive: true, farmerGroupId: { in: groupIds } } },
      _count: { _all: true },
      _sum: { area: true },
    }),
  ]);

  const farmerToGroup = new Map(farmers.map((f) => [f.id, f.farmerGroupId]));
  const stats = new Map<string, { farmersCount: number; parcelsCount: number; totalArea: number }>();
  for (const f of farmers) {
    const s = stats.get(f.farmerGroupId) ?? { farmersCount: 0, parcelsCount: 0, totalArea: 0 };
    s.farmersCount += 1;
    stats.set(f.farmerGroupId, s);
  }
  for (const p of parcelAggs) {
    const s = stats.get(farmerToGroup.get(p.farmerId) ?? "");
    if (!s) continue;
    s.parcelsCount += p._count._all;
    s.totalArea += p._sum.area ?? 0;
  }

  return groups.map((g) => ({
    ...g,
    farmersCount: stats.get(g.id)?.farmersCount ?? 0,
    parcelsCount: stats.get(g.id)?.parcelsCount ?? 0,
    totalArea: stats.get(g.id)?.totalArea ?? 0,
  }));
}

export async function getFarmerGroupById(id: string) {
  if (!(await hasPermission("master-data-groups", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }

  const access = await getAccessContext();

  // Scope enforced (cegah akses KT lintas wilayah via id). `AND` agar filter scope
  // `{ id: { in } }` (mode BY_FARMER_GROUP) tidak menimpa literal `id`. Hanya
  // SUPERADMIN yang boleh membuka detail KT nonaktif; user lain dibatasi ke aktif.
  return prisma.farmerGroup.findFirst({
    where: { id, AND: farmerGroupAccessFilter(access), ...((await isSuperAdmin()) ? {} : { isActive: true }) },
    include: { district: { select: { id: true, name: true } } },
  });
}

/**
 * Profil 360° satu Lembaga (#171): profil + agregat Petani/KT/Lahan/Pelatihan/
 * Produksi + skor kelengkapan DA-02. Real-time (keputusan #153/#154 — detail 1
 * entitas), agregasi di pure lib. Tidak memanggil action report/DA (beda
 * permission menu) — fetch sendiri di bawah guard master-data-groups.
 */
export async function getFarmerGroupDetail(id: string) {
  if (!(await hasPermission("master-data-groups", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }

  const access = await getAccessContext();

  const group = await prisma.farmerGroup.findFirst({
    where: { id, AND: farmerGroupAccessFilter(access), ...((await isSuperAdmin()) ? {} : { isActive: true }) },
    include: { district: { select: { id: true, name: true } } },
  });
  if (!group) return null;

  const [trainingPackages, activities, farmers] = await Promise.all([
    // Paket wajib (exclude OTHER) — basis cakupan pelatihan (pola DA-02).
    prisma.trainingPackage.findMany({
      where: { isActive: true, code: { not: "OTHER" } },
      select: { code: true, name: true },
      orderBy: { code: "asc" },
    }),
    prisma.trainingActivity.findMany({
      where: { farmerGroupId: id, isActive: true },
      select: {
        id: true,
        trainingDate: true,
        location: true,
        package: { select: { code: true, name: true } },
        participants: {
          where: { isActive: true },
          select: { preTestScore: true, postTestScore: true },
        },
      },
    }),
    prisma.farmer.findMany({
      where: { farmerGroupId: id, isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        farmerId: true,
        name: true,
        gender: true,
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
            subGroupLv1: true,
            subGroupLv2: true,
            blok: true,
            plantingYear: true,
            cropType: true,
            landStatus: true,
            // Dipakai untuk cek kelengkapan (computeCompleteness) + peta
            // sebaran lahan di tab Lahan (mapParcels).
            geometry: true,
          },
        },
        trainingParticipants: {
          where: { isActive: true, activity: { isActive: true, farmerGroupId: id } },
          select: {
            id: true,
            preTestScore: true,
            postTestScore: true,
            activity: { select: { package: { select: { code: true } } } },
          },
        },
        productionRecords: {
          where: { isActive: true },
          select: { id: true, parcelId: true, period: true, yieldKg: true },
        },
      },
    }),
  ]);

  const detail = buildFarmerGroupDetail(
    group.id,
    group.name,
    farmers.map((f) => ({
      id: f.id,
      farmerId: f.farmerId,
      name: f.name,
      gender: f.gender,
      landParcels: f.landParcels.map((p) => ({
        id: p.id,
        area: p.area,
        subGroupLv1: p.subGroupLv1,
        subGroupLv2: p.subGroupLv2,
        blok: p.blok,
      })),
      trainingParticipants: f.trainingParticipants.map((tp) => ({
        packageCode: tp.activity.package.code,
      })),
      productionRecords: f.productionRecords,
    })),
    activities.map((a) => ({
      id: a.id,
      trainingDate: a.trainingDate,
      location: a.location,
      packageCode: a.package.code,
      packageName: a.package.name,
      participants: a.participants,
    })),
    trainingPackages
  );

  // Skor kelengkapan DA-02 (card + link — rincian tetap di halaman Analisa).
  const completenessInput: CompletenessGroupInput = {
    id: group.id,
    name: group.name,
    code: group.code,
    abrv: group.abrv,
    joinYear: group.joinYear,
    locationLat: group.locationLat,
    locationLong: group.locationLong,
    district: { id: group.district.id, name: group.district.name },
    trainingPackages,
    activities: activities.map((a) => ({ packageCode: a.package.code })),
    farmers: farmers.map((f) => ({
      id: f.id,
      farmerId: f.farmerId,
      name: f.name,
      nik: f.nik,
      address: f.address,
      birthDate: f.birthDate,
      joinedYear: f.joinedYear,
      landParcels: f.landParcels.map((p) => ({
        parcelId: p.parcelId,
        geometry: p.geometry,
        area: p.area,
        plantingYear: p.plantingYear,
        cropType: p.cropType,
        landStatus: p.landStatus,
      })),
      trainingParticipants: f.trainingParticipants.map((tp) => ({
        id: tp.id,
        preTestScore: tp.preTestScore,
        postTestScore: tp.postTestScore,
        packageCode: tp.activity.package.code,
      })),
      productionRecords: f.productionRecords.map((r) => ({ id: r.id, parcelId: r.parcelId })),
    })),
  };
  const completeness = computeCompleteness(completenessInput);

  return {
    group,
    detail,
    completeness: {
      healthScore: completeness.healthScore,
      totalAnomalies: completeness.totalAnomalies,
    },
    // Poligon untuk peta sebaran lahan (tab Lahan) — hanya field yang dipakai peta/popup.
    mapParcels: farmers.flatMap((f) =>
      f.landParcels.map((p) => ({
        id: p.id,
        parcelId: p.parcelId,
        farmerName: f.name,
        farmerCode: f.farmerId,
        farmerGroupName: group.name,
        kelompokTani: p.subGroupLv2,
        gapoktan: p.subGroupLv1,
        blok: p.blok,
        area: p.area,
        geometry: p.geometry,
      }))
    ),
  };
}

export async function createFarmerGroup(input: FarmerGroupInput) {
  if (!(await hasPermission("master-data-groups", "CREATE"))) {
    return { success: false, error: "Tidak memiliki izin untuk menambah lembaga petani" };
  }

  const parsed = farmerGroupSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

  const session = await auth();

  await prisma.farmerGroup.create({
    data: {
      ...parsed.data,
      createdBy: session?.user?.id ?? null,
    },
  });

  return { success: true };
}

export async function updateFarmerGroup(input: UpdateFarmerGroupInput) {
  if (!(await hasPermission("master-data-groups", "EDIT"))) {
    return { success: false, error: "Tidak memiliki izin untuk mengubah lembaga petani" };
  }

  const parsed = updateFarmerGroupSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

  const session = await auth();
  const { id, ...data } = parsed.data;

  const access = await getAccessContext();

  // Verify group exists, is active, and is within the user's scope before updating
  const existing = await prisma.farmerGroup.findFirst({
    where: { id, isActive: true, AND: farmerGroupAccessFilter(access) },
    select: { id: true },
  });
  if (!existing) return { success: false, error: "Lembaga Petani tidak ditemukan atau tidak dalam akses Anda" };

  await prisma.farmerGroup.update({
    where: { id },
    data: { ...data, modifiedBy: session?.user?.id ?? null },
  });

  return { success: true };
}

export async function toggleFarmerGroupActive(id: string) {
  if (!(await hasPermission("master-data-groups", "DELETE"))) {
    return { success: false, error: "Tidak memiliki izin untuk menonaktifkan/mengaktifkan lembaga petani" };
  }

  const access = await getAccessContext();

  const group = await prisma.farmerGroup.findFirst({
    where: { id, AND: farmerGroupAccessFilter(access) },
    select: { isActive: true },
  });
  if (!group) return { success: false, error: "Lembaga Petani tidak ditemukan" };

  const session = await auth();

  await prisma.farmerGroup.update({
    where: { id },
    data: { isActive: !group.isActive, modifiedBy: session?.user?.id ?? null },
  });

  return { success: true };
}

export async function getDistrictsForSelect() {
  // Dipakai sebagai filter di halaman KT, Petani, & Pelatihan — izinkan bila
  // user punya VIEW pada salah satu menu tersebut.
  const allowed =
    (await hasPermission("master-data-groups", "VIEW")) ||
    (await hasPermission("master-data-farmers", "VIEW")) ||
    (await hasPermission("master-data-training", "VIEW"));
  if (!allowed) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }

  return prisma.district.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}
