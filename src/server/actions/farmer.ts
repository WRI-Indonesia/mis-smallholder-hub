"use server";

import { centroid } from "@turf/turf";
import type { Polygon, MultiPolygon } from "geojson";
import { prisma } from "@/lib/prisma";
import { fetchFarmerMarkerPoints } from "@/lib/land-marker-query";
import { nktAffectedStatusWhere, summarizeDocuments, summarizeStdb } from "@/lib/land-parcel-satellite-format";
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
import { computeFarmerTrainingItems, fetchParcelPassport } from "@/lib/parcel-passport-query";
import type { ActionResult } from "@/types/action-result";
import type { ParcelPassport } from "@/types/map";
import type { FarmerProfileBmpAssessment, FarmerProfileParcel, FarmerProfilePassport } from "@/types/farmer-profile";
import { getBmpAssessmentDetailView, type BmpAssessmentDetailView } from "@/server/actions/bmp-assessment-detail";
import { bmpActivityMaxScore } from "@/lib/bmp-survey-form";

/** Lampiran Profil Lahan diambil per lahan; batas paralel agar tak mengantre di pool pg (default 10). */
const PROFILE_PASSPORT_CONCURRENCY = 5;

/** Satu penilaian Monev BMP untuk PDF — angka sama dengan rincian inline tab Monev BMP (#346). */
function toProfileBmpAssessment(v: BmpAssessmentDetailView): FarmerProfileBmpAssessment {
  const byInd = new Map(v.details.map((d) => [d.indicatorId, d]));
  const individu = v.indicators.filter((i) => i.level === "INDIVIDU");
  return {
    id: v.assessment.id,
    surveyYear: v.assessment.surveyYear,
    surveyDate: v.assessment.surveyDate ? v.assessment.surveyDate.toISOString() : null,
    score: v.assessment.score,
    parcelId: v.assessment.parcelId,
    assessor: v.assessment.assessor,
    notes: v.assessment.notes,
    activities: (v.recomputed?.activities ?? []).map((a) => {
      const rows = individu.filter((i) => i.activityCode === a.activityCode);
      return {
        code: a.activityCode,
        name: a.activityName,
        score: a.indicatorScore,
        max: bmpActivityMaxScore(v.indicators, a.activityCode),
        filled: rows.filter((i) => byInd.get(i.id)?.score != null).length,
        total: rows.length,
      };
    }),
    groupFilled: v.groupAssessment ? v.groupAssessment.details.filter((d) => d.score != null).length : null,
    groupTotal: v.indicators.filter((i) => i.level === "LEMBAGA").length,
  };
}

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
  const [farmers, parcelCounts] = await Promise.all([
    prisma.farmer.findMany({
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
        // Lahan NKT per petani (#338): satu hitungan relasi ber-filter, bukan N+1 dan bukan baris lahan.
        _count: { select: { landParcels: { where: { isActive: true, identity: { nkt: nktAffectedStatusWhere() } } } } },
      },
      orderBy: { name: "asc" },
    }),
    // Jumlah lahan aktif per petani (#343): dasar dialog "> 10 lahan" sebelum
    // mencetak Profil Petani dari baris daftar. `_count` di atas sudah dipakai
    // filter NKT (satu relasi hanya bisa dihitung sekali per select), jadi
    // agregat kedua lewat groupBy — scope petani yang sama, tanpa baris lahan.
    prisma.landParcel.groupBy({
      by: ["farmerId"],
      where: { isActive: true, farmer: where },
      _count: { _all: true },
    }),
  ]);
  const parcelCountByFarmer = new Map(parcelCounts.map((r) => [r.farmerId, r._count._all]));
  return farmers.map(({ _count, ...f }) => ({
    ...f,
    nktCount: _count.landParcels,
    parcelCount: parcelCountByFarmer.get(f.id) ?? 0,
  }));
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

  const [farmer, trainingPackages, markerPoints] = await Promise.all([
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
            // Basis filter Exclude matriks produksi (#239).
            isPsr: true,
            // Untuk peta sebaran lahan petani (mapParcels) — tidak dipakai agregasi.
            geometry: true,
            // Satelit (#296) via identitas stabil — ringkasan surat & STDB di tab Lahan.
            identity: {
              select: {
                documents: { where: { isActive: true }, select: { type: true, number: true, holderName: true, statedArea: true } },
                stdbLinks: { where: { isActive: true, stdb: { isActive: true } }, select: { stdb: { select: { number: true, stage: true } } } },
                // Status NKT (#330): kolom tabel lahan + peta sebaran.
                nkt: { select: { status: true } },
              },
            },
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
    // Patok (#331) — sejajar dengan kueri lain; dibuang bila petani di luar scope (return null).
    fetchFarmerMarkerPoints(id),
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
        isPsr: p.isPsr,
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
    // Patok (#331): titik di peta sebaran + ringkasan.
    markerPoints,
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
      surat: summarizeDocuments(p.identity.documents),
      stdb: summarizeStdb(p.identity.stdbLinks.map((l) => l.stdb)),
      nktStatus: p.identity.nkt?.status ?? null,
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
      nktStatus: p.identity.nkt?.status ?? null,
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
  if (!(await hasPermission("master-data-farmers", "PRINT"))) {
    return { success: false, error: "Tidak memiliki izin untuk mencetak Profil Lahan" };
  }

  return fetchParcelPassport(landParcelId, true);
}

/**
 * Data PDF "Profil Petani" (#343): Bagian A ringkasan petani — angka identik
 * dengan Detail Petani karena sama-sama lewat `buildFarmerDetail` — plus
 * Bagian B lampiran Profil Lahan (`fetchParcelPassport`) untuk tiap lahan
 * ber-geometri. `includeParcels: false` = "Ringkasan saja" (dialog > 10
 * lahan): kueri lahan berat (tetangga ST_DWithin, patok, legalitas) tak
 * disentuh sama sekali. Guard PRINT menu Petani + scope petani; lampiran
 * mengikuti scope petani (lahan tak punya scope sendiri).
 */
export async function getFarmerProfilePassport(
  farmerId: string,
  { includeParcels = true }: { includeParcels?: boolean } = {},
): Promise<ActionResult<FarmerProfilePassport>> {
  if (!(await hasPermission("master-data-farmers", "PRINT"))) {
    return { success: false, error: "Tidak memiliki izin untuk mencetak Profil Petani" };
  }

  const access = await getAccessContext();
  const [farmer, trainingPackages] = await Promise.all([
    prisma.farmer.findFirst({
      where: {
        id: farmerId,
        ...farmerAccessFilter(access),
        // Petani nonaktif hanya bisa dicetak SUPERADMIN — sama dengan siapa yang bisa membuka detailnya.
        ...((await isSuperAdmin()) ? {} : { isActive: true }),
      },
      select: {
        id: true,
        name: true,
        farmerId: true,
        gender: true,
        nik: true,
        address: true,
        birthPlace: true,
        birthDate: true,
        joinedYear: true,
        isActive: true,
        createdAt: true,
        modifiedAt: true,
        farmerGroup: {
          select: {
            name: true,
            code: true,
            district: { select: { name: true, province: { select: { name: true } } } },
          },
        },
        landParcels: {
          where: { isActive: true },
          orderBy: { parcelId: "asc" },
          select: {
            id: true,
            parcelUid: true,
            parcelId: true,
            area: true,
            subGroupLv2: true,
            blok: true,
            plantingYear: true,
            cropType: true,
            landStatus: true,
            revision: true,
            isPsr: true,
            geometry: true,
            identity: {
              select: {
                documents: { where: { isActive: true }, select: { type: true, number: true, holderName: true, statedArea: true } },
                stdbLinks: { where: { isActive: true, stdb: { isActive: true } }, select: { stdb: { select: { number: true, stage: true } } } },
                nkt: { select: { status: true } },
              },
            },
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
  if (!farmer) return { success: false, error: "Petani tidak ditemukan atau Anda tidak memiliki akses" };

  const parcelIds = farmer.landParcels.map((p) => p.id);
  const parcelUids = farmer.landParcels.map((p) => p.parcelUid);
  // Pohon & patok per lahan: hitungan groupBy (pola #335) — jangan memuat titiknya.
  const [treeCounts, markerCounts] = parcelIds.length
    ? await Promise.all([
        prisma.tree.groupBy({ by: ["landParcelId"], where: { landParcelId: { in: parcelIds }, isActive: true }, _count: { _all: true } }),
        prisma.landParcelMarker.groupBy({ by: ["parcelUid"], where: { parcelUid: { in: parcelUids }, isActive: true }, _count: { _all: true } }),
      ])
    : [[], []];
  const treeCountByParcel = new Map(treeCounts.map((r) => [r.landParcelId, r._count._all]));
  const markerCountByUid = new Map(markerCounts.map((r) => [r.parcelUid, r._count._all]));

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
        isPsr: p.isPsr,
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

  const parcels: FarmerProfileParcel[] = farmer.landParcels.map((p) => {
    const geometry = p.geometry as unknown as Polygon | MultiPolygon | null;
    // Centroid dengan fungsi yang sama dengan fetchParcelPassport — geometri
    // yang gagal di sini pasti gagal di sana, jadi "belum dipetakan" konsisten.
    let center: [number, number] | null = null;
    if (geometry) {
      try {
        const c = centroid(geometry as never).geometry.coordinates;
        center = [c[0], c[1]];
      } catch {
        center = null;
      }
    }
    return {
      id: p.id,
      parcelId: p.parcelId,
      subGroupLv2: p.subGroupLv2,
      blok: p.blok,
      surat: summarizeDocuments(p.identity.documents),
      stdb: summarizeStdb(p.identity.stdbLinks.map((l) => l.stdb)),
      nktStatus: p.identity.nkt?.status ?? null,
      area: p.area,
      plantingYear: p.plantingYear,
      isPsr: p.isPsr,
      revision: p.revision,
      treeCount: treeCountByParcel.get(p.id) ?? 0,
      markerCount: markerCountByUid.get(p.parcelUid) ?? 0,
      geometry: center ? geometry : null,
      centroid: center,
    };
  });

  // Monev BMP (owner 2026-09-22): ikut aturan tab di layar — hanya bila VIEW
  // menu Monev BMP; tanpa izin → null (section & badge tidak dicetak). Rincian
  // per penilaian lewat action detail yang sama dengan tab (≤ 3 tahun/petani).
  let bmp: FarmerProfilePassport["bmp"] = null;
  if (await hasPermission("master-data-bmp-monev", "VIEW")) {
    const rows = await prisma.bmpAssessment.findMany({
      where: { farmerId: farmer.id, isActive: true },
      select: { id: true },
      orderBy: [{ surveyYear: "desc" }, { surveyDate: "desc" }],
    });
    const views = await Promise.all(rows.map((r) => getBmpAssessmentDetailView(r.id)));
    bmp = { assessments: views.filter((v): v is BmpAssessmentDetailView => v != null).map(toProfileBmpAssessment) };
  }

  // Bagian B: akses & checklist pelatihan dihitung SEKALI, lalu lahan
  // ber-geometri diambil per chunk paralel (bukan 40 kueri serentak).
  const parcelPassports: ParcelPassport[] = [];
  if (includeParcels) {
    const mapped = parcels.filter((p) => p.geometry);
    if (mapped.length > 0) {
      const training = await computeFarmerTrainingItems(farmer.id);
      for (let i = 0; i < mapped.length; i += PROFILE_PASSPORT_CONCURRENCY) {
        const chunk = mapped.slice(i, i + PROFILE_PASSPORT_CONCURRENCY);
        const results = await Promise.all(chunk.map((p) => fetchParcelPassport(p.id, true, { access, training })));
        for (const r of results) {
          if (!r.success || !r.data) return { success: false, error: r.success ? "Data lahan tidak ditemukan" : r.error };
          parcelPassports.push(r.data);
        }
      }
    }
  }

  return {
    success: true,
    data: {
      farmer: {
        name: farmer.name,
        code: farmer.farmerId,
        gender: farmer.gender,
        nik: farmer.nik,
        birthPlace: farmer.birthPlace,
        birthDate: farmer.birthDate ? farmer.birthDate.toISOString() : null,
        address: farmer.address,
        joinedYear: farmer.joinedYear,
        isActive: farmer.isActive,
        createdAt: farmer.createdAt.toISOString(),
        modifiedAt: farmer.modifiedAt.toISOString(),
      },
      group: {
        name: farmer.farmerGroup.name,
        code: farmer.farmerGroup.code,
        districtName: farmer.farmerGroup.district?.name ?? "—",
        provinceName: farmer.farmerGroup.district?.province?.name ?? "—",
      },
      subGroups: detail.subGroups,
      summary: detail.summary,
      parcels,
      training: {
        checklist: detail.pelatihan.checklist,
        history: detail.pelatihan.history.map((h) => ({ ...h, trainingDate: h.trainingDate.toISOString() })),
      },
      production: {
        all: detail.produksi.all,
        parcelBreakdown: detail.produksi.parcelBreakdown,
        currentYear: detail.produksi.currentYear,
      },
      parcelPassports,
      includeParcels,
      bmp,
    },
  };
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
