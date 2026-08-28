"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { landParcelSchema, updateLandParcelSchema } from "@/validations/land-parcel.schema";
import type { LandParcelInput, UpdateLandParcelInput } from "@/validations/land-parcel.schema";
import { hasPermission, isSuperAdmin } from "@/lib/rbac";

import {
  getAccessContext,
  farmerAccessFilter,
  farmerRelationAccessFilter,
} from "@/lib/access-context";
import { getFarmerOptions } from "@/lib/select-options";
import { summarizeProduction } from "@/lib/map-data";
import { fetchParcelPassport } from "@/lib/parcel-passport-query";
import { parcelIdentityUpsertArgs } from "@/lib/land-parcel-identity";
import type { ActionResult } from "@/types/action-result";
import type { ParcelPassport, ProductionSummary } from "@/types/map";
import type { LandParcelSatellites } from "@/types/land-parcel";

/**
 * Daftar petani (opsi) dalam scope, khusus untuk form Lahan. Dibungkus sebagai
 * Server Action agar bisa dipanggil lazy dari komponen klien (mis. modal Edit
 * dari peta) — `getFarmerOptions` di `@/lib/select-options` bukan action, jadi
 * tak boleh diimpor langsung ke bundle klien (menarik Prisma/`pg`/`fs`).
 */
export async function getParcelFarmerOptions() {
  return getFarmerOptions("master-data-parcels");
}

