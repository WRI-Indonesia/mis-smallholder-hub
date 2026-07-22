"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { farmerSchema, updateFarmerSchema } from "@/validations/farmer.schema";
import type { FarmerInput, UpdateFarmerInput } from "@/validations/farmer.schema";
import { hasPermission, isSuperAdmin } from "@/lib/rbac";

import {
  getAccessContext,
  farmerAccessFilter,
  farmerGroupAccessFilter,
} from "@/lib/access-context";
import { buildFarmerDetail } from "@/lib/farmer-detail";
import { fetchParcelPassport } from "@/lib/parcel-passport-query";
import type { ActionResult } from "@/types/action-result";
import type { ParcelPassport } from "@/types/map";

export async function getFarmers(search?: string, farmerGroupId?: string) {
  if (!(await hasPermission("master-data-farmers", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }

  const access = await getAccessContext();

  // Soft-delete: hanya SUPERADMIN yang boleh melihat record nonaktif (badge +
  // filter Status di UI, untuk restore). User lain dibatasi ke record aktif.
  const where = {
    ...farmerAccessFilter(access),
    ...((await isSuperAdmin()) ? {} : { isActive: true }),
    ...(farmerGroupId ? { farmerGroupId } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { farmerId: { contains: search, mode: "insensitive" as const } },
            { nik: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  // Select ramping sesuai interface Farmer di list client (+ round-trip form
  // edit) — hindari full-row farmerGroup/district ikut terkirim per petani (#163).
  return prisma.farmer.findMany({
    where,
    select: {
      id: true,
      farmerGroupId: true,
      name: true,
      farmerId: true,
      gender: true,
      nik: true,
      address: true,
      birthPlace: true,
      birthDate: true,
      joinedYear: true,
      isActive: true,
      farmerGroup: {
        select: {
          name: true,
          district: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function getFarmerById(id: string) {
  if (!(await hasPermission("master-data-farmers", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }

  const access = await getAccessContext();

  // Scope enforced. Hanya SUPERADMIN yang boleh membuka detail record nonaktif;
  // user lain dibatasi ke record aktif.
  return prisma.farmer.findFirst({
    where: {
      id,
      ...farmerAccessFilter(access),
      ...((await isSuperAdmin()) ? {} : { isActive: true }),
    },
    include: {
      farmerGroup: {
        include: {
          district: true,
        },
      },
      // KT turunan (#152): keanggotaan sub-kelompok bersifat per-lahan (#146).
      landParcels: {
        where: { isActive: true },
        select: { subGroupLv2: true },
      },
    },
  });
}

/**
 * Profil 360° satu Petani (#172): profil + Lahan (tabel + peta) + Pelatihan
 * (checklist paket + riwayat ber-skor) + Produksi (per tahun + bulanan +
 * ketersediaan). Real-time (keputusan #153/#154 — detail 1 entitas), agregasi
 * di pure lib `farmer-detail.ts`.
 */
export async function getFarmerDetail(id: string) {
  if (!(await hasPermission("master-data-farmers", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }

  const access = await getAccessContext();

  const [farmer, trainingPackages] = await Promise.all([
    prisma.farmer.findFirst({
      where: {
        id,
        ...farmerAccessFilter(access),
        ...((await isSuperAdmin()) ? {} : { isActive: true }),
      },
      include: {
        farmerGroup: { include: { district: true } },
        landParcels: {
          where: { isActive: true },
          orderBy: { parcelId: "asc" },
          select: {
            id: true,
            parcelId: true,
            area: true,
            subGroupLv2: true,
            blok: true,
            plantingYear: true,
            cropType: true,
            landStatus: true,
            revision: true,
            // Untuk peta sebaran lahan petani (mapParcels) — tidak dipakai agregasi.
            geometry: true,
          },
        },
        trainingParticipants: {
          where: { isActive: true, activity: { isActive: true } },
          select: {
            id: true,
            preTestScore: true,
            postTestScore: true,
            activity: {
              select: {
                trainingDate: true,
                location: true,
                package: { select: { code: true, name: true } },
              },
            },
          },
        },
        productionRecords: {
          where: { isActive: true },
          select: { parcelId: true, period: true, yieldKg: true },
        },
      },
    }),
    prisma.trainingPackage.findMany({
      where: { isActive: true, code: { not: "OTHER" } },
      select: { code: true, name: true },
      orderBy: { code: "asc" },
    }),
  ]);
  if (!farmer) return null;

  const detail = buildFarmerDetail(
    {
      nik: farmer.nik,
      address: farmer.address,
      birthPlace: farmer.birthPlace,
      birthDate: farmer.birthDate,
      joinedYear: farmer.joinedYear,
      landParcels: farmer.landParcels.map((p) => ({
        id: p.id,
        parcelId: p.parcelId,
        area: p.area,
        subGroupLv2: p.subGroupLv2,
        blok: p.blok,
        plantingYear: p.plantingYear,
        cropType: p.cropType,
        landStatus: p.landStatus,
        revision: p.revision,
      })),
      trainingParticipants: farmer.trainingParticipants.map((tp) => ({
        id: tp.id,
        packageCode: tp.activity.package.code,
        packageName: tp.activity.package.name,
        trainingDate: tp.activity.trainingDate,
        location: tp.activity.location,
        preTestScore: tp.preTestScore,
        postTestScore: tp.postTestScore,
      })),
      productionRecords: farmer.productionRecords,
    },
    trainingPackages,
  );

  return {
    farmer: {
      id: farmer.id,
      farmerGroupId: farmer.farmerGroupId,
      gender: farmer.gender,
      name: farmer.name,
      farmerId: farmer.farmerId,
      nik: farmer.nik,
      address: farmer.address,
      birthPlace: farmer.birthPlace,
      birthDate: farmer.birthDate,
      joinedYear: farmer.joinedYear,
      isActive: farmer.isActive,
      createdAt: farmer.createdAt,
      modifiedAt: farmer.modifiedAt,
      farmerGroup: {
        id: farmer.farmerGroup.id,
        name: farmer.farmerGroup.name,
        district: { name: farmer.farmerGroup.district.name },
      },
    },
    detail,
    // Tabel persil (tanpa geometry) + poligon peta (pola #171).
    parcels: farmer.landParcels.map((p) => ({
      id: p.id,
      parcelId: p.parcelId,
      area: p.area,
      subGroupLv2: p.subGroupLv2,
      blok: p.blok,
      plantingYear: p.plantingYear,
      cropType: p.cropType,
      landStatus: p.landStatus,
      revision: p.revision,
    })),
    mapParcels: farmer.landParcels.map((p) => ({
      id: p.id,
      parcelId: p.parcelId,
      farmerName: farmer.name,
      farmerCode: farmer.farmerId,
      farmerGroupName: farmer.farmerGroup.name,
      kelompokTani: p.subGroupLv2,
      blok: p.blok,
      area: p.area,
      geometry: p.geometry,
    })),
  };
}

/**
 * Data Farm Passport ("Profil Lahan") untuk PDF di tab Lahan detail Petani
 * (#172) — guard menu petani (bukan action map, beda permission); scope lahan
 * di-enforce di lib.
 */
export async function getFarmerParcelPassport(
  landParcelId: string,
): Promise<ActionResult<ParcelPassport>> {
  if (!(await hasPermission("master-data-farmers", "VIEW"))) {
    return { success: false, error: "Tidak memiliki izin untuk mengakses data ini" };
  }

  return fetchParcelPassport(landParcelId, true);
}

export async function createFarmer(input: FarmerInput) {
  if (!(await hasPermission("master-data-farmers", "CREATE"))) {
    return { success: false, error: "Tidak memiliki izin untuk menambah petani" };
  }

  const parsed = farmerSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

  // Pastikan lembaga tani target berada dalam scope data-access user.
  const access = await getAccessContext();
  const targetGroup = await prisma.farmerGroup.findFirst({
    // `AND` (bukan spread) agar filter scope `{ id: { in } }` pada mode
    // BY_FARMER_GROUP tidak menimpa literal `id` di atas.
    where: { id: parsed.data.farmerGroupId, isActive: true, AND: farmerGroupAccessFilter(access) },
    select: { id: true },
  });
  if (!targetGroup) {
    return {
      success: false,
      error: "Tidak memiliki izin untuk menambah petani ke lembaga tani ini",
    };
  }

  // Keunikan `farmerId` berlaku **per Lembaga** (TD-024). Ditegakkan juga di DB
  // lewat `@@unique([farmerGroupId, farmerId])`; cek di sini agar pengguna dapat
  // pesan yang jelas di kolomnya, bukan galat constraint mentah.
  // Termasuk baris nonaktif: constraint DB tidak mengenal soft delete, dan
  // memakai ulang ID milik petani nonaktif memecah riwayatnya.
  const duplicate = await prisma.farmer.findFirst({
    where: { farmerGroupId: parsed.data.farmerGroupId, farmerId: parsed.data.farmerId },
    select: { id: true, isActive: true },
  });
  if (duplicate) {
    return {
      success: false,
      error: {
        farmerId: [
          duplicate.isActive
            ? "ID Petani sudah terdaftar di lembaga ini"
            : "ID Petani dipakai petani nonaktif di lembaga ini — aktifkan kembali datanya",
        ],
      },
    };
  }

  const session = await auth();

  await prisma.farmer.create({
    data: {
      ...parsed.data,
      createdBy: session?.user?.id ?? null,
    },
  });

  return { success: true };
}

export async function updateFarmer(input: UpdateFarmerInput) {
  if (!(await hasPermission("master-data-farmers", "EDIT"))) {
    return { success: false, error: "Tidak memiliki izin untuk mengubah petani" };
  }

  const parsed = updateFarmerSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

  const session = await auth();
  const { id, ...data } = parsed.data;

  const access = await getAccessContext();

  // Verify farmer exists, is active, and is within the user's scope before updating
  const existing = await prisma.farmer.findFirst({
    where: { id, isActive: true, ...farmerAccessFilter(access) },
  });
  if (!existing) return { success: false, error: "Petani tidak ditemukan atau sudah tidak aktif" };

  // Cegah pemindahan petani ke lembaga tani di luar scope user.
  const targetGroup = await prisma.farmerGroup.findFirst({
    where: { id: data.farmerGroupId, isActive: true, AND: farmerGroupAccessFilter(access) },
    select: { id: true },
  });
  if (!targetGroup) {
    return {
      success: false,
      error: "Tidak memiliki izin untuk memindahkan petani ke lembaga tani ini",
    };
  }

  // Keunikan per Lembaga (TD-024) — dicek ulang karena ID *dan* lembaga bisa
  // sama-sama berubah dalam satu penyuntingan. `id: { not: id }` mengecualikan
  // baris yang sedang diedit agar menyimpan tanpa mengubah ID tidak ditolak.
  const duplicate = await prisma.farmer.findFirst({
    where: {
      id: { not: id },
      farmerGroupId: data.farmerGroupId,
      farmerId: data.farmerId,
    },
    select: { id: true, isActive: true },
  });
  if (duplicate) {
    return {
      success: false,
      error: {
        farmerId: [
          duplicate.isActive
            ? "ID Petani sudah terdaftar di lembaga ini"
            : "ID Petani dipakai petani nonaktif di lembaga ini — aktifkan kembali datanya",
        ],
      },
    };
  }

  await prisma.farmer.update({
    where: { id },
    data: { ...data, modifiedBy: session?.user?.id ?? null },
  });

  return { success: true };
}

export async function toggleFarmerActive(id: string) {
  if (!(await hasPermission("master-data-farmers", "DELETE"))) {
    return { success: false, error: "Tidak memiliki izin untuk menonaktifkan/mengaktifkan petani" };
  }

  const access = await getAccessContext();

  const farmer = await prisma.farmer.findFirst({
    where: { id, ...farmerAccessFilter(access) },
    select: { isActive: true },
  });
  if (!farmer) return { success: false, error: "Petani tidak ditemukan" };

  const session = await auth();
  await prisma.farmer.update({
    where: { id },
    data: { isActive: !farmer.isActive, modifiedBy: session?.user?.id ?? null },
  });

  return { success: true };
}
