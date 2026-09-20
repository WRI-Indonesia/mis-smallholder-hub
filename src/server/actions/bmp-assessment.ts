"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission, isSuperAdmin } from "@/lib/rbac";
import {
  getAccessContext,
  farmerAccessFilter,
  farmerGroupAccessFilter,
  farmerRelationAccessFilter,
} from "@/lib/access-context";
import {
  bmpAssessmentImportSchema,
  bmpAssessmentSchema,
  updateBmpAssessmentSchema,
  type BmpAssessmentImportInput,
  type BmpAssessmentInput,
  type UpdateBmpAssessmentInput,
} from "@/validations/bmp-assessment.schema";
import { cleanId } from "@/lib/bmp-assessment";
import type { ActionResult } from "@/types/action-result";

/**
 * Monev BMP (#344) — skor per petani per tahun. Tiga lapis di setiap action:
 * izin menu `master-data-bmp-monev`, scope data-access lewat relasi `farmer`
 * (`farmerRelationAccessFilter`), dan `isActive`. Satu penilaian AKTIF per
 * (petani, tahun) dijaga di sini — bukan unique index (lihat komentar skema).
 */

const MENU_KEY = "master-data-bmp-monev";

export interface BmpAssessmentListItem {
  id: string;
  farmerId: string;
  farmerCode: string;
  farmerName: string;
  farmerGroupId: string;
  farmerGroupName: string;
  districtId: string;
  districtName: string;
  surveyYear: number;
  surveyDate: Date | null;
  score: number;
  parcelUid: string | null;
  /** ID lahan yang dikunjungi (dari identitas), null bila tidak dicatat. */
  parcelId: string | null;
  assessor: string | null;
  notes: string | null;
  isActive: boolean;
}

const listSelect = {
  id: true,
  farmerId: true,
  surveyYear: true,
  surveyDate: true,
  score: true,
  parcelUid: true,
  assessor: true,
  notes: true,
  isActive: true,
  farmer: {
    select: {
      farmerId: true,
      name: true,
      farmerGroupId: true,
      farmerGroup: { select: { name: true, districtId: true, district: { select: { name: true } } } },
    },
  },
  parcel: { select: { parcelId: true } },
} as const;

type ListRow = {
  id: string;
  farmerId: string;
  surveyYear: number;
  surveyDate: Date | null;
  score: number;
  parcelUid: string | null;
  assessor: string | null;
  notes: string | null;
  isActive: boolean;
  farmer: {
    farmerId: string;
    name: string;
    farmerGroupId: string;
    farmerGroup: { name: string; districtId: string; district: { name: string } };
  };
  parcel: { parcelId: string } | null;
};

function toListItem(r: ListRow): BmpAssessmentListItem {
  return {
    id: r.id,
    farmerId: r.farmerId,
    farmerCode: r.farmer.farmerId,
    farmerName: r.farmer.name,
    farmerGroupId: r.farmer.farmerGroupId,
    farmerGroupName: r.farmer.farmerGroup.name,
    districtId: r.farmer.farmerGroup.districtId,
    districtName: r.farmer.farmerGroup.district.name,
    surveyYear: r.surveyYear,
    surveyDate: r.surveyDate,
    score: r.score,
    parcelUid: r.parcelUid,
    parcelId: r.parcel?.parcelId ?? null,
    assessor: r.assessor,
    notes: r.notes,
    isActive: r.isActive,
  };
}