export async function getLandParcels(search?: string, farmerId?: string) {
  if (!(await hasPermission("master-data-parcels", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }

  const access = await getAccessContext();

  // Soft-delete: hanya SUPERADMIN yang boleh melihat record nonaktif (badge +
  // filter Status di UI, untuk restore). User lain dibatasi ke record aktif.
  const where = {
    ...farmerRelationAccessFilter(access),
    ...((await isSuperAdmin()) ? {} : { isActive: true }),
    ...(farmerId ? { farmerId } : {}),
    ...(search
      ? {
          OR: [
            { parcelId: { contains: search, mode: "insensitive" as const } },
            { farmer: { name: { contains: search, mode: "insensitive" as const } } },
            { farmer: { farmerId: { contains: search, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  // Select ramping sesuai kolom list client — tanpa `geometry` (GeoJSON polygon
  // besar, hanya dipakai halaman detail) agar payload list tetap ringan (#163).
  return prisma.landParcel.findMany({
    where,
    select: {
      id: true,
      farmerId: true,
      parcelId: true,
      blok: true,
      subGroupLv2: true,
      area: true,
      landStatus: true,
      cropType: true,
      species: true,
      isPsr: true,
      plantingYear: true,
      revision: true,
      isActive: true,
      notes: true,
      farmer: {
        select: {
          id: true,
          name: true,
          farmerId: true,
          farmerGroup: {
            select: {
              id: true,
              name: true,
              district: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
    orderBy: { parcelId: "asc" },
  });
}

export async function getLandParcelById(id: string) {
  if (!(await hasPermission("master-data-parcels", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }

  const access = await getAccessContext();

  // Scope enforced (lahan milik petani dalam jurisdiksi user). Hanya SUPERADMIN
  // yang boleh membuka detail lahan nonaktif; user lain dibatasi ke aktif.
  return prisma.landParcel.findFirst({
    where: { id, ...farmerRelationAccessFilter(access), ...((await isSuperAdmin()) ? {} : { isActive: true }) },
    include: {
      farmer: {
        include: {
          farmerGroup: {
            include: {
              district: true,
            },
          },
        },
      },
    },
  });
}

/**
 * Ringkasan produksi satu lahan (halaman Detail Lahan): rata-rata bulanan
 * lintas tahun + rincian per tahun. Scope ditegakkan lewat lembaga si petani.
 */
export async function getLandParcelProduction(id: string): Promise<ProductionSummary | null> {
  if (!(await hasPermission("master-data-parcels", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }

  const access = await getAccessContext();

  const parcel = await prisma.landParcel.findFirst({
    where: { id, ...farmerRelationAccessFilter(access) },
    select: { id: true },
  });
  if (!parcel) return null;

  const records = await prisma.productionRecord.findMany({
    where: { parcelId: id, isActive: true },
    select: { period: true, yieldKg: true },
  });

  return summarizeProduction(records);
}

/**
 * Lahan aktif lain milik petani yang sama — tabel navigasi antar-lahan
 * (kode/luas/tahun tanam/jumlah pohon) dan overlay peta (warna berbeda) di
 * halaman Detail Lahan. Scope via lembaga si petani.
 */
export async function getFarmerSiblingParcels(farmerId: string, excludeParcelDbId: string) {
  if (!(await hasPermission("master-data-parcels", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }

  const access = await getAccessContext();

  const parcels = await prisma.landParcel.findMany({
    where: {
      farmerId,
      isActive: true,
      id: { not: excludeParcelDbId },
      ...farmerRelationAccessFilter(access),
    },
    select: { id: true, parcelId: true, geometry: true, area: true, plantingYear: true },
    orderBy: { parcelId: "asc" },
  });
  if (parcels.length === 0) return [];

  // Jumlah pohon aktif per lahan — agregat, jangan tarik titiknya (#238).
  const grouped = await prisma.tree.groupBy({
    by: ["landParcelId"],
    where: { landParcelId: { in: parcels.map((p) => p.id) }, isActive: true },
    _count: { _all: true },
  });
  const treeCounts = new Map(grouped.map((g) => [g.landParcelId, g._count._all]));

  return parcels.map((p) => ({ ...p, treeCount: treeCounts.get(p.id) ?? 0 }));
}

/**
 * Data Farm Passport ("Profil Lahan" PDF) untuk halaman Detail Lahan — guard
 * menu Lahan, berbeda dari varian menu Peta (map.ts) dan Petani (farmer.ts).
 */
export async function getLandParcelPassport(
  landParcelId: string,
): Promise<ActionResult<ParcelPassport>> {
  if (!(await hasPermission("master-data-parcels", "PRINT"))) {
    return { success: false, error: "Tidak memiliki izin untuk mencetak Profil Lahan" };
  }

  return fetchParcelPassport(landParcelId, true);
}

export async function createLandParcel(input: LandParcelInput) {
  if (!(await hasPermission("master-data-parcels", "CREATE"))) {
    return { success: false, error: "Tidak memiliki izin untuk menambah lahan" };
  }

  const parsed = landParcelSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

  // Pastikan petani target berada dalam scope data-access user.
  const access = await getAccessContext();
  const targetFarmer = await prisma.farmer.findFirst({
    where: { id: parsed.data.farmerId, isActive: true, ...farmerAccessFilter(access) },
    select: { id: true },
  });
  if (!targetFarmer) {
    return { success: false, error: { farmerId: ["Tidak memiliki izin untuk menambah lahan ke petani ini"] } };
  }

  const session = await auth();

  // Check unique parcelId per farmer
  const duplicate = await prisma.landParcel.findFirst({
    where: {
      farmerId: parsed.data.farmerId,
      parcelId: parsed.data.parcelId,
      isActive: true,
    },
  });
  if (duplicate) {
    return { success: false, error: { parcelId: ["ID Lahan sudah terdaftar untuk petani ini"] } };
  }

  // Identitas stabil antar revisi (Decision Log 2026-08-27): satu baris per
  // pasangan (farmer, parcelId). Upsert — pasangan bisa sudah ada bila lahan
  // pernah dinonaktifkan lalu didaftarkan ulang.
  const identity = await prisma.landParcelIdentity.upsert(
    parcelIdentityUpsertArgs(parsed.data, session?.user?.id ?? null)
  );

  await prisma.landParcel.create({
    data: {
      ...parsed.data,
      parcelUid: identity.id,
      geometry: parsed.data.geometry ?? null,
      revision: 0,
      createdBy: session?.user?.id ?? null,
    },
  });

  return { success: true };
}

export async function updateLandParcel(input: UpdateLandParcelInput) {
  if (!(await hasPermission("master-data-parcels", "EDIT"))) {
    return { success: false, error: "Tidak memiliki izin untuk mengubah lahan" };
  }

  const parsed = updateLandParcelSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

  const session = await auth();
  const { id, ...data } = parsed.data;

  const access = await getAccessContext();

  const existing = await prisma.landParcel.findFirst({
    where: { id, isActive: true, ...farmerRelationAccessFilter(access) },
  });
  if (!existing) return { success: false, error: "Lahan tidak ditemukan atau tidak dalam akses Anda" };

  // Cegah pemindahan lahan ke petani di luar scope user.
  if (data.farmerId !== existing.farmerId) {
    const targetFarmer = await prisma.farmer.findFirst({
      where: { id: data.farmerId, isActive: true, ...farmerAccessFilter(access) },
      select: { id: true },
    });
    if (!targetFarmer) {
      return { success: false, error: { farmerId: ["Tidak memiliki izin untuk memindahkan lahan ke petani ini"] } };
    }
  }

  // Check unique parcelId per farmer if parcelId or farmerId is changing
  if (data.parcelId !== existing.parcelId || data.farmerId !== existing.farmerId) {
    const duplicate = await prisma.landParcel.findFirst({
      where: {
        id: { not: id },
        farmerId: data.farmerId,
        parcelId: data.parcelId,
        isActive: true,
      },
    });
    if (duplicate) {
      return { success: false, error: { parcelId: ["ID Lahan sudah terdaftar untuk petani ini"] } };
    }
  }

  // Identitas stabil (#296) mengikuti pasangan (farmerId, parcelId). Bila
  // pasangan diganti lewat form: pindahkan baris identitas (satelit ikut),
  // kecuali pasangan baru sudah punya identitas (lahan lama yang pernah
  // dinonaktifkan) → lahan diarahkan ke identitas itu.
  let parcelUid: string | undefined;
  if (data.parcelId !== existing.parcelId || data.farmerId !== existing.farmerId) {
    const target = await prisma.landParcelIdentity.findUnique({
      where: { farmerId_parcelId: { farmerId: data.farmerId, parcelId: data.parcelId } },
      select: { id: true },
    });
    if (target && target.id !== existing.parcelUid) {
      parcelUid = target.id;
      await prisma.landParcelIdentity.update({ where: { id: target.id }, data: { isActive: true, modifiedBy: session?.user?.id ?? null } });
    } else if (!target) {
      await prisma.landParcelIdentity.update({
        where: { id: existing.parcelUid },
        data: { farmerId: data.farmerId, parcelId: data.parcelId, modifiedBy: session?.user?.id ?? null },
      });
    }
  }

  await prisma.landParcel.update({
    where: { id },
    data: {
      ...data,
      ...(parcelUid ? { parcelUid } : {}),
      // Geometry hanya ditulis bila client mengirim field-nya (undefined = tidak
      // diubah). Payload list & form edit tidak membawa geometry (#163), jadi
      // edit dari list tidak boleh menghapus polygon existing.
      geometry: data.geometry !== undefined ? data.geometry : undefined,
      revision: existing.revision + 1,  // Auto-increment, abaikan input dari client
      modifiedBy: session?.user?.id ?? null,
    },
  });

  // Tree menyimpan parcelId denormalisasi (#238) — ikutkan bila ID lahan
  // diganti lewat form, agar jangkar bisnis titik pohon tidak basi.
  if (data.parcelId !== existing.parcelId) {
    await prisma.tree.updateMany({
      where: { landParcelId: id },
      data: { parcelId: data.parcelId, modifiedBy: session?.user?.id ?? null },
    });
  }

  return { success: true };
}

export async function deleteLandParcel(id: string) {
  if (!(await hasPermission("master-data-parcels", "DELETE"))) {
    return { success: false, error: "Tidak memiliki izin untuk menonaktifkan lahan" };
  }

  const access = await getAccessContext();

  const existing = await prisma.landParcel.findFirst({
    where: { id, isActive: true, ...farmerRelationAccessFilter(access) },
    select: { id: true },
  });
  if (!existing) return { success: false, error: "Lahan tidak ditemukan atau tidak dalam akses Anda" };

  const session = await auth();

  await prisma.landParcel.update({
    where: { id },
    data: {
      isActive: false,
      modifiedBy: session?.user?.id ?? null,
    },
  });

  return { success: true };
}

/** Toggle aktif/nonaktif lahan (restore-capable) untuk aksi baris pada list. */
export async function toggleLandParcelActive(id: string) {
  if (!(await hasPermission("master-data-parcels", "DELETE"))) {
    return { success: false, error: "Tidak memiliki izin untuk menonaktifkan/mengaktifkan lahan" };
  }

  const access = await getAccessContext();

  const existing = await prisma.landParcel.findFirst({
    where: { id, ...farmerRelationAccessFilter(access) },
    select: { isActive: true },
  });
  if (!existing) return { success: false, error: "Lahan tidak ditemukan atau tidak dalam akses Anda" };

  const session = await auth();

  await prisma.landParcel.update({
    where: { id },
    data: { isActive: !existing.isActive, modifiedBy: session?.user?.id ?? null },
  });

  return { success: true };
}

/**
 * Satelit lahan (#296) untuk halaman Detail Lahan: dokumen kepemilikan, STDB,
 * UL Parcel Code, program. Menempel ke `parcelUid` (identitas stabil antar
 * revisi), jadi dibaca lewat baris lahan yang diminta — scope ditegakkan pada
 * baris lahan itu (`farmerRelationAccessFilter`), satelit tidak punya scope
 * sendiri. `rawGeometry` UL Parcel Code sengaja tidak ikut (payload besar, hanya
 * untuk audit).
 */
export async function getLandParcelSatellites(landParcelId: string): Promise<LandParcelSatellites | null> {
  if (!(await hasPermission("master-data-parcels", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }
  const access = await getAccessContext();
  const parcel = await prisma.landParcel.findFirst({
    where: { id: landParcelId, isActive: true, ...farmerRelationAccessFilter(access) },
    select: { parcelUid: true },
  });
  if (!parcel) return null;
  const uid = parcel.parcelUid;

  const [documents, stdbLinks, externalIds, programs] = await Promise.all([
    prisma.landParcelDocument.findMany({
      where: { parcelUid: uid, isActive: true },
      select: { id: true, type: true, typeRaw: true, number: true, holderName: true, statedArea: true, issuedYear: true, custodyNote: true, fileUrl: true, notes: true },
      orderBy: [{ type: "asc" }, { number: "asc" }],
    }),
    prisma.landParcelStdb.findMany({
      where: { parcelUid: uid, isActive: true, stdb: { isActive: true } },
      select: {
        stdb: {
          select: {
            id: true, number: true, holderName: true, statedArea: true, issuedYear: true, notes: true,
            // Lahan lain yang ditutup STDB yang sama (aktif) — ditampilkan sebagai konteks.
            parcelLinks: { where: { isActive: true, parcelUid: { not: uid } }, select: { parcel: { select: { parcelId: true, revisions: { where: { isActive: true }, select: { id: true }, take: 1 } } } } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.landParcelExternalId.findMany({
      where: { parcelUid: uid, isActive: true },
      select: { id: true, source: true, code: true, mappedAt: true, notes: true, rawGeometry: false },
      orderBy: [{ source: "asc" }, { code: "asc" }],
    }),
    prisma.landParcelProgram.findMany({
      where: { parcelUid: uid, isActive: true },
      select: { id: true, programType: true, status: true, startDate: true, endDate: true, notes: true },
      orderBy: { startDate: "desc" },
    }),
  ]);

  return {
    parcelUid: uid,
    documents,
    stdbs: stdbLinks.map((l) => ({
      id: l.stdb.id,
      number: l.stdb.number,
      holderName: l.stdb.holderName,
      statedArea: l.stdb.statedArea,
      issuedYear: l.stdb.issuedYear,
      notes: l.stdb.notes,
      // Hanya lahan yang masih punya revisi aktif — identitas tidak ikut nonaktif saat lahan dihapus.
      otherParcels: l.stdb.parcelLinks
        .filter((p) => p.parcel.revisions.length > 0)
        .map((p) => ({ parcelId: p.parcel.parcelId, id: p.parcel.revisions[0].id })),
    })),
    externalIds,
    programs,
  };
}
