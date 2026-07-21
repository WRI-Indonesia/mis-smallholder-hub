"use server";

import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { getAccessContext, farmerGroupAccessFilter } from "@/lib/access-context";
import { TRAINING_PACKAGE_ORDER } from "@/lib/training-dashboard-aggregation";
import type {
  TrainingDashboardView,
  TrainingGroupEntry,
  TrainingPackageCode,
  UntrainedFarmer,
} from "@/types/dashboard";

/**
 * Payload Dashboard Pelatihan: satu entri per Lembaga Petani beserta seluruh
 * kegiatan + pesertanya, dalam scope data-access user.
 *
 * Berbeda dari Dashboard BMP yang membaca snapshot tersimpan, di sini query
 * langsung ke DB — volume pelatihan jauh lebih kecil (ratusan kegiatan) sehingga
 * agregasi cukup dilakukan client-side dari payload ini.
 */
export async function getTrainingDashboardView(): Promise<TrainingDashboardView> {
  if (!(await hasPermission("dashboard-training", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses dashboard pelatihan");
  }

  const access = await getAccessContext();

  const groups = await prisma.farmerGroup.findMany({
    where: { isActive: true, ...farmerGroupAccessFilter(access) },
    select: {
      id: true,
      name: true,
      code: true,
      category: true,
      districtId: true,
      district: { select: { name: true } },
      // Denominator cakupan: seluruh petani aktif Lembaga (bukan hanya yang pernah dilatih).
      _count: { select: { farmers: { where: { isActive: true } } } },
      activities: {
        where: { isActive: true },
        select: {
          id: true,
          trainingDate: true,
          location: true,
          evidenceKey: true,
          package: { select: { code: true } },
          // `farmer.isActive` ikut difilter: petani yang dinonaktifkan setelah
          // ikut pelatihan tidak boleh tetap menambah pembilang cakupan padahal
          // sudah keluar dari penyebut (`_count.farmers` di atas) — kalau tidak,
          // sel bisa tembus 100% dan drill-down jadi tak terjangkau.
          participants: {
            where: { isActive: true, farmer: { isActive: true } },
            select: {
              farmerId: true,
              preTestScore: true,
              postTestScore: true,
              farmer: { select: { gender: true, farmerGroupId: true } },
            },
          },
        },
        orderBy: { trainingDate: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  const entries: TrainingGroupEntry[] = groups.map((g) => ({
    id: g.id,
    name: g.name,
    code: g.code,
    category: g.category as TrainingGroupEntry["category"],
    districtId: g.districtId,
    districtName: g.district.name,
    totalFarmers: g._count.farmers,
    activities: g.activities.map((a) => ({
      id: a.id,
      packageCode: a.package.code as TrainingPackageCode,
      date: a.trainingDate.toISOString().slice(0, 10),
      hasEvidence: Boolean(a.evidenceKey),
      hasLocation: Boolean(a.location?.trim()),
      // Hanya peserta yang memang anggota Lembaga ini. Peserta "tamu" dari
      // Lembaga lain tidak boleh menambah pembilang cakupan Lembaga ini karena
      // penyebutnya adalah petani Lembaga ini — sekaligus menyamakan hitungan
      // dengan `getUntrainedFarmers` yang juga membatasi ke anggota Lembaga.
      // Filter di JS (bukan di `where`) karena nested where tidak bisa merujuk `g.id`.
      participants: a.participants
        .filter((p) => p.farmer.farmerGroupId === g.id)
        .map((p) => ({
          farmerId: p.farmerId,
          gender: p.farmer.gender,
          preTestScore: p.preTestScore,
          postTestScore: p.postTestScore,
        })),
    })),
  }));

  return {
    data: { groups: entries },
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Daftar petani aktif satu Lembaga yang **belum** mengikuti paket tertentu —
 * isi modal drill-down saat sel matriks cakupan diklik. `packageCode: "ANY"`
 * berarti belum mengikuti pelatihan apa pun.
 *
 * Diambil on-demand (bukan ikut payload dashboard) supaya muatan awal tetap
 * ramping: nama seluruh petani tidak perlu dikirim untuk sekadar menghitung.
 *
 * NIK tidak pernah ikut — daftar ini hanya untuk keperluan undangan pelatihan.
 */
export async function getUntrainedFarmers(
  farmerGroupId: string,
  packageCode: TrainingPackageCode | "ANY",
  year: number | null,
): Promise<UntrainedFarmer[]> {
  if (!(await hasPermission("dashboard-training", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses dashboard pelatihan");
  }

  // Server Action = endpoint HTTP: nilai bisa datang di luar UI. Tipe TypeScript
  // tidak menjaga runtime, dan nilai ngawur akan menembus ke Prisma sebagai
  // enum/Date tak valid (500). Dijaga di sini — bukan Zod, mengikuti konvensi
  // repo untuk read action berparameter skalar (lih. `getFarmerById`).
  if (packageCode !== "ANY" && !TRAINING_PACKAGE_ORDER.includes(packageCode)) {
    throw new Error("Paket pelatihan tidak dikenal");
  }
  if (year != null && !Number.isInteger(year)) {
    throw new Error("Tahun tidak valid");
  }

  const access = await getAccessContext();

  // Pitfall key-collision (code-standards.md): `farmerGroupAccessFilter` juga
  // mengembalikan `id`, jadi digabung lewat AND — bukan spread — agar scope
  // tidak tertimpa oleh `id` literal di atas.
  const group = await prisma.farmerGroup.findFirst({
    where: { id: farmerGroupId, isActive: true, AND: farmerGroupAccessFilter(access) },
    select: { id: true },
  });
  if (!group) throw new Error("Lembaga petani tidak ditemukan atau di luar akses Anda");

  // Batas tahun dihitung dalam UTC agar identik dengan penentuan tahun di payload
  // dashboard (`trainingDate.toISOString().slice(0,10)`). Memakai `new Date(year,0,1)`
  // (waktu lokal) menggeser batas 7 jam di WIB, sehingga kegiatan akhir/awal tahun
  // bisa terhitung di tahun berbeda antara angka sel matriks dan isi daftar ini.
  const yearRange =
    year == null
      ? {}
      : {
          trainingDate: {
            gte: new Date(Date.UTC(year, 0, 1)),
            lt: new Date(Date.UTC(year + 1, 0, 1)),
          },
        };

  const trained = await prisma.trainingParticipant.findMany({
    where: {
      isActive: true,
      farmer: { farmerGroupId, isActive: true },
      activity: {
        isActive: true,
        farmerGroupId,
        ...yearRange,
        ...(packageCode === "ANY" ? {} : { package: { code: packageCode } }),
      },
    },
    select: { farmerId: true },
    distinct: ["farmerId"],
  });
  const trainedIds = trained.map((t) => t.farmerId);

  const farmers = await prisma.farmer.findMany({
    where: {
      farmerGroupId,
      isActive: true,
      ...(trainedIds.length > 0 ? { id: { notIn: trainedIds } } : {}),
    },
    select: { id: true, name: true, farmerId: true, gender: true },
    orderBy: { name: "asc" },
  });

  return farmers;
}