/** Daftar penilaian dalam scope user. SUPERADMIN juga menerima baris nonaktif (filter Status di UI). */
export async function getBmpAssessments(): Promise<BmpAssessmentListItem[]> {
  if (!(await hasPermission(MENU_KEY, "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }
  const access = await getAccessContext();
  const rows = await prisma.bmpAssessment.findMany({
    where: {
      // Scope lewat `AND` (bukan spread): filter scope juga memakai kunci
      // `farmer`, sehingga spread akan tertimpa oleh `farmer.isActive` di bawah.
      AND: [farmerRelationAccessFilter(access)],
      ...((await isSuperAdmin()) ? {} : { isActive: true }),
      // Petani nonaktif keluar dari daftar & dashboard bersama penilaiannya.
      farmer: { isActive: true },
    },
    select: listSelect,
    orderBy: [{ surveyYear: "desc" }, { farmer: { name: "asc" } }],
  });
  return rows.map(toListItem);
}

/** Riwayat Monev BMP satu petani (tab Detail Petani) — aktif saja, terbaru di atas. */
export async function getFarmerBmpAssessments(farmerId: string): Promise<BmpAssessmentListItem[]> {
  if (!(await hasPermission(MENU_KEY, "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }
  const access = await getAccessContext();
  const rows = await prisma.bmpAssessment.findMany({
    where: { farmerId, isActive: true, ...farmerRelationAccessFilter(access) },
    select: listSelect,
    orderBy: [{ surveyYear: "desc" }, { surveyDate: "desc" }],
  });
  return rows.map(toListItem);
}

/**
 * Lahan aktif milik satu petani — opsi "Lahan dikunjungi" di form. Dikembalikan
 * `parcelUid` (identitas stabil antar revisi), bukan id baris revisi.
 */
export async function getFarmerParcelOptions(
  farmerId: string,
): Promise<{ parcelUid: string; parcelId: string; blok: string | null }[]> {
  if (!(await hasPermission(MENU_KEY, "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }
  const access = await getAccessContext();
  const farmer = await prisma.farmer.findFirst({
    where: { id: farmerId, isActive: true, ...farmerAccessFilter(access) },
    select: { id: true },
  });
  if (!farmer) return [];
  const parcels = await prisma.landParcel.findMany({
    where: { farmerId, isActive: true },
    select: { parcelUid: true, parcelId: true, blok: true },
    orderBy: { parcelId: "asc" },
  });
  return parcels;
}

/** Petani aktif satu Lembaga (dalam scope) — opsi combobox form. */
export async function getFarmersForBmpSelect(
  farmerGroupId: string,
): Promise<{ id: string; name: string; farmerId: string }[]> {
  if (!(await hasPermission(MENU_KEY, "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }
  const access = await getAccessContext();
  // `AND` (bukan spread): `farmerGroupAccessFilter` juga mengembalikan `id` (pitfall #127).
  const group = await prisma.farmerGroup.findFirst({
    where: { id: farmerGroupId, isActive: true, AND: farmerGroupAccessFilter(access) },
    select: { id: true },
  });
  if (!group) throw new Error("Lembaga Petani tidak ditemukan atau tidak dalam akses Anda");
  return prisma.farmer.findMany({
    where: { farmerGroupId, isActive: true },
    select: { id: true, name: true, farmerId: true },
    orderBy: { name: "asc" },
  });
}

/** Pastikan petani aktif & dalam scope; bila `parcelUid` diisi, pastikan milik petani itu. */
async function verifyTarget(
  farmerId: string,
  parcelUid: string | null | undefined,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const access = await getAccessContext();
  const farmer = await prisma.farmer.findFirst({
    where: { id: farmerId, isActive: true, ...farmerAccessFilter(access) },
    select: { id: true },
  });
  if (!farmer) return { ok: false, error: "Petani tidak ditemukan atau tidak dalam akses Anda" };
  if (parcelUid) {
    const identity = await prisma.landParcelIdentity.findFirst({
      where: { id: parcelUid, farmerId, isActive: true },
      select: { id: true },
    });
    if (!identity) return { ok: false, error: "Lahan yang dipilih bukan milik petani ini" };
  }
  return { ok: true };
}

export async function createBmpAssessment(
  input: BmpAssessmentInput,
): Promise<{ success: true; id: string } | { success: false; error: string | Record<string, string[]> }> {
  if (!(await hasPermission(MENU_KEY, "CREATE"))) {
    return { success: false, error: "Tidak memiliki izin untuk menambah penilaian Monev BMP" };
  }
  const parsed = bmpAssessmentSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  const data = parsed.data;

  const target = await verifyTarget(data.farmerId, data.parcelUid);
  if (!target.ok) return { success: false, error: target.error };

  const duplicate = await prisma.bmpAssessment.findFirst({
    where: { farmerId: data.farmerId, surveyYear: data.surveyYear, isActive: true },
    select: { id: true },
  });
  if (duplicate) {
    return {
      success: false,
      error: { surveyYear: [`Petani ini sudah punya penilaian aktif tahun ${data.surveyYear} — ubah yang ada`] },
    };
  }

  const session = await auth();
  const created = await prisma.bmpAssessment.create({
    data: {
      farmerId: data.farmerId,
      surveyYear: data.surveyYear,
      surveyDate: data.surveyDate ?? null,
      score: data.score,
      parcelUid: data.parcelUid ?? null,
      assessor: data.assessor ?? null,
      notes: data.notes ?? null,
      createdBy: session?.user?.id ?? null,
    },
    select: { id: true },
  });
  return { success: true, id: created.id };
}

export async function updateBmpAssessment(
  input: UpdateBmpAssessmentInput,
): Promise<{ success: true } | { success: false; error: string | Record<string, string[]> }> {
  if (!(await hasPermission(MENU_KEY, "EDIT"))) {
    return { success: false, error: "Tidak memiliki izin untuk mengubah penilaian Monev BMP" };
  }
  const parsed = updateBmpAssessmentSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  const { id, ...data } = parsed.data;

  const access = await getAccessContext();
  const existing = await prisma.bmpAssessment.findFirst({
    where: { id, isActive: true, ...farmerRelationAccessFilter(access) },
    select: { id: true },
  });
  if (!existing) return { success: false, error: "Penilaian tidak ditemukan atau tidak dalam akses Anda" };

  const target = await verifyTarget(data.farmerId, data.parcelUid);
  if (!target.ok) return { success: false, error: target.error };

  const duplicate = await prisma.bmpAssessment.findFirst({
    where: { farmerId: data.farmerId, surveyYear: data.surveyYear, isActive: true, id: { not: id } },
    select: { id: true },
  });
  if (duplicate) {
    return {
      success: false,
      error: { surveyYear: [`Petani ini sudah punya penilaian aktif tahun ${data.surveyYear}`] },
    };
  }

  const session = await auth();
  await prisma.bmpAssessment.update({
    where: { id },
    data: {
      farmerId: data.farmerId,
      surveyYear: data.surveyYear,
      surveyDate: data.surveyDate ?? null,
      score: data.score,
      parcelUid: data.parcelUid ?? null,
      assessor: data.assessor ?? null,
      notes: data.notes ?? null,
      modifiedBy: session?.user?.id ?? null,
    },
  });
  return { success: true };
}

/** Soft delete / restore. Restore ditolak bila tahun itu sudah punya baris aktif lain. */
export async function toggleBmpAssessmentActive(id: string): Promise<ActionResult> {
  if (!(await hasPermission(MENU_KEY, "DELETE"))) {
    return { success: false, error: "Tidak memiliki izin untuk menghapus penilaian Monev BMP" };
  }
  const access = await getAccessContext();
  const row = await prisma.bmpAssessment.findFirst({
    where: { id, ...farmerRelationAccessFilter(access) },
    select: { isActive: true, farmerId: true, surveyYear: true },
  });
  if (!row) return { success: false, error: "Penilaian tidak ditemukan" };

  if (!row.isActive) {
    const clash = await prisma.bmpAssessment.findFirst({
      where: { farmerId: row.farmerId, surveyYear: row.surveyYear, isActive: true },
      select: { id: true },
    });
    if (clash) {
      return { success: false, error: `Tahun ${row.surveyYear} sudah punya penilaian aktif — tidak bisa diaktifkan kembali` };
    }
  }

  const session = await auth();
  await prisma.bmpAssessment.update({
    where: { id },
    data: { isActive: !row.isActive, modifiedBy: session?.user?.id ?? null },
  });
  return { success: true };
}

// ── Import Excel (format rekap) ───────────────────────────────────────────

export interface BmpImportFarmerRef {
  /** Kode petani persis seperti di DB (`Farmer.farmerId`). */
  farmerCode: string;
  farmerDbId: string;
  farmerName: string;
  /** Lahan aktif petani: kode → parcelUid. */
  parcels: { parcelId: string; parcelUid: string }[];
  /** Tahun yang sudah punya penilaian aktif (untuk status "Perbarui" di pratinjau). */
  assessedYears: number[];
}

/**
 * Referensi resolusi untuk pratinjau import: seluruh petani aktif satu Lembaga
 * beserta lahan & tahun yang sudah dinilai. Volume kecil (ratusan petani per
 * Lembaga), jadi dikirim utuh — klien mencocokkan kode secara lokal.
 */
export async function getBmpImportRefs(farmerGroupId: string): Promise<BmpImportFarmerRef[]> {
  if (!(await hasPermission(MENU_KEY, "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }
  const access = await getAccessContext();
  const group = await prisma.farmerGroup.findFirst({
    where: { id: farmerGroupId, isActive: true, AND: farmerGroupAccessFilter(access) },
    select: { id: true },
  });
  if (!group) throw new Error("Lembaga Petani tidak ditemukan atau tidak dalam akses Anda");

  const farmers = await prisma.farmer.findMany({
    where: { farmerGroupId, isActive: true },
    select: {
      id: true,
      farmerId: true,
      name: true,
      landParcels: { where: { isActive: true }, select: { parcelId: true, parcelUid: true } },
      bmpAssessments: { where: { isActive: true }, select: { surveyYear: true } },
    },
    orderBy: { name: "asc" },
  });
  return farmers.map((f) => ({
    farmerCode: f.farmerId,
    farmerDbId: f.id,
    farmerName: f.name,
    parcels: f.landParcels.map((p) => ({ parcelId: p.parcelId, parcelUid: p.parcelUid })),
    assessedYears: [...new Set(f.bmpAssessments.map((a) => a.surveyYear))].sort(),
  }));
}

export interface BmpImportSummary {
  created: number;
  updated: number;
  /** Baris ditolak server (petani/lahan tak dikenal setelah resolusi ulang). */
  rejected: { rowNumber: number; farmerCode: string; reason: string }[];
}

/**
 * Simpan batch: upsert per (petani, tahun) — baris aktif yang ada DIPERBARUI
 * (skor, tanggal, lahan), bukan digandakan, sehingga unggah ulang berkas yang
 * sama aman. Resolusi kode → CUID dilakukan ULANG di server: klien hanya
 * mengirim kode. Lahan tak dikenal → disimpan tanpa lahan (bukan ditolak),
 * sesuai keputusan owner: skor tetap masuk, lahan hanya pelengkap.
 */
export async function importBmpAssessments(input: BmpAssessmentImportInput): Promise<ActionResult<BmpImportSummary>> {
  if (!(await hasPermission(MENU_KEY, "CREATE"))) {
    return { success: false, error: "Tidak memiliki izin untuk mengimpor penilaian Monev BMP" };
  }
  const parsed = bmpAssessmentImportSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { success: false, error: first ? `Data import tidak valid: ${first.message}` : "Data import tidak valid" };
  }
  const { farmerGroupId, assessor, rows } = parsed.data;

  const access = await getAccessContext();
  const group = await prisma.farmerGroup.findFirst({
    where: { id: farmerGroupId, isActive: true, AND: farmerGroupAccessFilter(access) },
    select: { id: true },
  });
  if (!group) return { success: false, error: "Lembaga Petani tidak ditemukan atau tidak dalam akses Anda" };

  const farmers = await prisma.farmer.findMany({
    where: { farmerGroupId, isActive: true },
    select: {
      id: true,
      farmerId: true,
      landParcels: { where: { isActive: true }, select: { parcelId: true, parcelUid: true } },
    },
  });
  const farmerByCode = new Map(farmers.map((f) => [cleanId(f.farmerId), f]));

  // Duplikat (petani, tahun) di dalam berkas: baris terakhir menang, dilaporkan.
  const summary: BmpImportSummary = { created: 0, updated: 0, rejected: [] };
  const planned = new Map<string, { farmerDbId: string; surveyYear: number; surveyDate: Date | null; score: number; parcelUid: string | null; rowNumber: number }>();
  for (const r of rows) {
    const farmer = farmerByCode.get(cleanId(r.farmerCode));
    if (!farmer) {
      summary.rejected.push({ rowNumber: r.rowNumber, farmerCode: r.farmerCode, reason: "ID Petani tidak dikenal di Lembaga ini" });
      continue;
    }
    let parcelUid: string | null = null;
    if (r.parcelId) {
      const p = farmer.landParcels.find((x) => cleanId(x.parcelId) === cleanId(r.parcelId!));
      parcelUid = p?.parcelUid ?? null;
    }
    const key = `${farmer.id}:${r.surveyYear}`;
    if (planned.has(key)) {
      summary.rejected.push({ rowNumber: planned.get(key)!.rowNumber, farmerCode: r.farmerCode, reason: `Duplikat tahun ${r.surveyYear} di berkas — baris ${r.rowNumber} yang dipakai` });
    }
    planned.set(key, { farmerDbId: farmer.id, surveyYear: r.surveyYear, surveyDate: r.surveyDate ?? null, score: r.score, parcelUid, rowNumber: r.rowNumber });
  }
  if (planned.size === 0) return { success: true, data: summary };

  const session = await auth();
  const userId = session?.user?.id ?? null;
  const farmerIds = [...new Set([...planned.values()].map((p) => p.farmerDbId))];
  const existing = await prisma.bmpAssessment.findMany({
    where: { farmerId: { in: farmerIds }, isActive: true },
    select: { id: true, farmerId: true, surveyYear: true },
  });
  const existingByKey = new Map(existing.map((e) => [`${e.farmerId}:${e.surveyYear}`, e.id]));

  try {
    await prisma.$transaction(async (tx) => {
      const creates: { farmerId: string; surveyYear: number; surveyDate: Date | null; score: number; parcelUid: string | null; assessor: string | null; createdBy: string | null }[] = [];
      for (const [key, p] of planned) {
        const id = existingByKey.get(key);
        if (id) {
          await tx.bmpAssessment.update({
            where: { id },
            data: {
              surveyDate: p.surveyDate,
              score: p.score,
              // Lahan hanya ditimpa bila berkas menyebutkan lahan yang dikenal —
              // berkas tanpa kolom lahan tidak boleh menghapus lahan yang sudah tercatat.
              ...(p.parcelUid ? { parcelUid: p.parcelUid } : {}),
              ...(assessor ? { assessor } : {}),
              modifiedBy: userId,
            },
          });
          summary.updated++;
        } else {
          creates.push({ farmerId: p.farmerDbId, surveyYear: p.surveyYear, surveyDate: p.surveyDate, score: p.score, parcelUid: p.parcelUid, assessor: assessor ?? null, createdBy: userId });
        }
      }
      if (creates.length > 0) {
        await tx.bmpAssessment.createMany({ data: creates });
        summary.created += creates.length;
      }
    });
  } catch (error) {
    console.error("Import Monev BMP error:", error);
    return { success: false, error: "Gagal menyimpan data ke database — tidak ada baris yang tersimpan, coba lagi" };
  }
  return { success: true, data: summary };
}
