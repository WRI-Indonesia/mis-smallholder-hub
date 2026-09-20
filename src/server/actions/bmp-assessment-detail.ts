"use server";

import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission, isSuperAdmin } from "@/lib/rbac";
import { getAccessContext, farmerAccessFilter, farmerGroupAccessFilter, farmerRelationAccessFilter } from "@/lib/access-context";
import {
  bmpGroupAssessmentSchema,
  bmpSurveyImportSchema,
  saveBmpAssessmentDetailsSchema,
  type BmpGroupAssessmentInput,
  type BmpSurveyImportInput,
  type SaveBmpAssessmentDetailsInput,
} from "@/validations/bmp-assessment.schema";
import { recomputeBmpScore, type BmpIndicatorRef, type BmpRecomputeResult } from "@/lib/bmp-survey-form";
import type { ActionResult } from "@/types/action-result";
import { isPrismaUniqueViolation } from "@/lib/prisma-errors";

/**
 * Rincian Monev BMP (#346): master indikator, skor per indikator individu per
 * penilaian petani, penilaian Lembaga per tahun, dan import form survei.
 * Izin menumpang menu `master-data-bmp-monev` (data) — sama dengan skor akhir.
 * `BmpAssessment.score` adalah angka resmi. Import form survei menyimpan
 * **hasil hitung ulang** (`recomputeBmpScore`: kriteria alternatif petani/
 * pekerja dihitung sekali sehingga maks 3,00 — owner 2026-09-20; rumus form
 * menjumlahkan keduanya, totalnya bisa 3,60), bukan total raport form; total
 * form hanya pembanding. Di luar import, hitung ulang hanya untuk verifikasi
 * kecuali pengguna secara eksplisit meminta menimpanya.
 */
const MENU_KEY = "master-data-bmp-monev";

const indicatorSelect = {
  id: true,
  code: true,
  activityCode: true,
  activityName: true,
  activityWeight: true,
  criteriaCode: true,
  criteriaName: true,
  seq: true,
  level: true,
  name: true,
  weight: true,
  inFinalScore: true,
  scoreLabel0: true,
  scoreLabel1: true,
  scoreLabel2: true,
  scoreLabel3: true,
  sortOrder: true,
} as const;

/** Master indikator aktif, urut tampil. Dipakai form, pratinjau import, dan halaman detail. */
export async function getBmpIndicators(): Promise<BmpIndicatorRef[]> {
  if (!(await hasPermission(MENU_KEY, "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }
  return prisma.bmpIndicator.findMany({ where: { isActive: true }, select: indicatorSelect, orderBy: { sortOrder: "asc" } });
}

export interface BmpIndicatorScoreItem {
  indicatorId: string;
  score: number | null;
  weightUsed: number | null;
  notes: string | null;
}

export interface BmpGroupAssessmentItem {
  id: string;
  farmerGroupId: string;
  farmerGroupName: string;
  surveyYear: number;
  surveyDate: Date | null;
  assessor: string | null;
  notes: string | null;
  details: BmpIndicatorScoreItem[];
}

export interface BmpAssessmentDetailView {
  assessment: {
    id: string;
    farmerId: string;
    farmerCode: string;
    farmerName: string;
    farmerGroupId: string;
    farmerGroupName: string;
    surveyYear: number;
    surveyDate: Date | null;
    score: number;
    parcelId: string | null;
    assessor: string | null;
    notes: string | null;
    isActive: boolean;
  };
  indicators: BmpIndicatorRef[];
  details: BmpIndicatorScoreItem[];
  /** Penilaian Lembaga tahun yang sama (sumber indikator level LEMBAGA); null bila belum ada. */
  groupAssessment: BmpGroupAssessmentItem | null;
  /** Hitung ulang dari rincian; null bila belum ada rincian sama sekali. */
  recomputed: BmpRecomputeResult | null;
  /** Skor indikator di luar 0–3 (diterima dari import, ditandai). */
  outOfRange: string[];
}

const groupAssessmentSelect = {
  id: true,
  farmerGroupId: true,
  surveyYear: true,
  surveyDate: true,
  assessor: true,
  notes: true,
  farmerGroup: { select: { name: true } },
  details: { where: { isActive: true }, select: { indicatorId: true, score: true, weightUsed: true, notes: true } },
} as const;

type GroupRow = {
  id: string;
  farmerGroupId: string;
  surveyYear: number;
  surveyDate: Date | null;
  assessor: string | null;
  notes: string | null;
  farmerGroup: { name: string };
  details: BmpIndicatorScoreItem[];
};

const toGroupItem = (g: GroupRow): BmpGroupAssessmentItem => ({
  id: g.id,
  farmerGroupId: g.farmerGroupId,
  farmerGroupName: g.farmerGroup.name,
  surveyYear: g.surveyYear,
  surveyDate: g.surveyDate,
  assessor: g.assessor,
  notes: g.notes,
  details: g.details,
});

/** Halaman detail satu penilaian: rincian individu + penilaian Lembaga tahun itu + hitung ulang. */
export async function getBmpAssessmentDetailView(id: string): Promise<BmpAssessmentDetailView | null> {
  if (!(await hasPermission(MENU_KEY, "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }
  return loadBmpAssessmentDetailView(id);
}

/**
 * Pemuat tanpa cek izin menu — dipakai `getBmpAssessmentDetailView` (VIEW) dan
 * `saveBmpAssessmentDetails` (EDIT) supaya pengguna ber-EDIT tanpa VIEW tidak
 * mendapat exception setelah tulisannya sudah tersimpan (temuan review #347).
 * Baris nonaktif hanya terlihat SUPERADMIN (lapisan soft delete, sama dengan daftar).
 */
async function loadBmpAssessmentDetailView(id: string): Promise<BmpAssessmentDetailView | null> {
  const access = await getAccessContext();
  const a = await prisma.bmpAssessment.findFirst({
    where: { id, ...((await isSuperAdmin()) ? {} : { isActive: true, farmer: { isActive: true } }), AND: [farmerRelationAccessFilter(access)] },
    select: {
      id: true,
      farmerId: true,
      surveyYear: true,
      surveyDate: true,
      score: true,
      assessor: true,
      notes: true,
      isActive: true,
      farmer: { select: { farmerId: true, name: true, farmerGroupId: true, farmerGroup: { select: { name: true } } } },
      parcel: { select: { parcelId: true } },
      details: { where: { isActive: true }, select: { indicatorId: true, score: true, weightUsed: true, notes: true } },
    },
  });
  if (!a) return null;

  const [indicators, group] = await Promise.all([
    prisma.bmpIndicator.findMany({ where: { isActive: true }, select: indicatorSelect, orderBy: { sortOrder: "asc" } }),
    prisma.bmpGroupAssessment.findFirst({
      where: { farmerGroupId: a.farmer.farmerGroupId, surveyYear: a.surveyYear, isActive: true },
      select: groupAssessmentSelect,
    }),
  ]);

  const byId = new Map(indicators.map((i) => [i.id, i]));
  const individu = new Map<string, number | null>();
  for (const d of a.details) {
    const ind = byId.get(d.indicatorId);
    if (ind) individu.set(ind.code, d.score);
  }
  const lembaga = new Map<string, number | null>();
  for (const d of group?.details ?? []) {
    const ind = byId.get(d.indicatorId);
    if (ind) lembaga.set(ind.code, d.score);
  }
  // Hitung ulang hanya bila petani punya rincian individu; penilaian Lembaga
  // saja akan menghasilkan total dari 18 nol dan peringatan "≠ skor" palsu
  // untuk petani yang hanya punya skor rekap (temuan review).
  const hasDetails = a.details.length > 0;
  const outOfRange = [...a.details, ...(group?.details ?? [])]
    .filter((d) => d.score != null && (d.score < 0 || d.score > 3))
    .map((d) => byId.get(d.indicatorId)?.code ?? d.indicatorId);

  return {
    assessment: {
      id: a.id,
      farmerId: a.farmerId,
      farmerCode: a.farmer.farmerId,
      farmerName: a.farmer.name,
      farmerGroupId: a.farmer.farmerGroupId,
      farmerGroupName: a.farmer.farmerGroup.name,
      surveyYear: a.surveyYear,
      surveyDate: a.surveyDate,
      score: a.score,
      parcelId: a.parcel?.parcelId ?? null,
      assessor: a.assessor,
      notes: a.notes,
      isActive: a.isActive,
    },
    indicators,
    details: a.details,
    groupAssessment: group ? toGroupItem(group) : null,
    recomputed: hasDetails ? recomputeBmpScore(indicators, individu, lembaga) : null,
    outOfRange,
  };
}

/** Simpan skor indikator INDIVIDU satu penilaian (form manual, EDIT). Upsert per indikator; indikator yang tak dikirim tidak disentuh. */
export async function saveBmpAssessmentDetails(input: SaveBmpAssessmentDetailsInput): Promise<ActionResult<{ recomputedScore: number | null }>> {
  if (!(await hasPermission(MENU_KEY, "EDIT"))) {
    return { success: false, error: "Tidak memiliki izin untuk mengubah rincian Monev BMP" };
  }
  const parsed = saveBmpAssessmentDetailsSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: await describeRowIssue(parsed.error.issues[0], input.rows) };
  const { assessmentId, rows, applyRecomputedScore } = parsed.data;

  const access = await getAccessContext();
  const a = await prisma.bmpAssessment.findFirst({
    where: { id: assessmentId, isActive: true, AND: [farmerRelationAccessFilter(access)] },
    select: { id: true, surveyYear: true, farmer: { select: { farmerGroupId: true } } },
  });
  if (!a) return { success: false, error: "Penilaian tidak ditemukan atau tidak dalam akses Anda" };

  const indicators = await prisma.bmpIndicator.findMany({ where: { isActive: true }, select: indicatorSelect });
  const byId = new Map(indicators.map((i) => [i.id, i]));
  for (const r of rows) {
    const ind = byId.get(r.indicatorId);
    if (!ind) return { success: false, error: "Ada indikator yang tidak dikenal" };
    if (ind.level !== "INDIVIDU") return { success: false, error: `Indikator ${ind.code} adalah level Lembaga — ubah lewat Penilaian Lembaga` };
  }

  const session = await auth();
  const userId = session?.user?.id ?? null;
  await prisma.$transaction(async (tx) => {
    for (const r of rows) {
      const ind = byId.get(r.indicatorId)!;
      await tx.bmpAssessmentDetail.upsert({
        where: { assessmentId_indicatorId: { assessmentId, indicatorId: r.indicatorId } },
        create: { assessmentId, indicatorId: r.indicatorId, score: r.score, weightUsed: ind.weight, notes: r.notes ?? null, createdBy: userId },
        update: { score: r.score, weightUsed: ind.weight, notes: r.notes ?? null, isActive: true, modifiedBy: userId },
      });
    }
  });

  // Hitung ulang dari state tersimpan (bukan payload) supaya angka yang dilaporkan = yang ada di DB.
  const view = await loadBmpAssessmentDetailView(assessmentId);
  const recomputed = view?.recomputed?.total ?? null;
  if (applyRecomputedScore && recomputed != null) {
    await prisma.bmpAssessment.update({ where: { id: assessmentId }, data: { score: recomputed, modifiedBy: userId } });
  }
  return { success: true, data: { recomputedScore: recomputed } };
}

// ── Penilaian Lembaga ─────────────────────────────────────────────────────

/** Daftar penilaian Lembaga aktif dalam scope (semua tahun), terbaru dulu. */
export async function getBmpGroupAssessments(): Promise<BmpGroupAssessmentItem[]> {
  if (!(await hasPermission(MENU_KEY, "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }
  const access = await getAccessContext();
  const rows = await prisma.bmpGroupAssessment.findMany({
    where: { isActive: true, farmerGroup: { isActive: true, AND: [farmerGroupAccessFilter(access)] } },
    select: groupAssessmentSelect,
    orderBy: [{ surveyYear: "desc" }, { farmerGroup: { name: "asc" } }],
  });
  return rows.map(toGroupItem);
}

/** Buat/ubah penilaian Lembaga (satu aktif per Lembaga-tahun): upsert baris induk + rincian 14 indikator. */
export async function upsertBmpGroupAssessment(input: BmpGroupAssessmentInput): Promise<ActionResult<{ id: string }>> {
  if (!(await hasPermission(MENU_KEY, "EDIT"))) {
    return { success: false, error: "Tidak memiliki izin untuk mengubah penilaian Lembaga" };
  }
  const parsed = bmpGroupAssessmentSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: await describeRowIssue(parsed.error.issues[0], input.rows) };
  const data = parsed.data;

  const access = await getAccessContext();
  const group = await prisma.farmerGroup.findFirst({
    where: { id: data.farmerGroupId, isActive: true, AND: farmerGroupAccessFilter(access) },
    select: { id: true },
  });
  if (!group) return { success: false, error: "Lembaga Petani tidak ditemukan atau tidak dalam akses Anda" };

  const indicators = await prisma.bmpIndicator.findMany({ where: { isActive: true, level: "LEMBAGA" }, select: indicatorSelect });
  const byId = new Map(indicators.map((i) => [i.id, i]));
  for (const r of data.rows) {
    if (!byId.has(r.indicatorId)) return { success: false, error: "Ada indikator yang bukan level Lembaga / tidak dikenal" };
  }

  const session = await auth();
  const userId = session?.user?.id ?? null;
  try {
    const id = await prisma.$transaction(async (tx) => {
      const existing = await tx.bmpGroupAssessment.findFirst({
        where: { farmerGroupId: data.farmerGroupId, surveyYear: data.surveyYear, isActive: true },
        select: { id: true },
      });
      // TAMBAH tidak boleh diam-diam menimpa penilaian aktif Lembaga-tahun itu
      // (14 skor + tanggal/penilai/catatan akan tergantikan isian kosong); UBAH
      // hanya boleh menyentuh baris yang memang sedang dibuka (temuan review).
      if (existing && existing.id !== data.id) throw new GroupYearTakenError();
      if (data.id && !existing) throw new GroupRowMissingError();
      const head = existing
        ? await tx.bmpGroupAssessment.update({
            where: { id: existing.id },
            data: { surveyDate: data.surveyDate ?? null, assessor: data.assessor ?? null, notes: data.notes ?? null, modifiedBy: userId },
            select: { id: true },
          })
        : await tx.bmpGroupAssessment.create({
            data: { farmerGroupId: data.farmerGroupId, surveyYear: data.surveyYear, surveyDate: data.surveyDate ?? null, assessor: data.assessor ?? null, notes: data.notes ?? null, createdBy: userId },
            select: { id: true },
          });
      for (const r of data.rows) {
        const ind = byId.get(r.indicatorId)!;
        await tx.bmpGroupAssessmentDetail.upsert({
          where: { groupAssessmentId_indicatorId: { groupAssessmentId: head.id, indicatorId: r.indicatorId } },
          create: { groupAssessmentId: head.id, indicatorId: r.indicatorId, score: r.score, weightUsed: ind.weight, notes: r.notes ?? null, createdBy: userId },
          update: { score: r.score, weightUsed: ind.weight, notes: r.notes ?? null, isActive: true, modifiedBy: userId },
        });
      }
      return head.id;
    });
    return { success: true, data: { id } };
  } catch (error) {
    if (error instanceof GroupYearTakenError) return { success: false, error: `Lembaga ini sudah punya penilaian aktif tahun ${data.surveyYear} — buka lewat tombol Ubah, bukan Tambah` };
    if (error instanceof GroupRowMissingError) return { success: false, error: "Penilaian Lembaga yang diubah sudah tidak aktif — muat ulang halaman" };
    if (isPrismaUniqueViolation(error)) return { success: false, error: "Penilaian Lembaga tahun itu baru saja dibuat pengguna lain — muat ulang halaman" };
    throw error;
  }
}

class GroupYearTakenError extends Error {}
class GroupRowMissingError extends Error {}

/**
 * Pesan validasi yang menyebut indikatornya: skema hanya tahu `rows[i].score`,
 * pengguna melihat 14–18 baris — "Skor maksimal 3" saja tak menunjuk baris mana.
 */
async function describeRowIssue(issue: { message: string; path: PropertyKey[] } | undefined, rows: { indicatorId: string }[] | undefined): Promise<string> {
  if (!issue) return "Data tidak valid";
  const [head, idx] = issue.path;
  if (head !== "rows" || typeof idx !== "number" || !rows?.[idx]) return issue.message;
  const ind = await prisma.bmpIndicator.findUnique({ where: { id: rows[idx].indicatorId }, select: { code: true } });
  return `${issue.message} — indikator ${ind?.code ?? `baris ${idx + 1}`}`;
}

// ── Import form survei per petani ─────────────────────────────────────────

export interface BmpSurveyImportSummary {
  assessmentsCreated: number;
  assessmentsUpdated: number;
  detailRows: number;
  groupAssessmentId: string | null;
  /** Peringatan non-fatal (mis. set skor Lembaga antar berkas berbeda). */
  warnings: string[];
  rejected: { fileName: string; reason: string }[];
}

/**
 * Simpan batch form survei satu Lembaga (satu transaksi): per form → upsert
 * `BmpAssessment` (skor akhir = **hitung ulang** dari rincian individu + set
 * Lembaga tahun itu; total form hanya dipakai bila berkas
 * tak memuat rincian sama sekali; tanggal hanya bila form memuatnya)
 * + rincian individu (replace per indikator); penilaian Lembaga tahun itu
 * di-upsert SEKALI dari set skor lembaga berkas pertama (berkas lain yang
 * berbeda → peringatan, bukan ditimpa bergantian). Klien mengirim `farmerId`
 * hasil pilihan pratinjau — server memastikan petani aktif, anggota Lembaga,
 * dalam scope, dan tidak dipakai dua form.
 */
export async function importBmpSurveyForms(input: BmpSurveyImportInput): Promise<ActionResult<BmpSurveyImportSummary>> {
  if (!(await hasPermission(MENU_KEY, "CREATE"))) {
    return { success: false, error: "Tidak memiliki izin untuk mengimpor form survei Monev BMP" };
  }
  const parsed = bmpSurveyImportSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { success: false, error: first ? `Data import tidak valid: ${first.message}` : "Data import tidak valid" };
  }
  const { farmerGroupId, assessor, forms } = parsed.data;

  const access = await getAccessContext();
  const group = await prisma.farmerGroup.findFirst({
    where: { id: farmerGroupId, isActive: true, AND: farmerGroupAccessFilter(access) },
    select: { id: true },
  });
  if (!group) return { success: false, error: "Lembaga Petani tidak ditemukan atau tidak dalam akses Anda" };

  const farmerIds = [...new Set(forms.map((f) => f.farmerId))];
  const farmers = await prisma.farmer.findMany({
    // `AND`, bukan spread: pada mode BY_FARMER_GROUP filter akses juga berkunci
    // `farmerGroupId` dan akan menimpa syarat "anggota Lembaga terpilih" (#127).
    where: { id: { in: farmerIds }, farmerGroupId, isActive: true, AND: [farmerAccessFilter(access)] },
    select: { id: true },
  });
  const validFarmer = new Set(farmers.map((f) => f.id));
  const indicators = await prisma.bmpIndicator.findMany({ where: { isActive: true }, select: indicatorSelect });
  const byId = new Map(indicators.map((i) => [i.id, i]));

  const summary: BmpSurveyImportSummary = { assessmentsCreated: 0, assessmentsUpdated: 0, detailRows: 0, groupAssessmentId: null, warnings: [], rejected: [] };
  const seenFarmerYear = new Set<string>();
  const accepted: typeof forms = [];
  for (const f of forms) {
    if (!validFarmer.has(f.farmerId)) {
      summary.rejected.push({ fileName: f.fileName, reason: "Petani tidak ditemukan di Lembaga ini / di luar akses" });
      continue;
    }
    const key = `${f.farmerId}:${f.surveyYear}`;
    if (seenFarmerYear.has(key)) {
      summary.rejected.push({ fileName: f.fileName, reason: `Petani yang sama sudah dipakai form lain untuk tahun ${f.surveyYear}` });
      continue;
    }
    if ([...f.individu, ...f.lembaga].some((r) => !byId.has(r.indicatorId))) {
      summary.rejected.push({ fileName: f.fileName, reason: "Ada indikator yang tidak dikenal" });
      continue;
    }
    // Level harus cocok dengan tabelnya (sama dengan form manual): skor Lembaga
    // tidak boleh masuk rincian petani dan sebaliknya (temuan review).
    if (f.individu.some((r) => byId.get(r.indicatorId)!.level !== "INDIVIDU") || f.lembaga.some((r) => byId.get(r.indicatorId)!.level !== "LEMBAGA")) {
      summary.rejected.push({ fileName: f.fileName, reason: "Level indikator tidak sesuai (individu ↔ Lembaga tertukar)" });
      continue;
    }
    seenFarmerYear.add(key);
    accepted.push(f);
  }
  if (accepted.length === 0) return { success: true, data: summary };

  // Penilaian Lembaga: set skor dari berkas pertama yang memuatnya; berkas lain dibandingkan.
  const years = [...new Set(accepted.map((f) => f.surveyYear))];
  if (years.length > 1) summary.warnings.push(`Berkas memuat ${years.length} tahun survei berbeda (${years.join(", ")}) — penilaian Lembaga diambil per tahun dari berkas pertama masing-masing`);
  const groupSets = new Map<number, { fileName: string; rows: { indicatorId: string; score: number | null; notes: string | null }[] }>();
  for (const f of accepted) {
    if (f.lembaga.length === 0) continue;
    const ref = groupSets.get(f.surveyYear);
    if (!ref) {
      groupSets.set(f.surveyYear, { fileName: f.fileName, rows: f.lembaga.map((r) => ({ indicatorId: r.indicatorId, score: r.score, notes: r.notes ?? null })) });
      continue;
    }
    const sig = (rows: { indicatorId: string; score: number | null }[]) => rows.map((r) => `${r.indicatorId}=${r.score ?? "-"}`).sort().join("|");
    if (sig(ref.rows) !== sig(f.lembaga)) summary.warnings.push(`Skor Lembaga di "${f.fileName}" berbeda dari "${ref.fileName}" — yang dipakai berkas pertama`);
  }

  // Skor akhir = hitung ulang sistem (bukan total raport form — rumus form
  // menjumlahkan kriteria alternatif). Set Lembaga = yang akan tersimpan: berkas
  // pertama tahun itu, atau — bila batch tanpa sheet Lembaga — penilaian Lembaga
  // yang SUDAH ada di DB, supaya 6 indikator Lembaga tidak dihitung 0 dan skor
  // petani = raport yang nanti tampil di halaman detail (temuan review #347).
  const storedGroupRows = new Map<number, { indicatorId: string; score: number | null }[]>();
  for (const year of years) {
    if (groupSets.has(year)) continue;
    const existingGroup = await prisma.bmpGroupAssessment.findFirst({
      where: { farmerGroupId, surveyYear: year, isActive: true },
      select: { details: { where: { isActive: true }, select: { indicatorId: true, score: true } } },
    });
    if (existingGroup) storedGroupRows.set(year, existingGroup.details);
    else summary.warnings.push(`Tahun ${year}: berkas tidak memuat skor Lembaga dan belum ada penilaian Lembaga tersimpan — 6 indikator Lembaga dihitung 0 pada skor akhir`);
  }
  // Kunci = objek form (nama berkas tidak unik: nama kembar dari dua folder bisa dipetakan ke dua petani).
  const finalScore = new Map<object, number>();
  for (const f of accepted) {
    const groupRows = groupSets.get(f.surveyYear)?.rows ?? storedGroupRows.get(f.surveyYear) ?? f.lembaga;
    if (f.individu.length + groupRows.length === 0) {
      finalScore.set(f, f.score);
      continue;
    }
    const individu = new Map(f.individu.map((r) => [byId.get(r.indicatorId)!.code, r.score]));
    const lembaga = new Map(groupRows.map((r) => [byId.get(r.indicatorId)!.code, r.score]));
    finalScore.set(f, recomputeBmpScore(indicators, individu, lembaga).total);
  }

  const session = await auth();
  const userId = session?.user?.id ?? null;
  const groupSurveyDate = (year: number) => accepted.find((f) => f.surveyYear === year && f.surveyDate)?.surveyDate ?? null;

  try {
    await prisma.$transaction(
      async (tx) => {
        // Penilaian Lembaga per tahun
        for (const [year, set] of groupSets) {
          const existing = await tx.bmpGroupAssessment.findFirst({ where: { farmerGroupId, surveyYear: year, isActive: true }, select: { id: true } });
          const head = existing
            ? await tx.bmpGroupAssessment.update({ where: { id: existing.id }, data: { ...(groupSurveyDate(year) ? { surveyDate: groupSurveyDate(year) } : {}), ...(assessor ? { assessor } : {}), modifiedBy: userId }, select: { id: true } })
            : await tx.bmpGroupAssessment.create({ data: { farmerGroupId, surveyYear: year, surveyDate: groupSurveyDate(year), assessor: assessor ?? null, createdBy: userId }, select: { id: true } });
          summary.groupAssessmentId = head.id;
          await upsertDetailRowsBulk(tx, "tbl_bmp_group_assessment_detail", "group_assessment_id", head.id, set.rows.map((r) => ({ indicatorId: r.indicatorId, score: r.score, weightUsed: byId.get(r.indicatorId)!.weight, notes: r.notes })), userId);
        }
        // Penilaian petani + rincian individu
        const existing = await tx.bmpAssessment.findMany({
          where: { farmerId: { in: accepted.map((f) => f.farmerId) }, isActive: true },
          select: { id: true, farmerId: true, surveyYear: true },
        });
        const existingByKey = new Map(existing.map((e) => [`${e.farmerId}:${e.surveyYear}`, e.id]));
        for (const f of accepted) {
          const id = existingByKey.get(`${f.farmerId}:${f.surveyYear}`);
          let assessmentId: string;
          if (id) {
            await tx.bmpAssessment.update({
              where: { id },
              data: { score: finalScore.get(f)!, ...(f.surveyDate ? { surveyDate: f.surveyDate } : {}), ...(assessor ? { assessor } : {}), modifiedBy: userId },
            });
            assessmentId = id;
            summary.assessmentsUpdated++;
          } else {
            const created = await tx.bmpAssessment.create({
              data: { farmerId: f.farmerId, surveyYear: f.surveyYear, surveyDate: f.surveyDate ?? null, score: finalScore.get(f)!, assessor: assessor ?? null, createdBy: userId },
              select: { id: true },
            });
            assessmentId = created.id;
            summary.assessmentsCreated++;
          }
          summary.detailRows += await upsertDetailRowsBulk(tx, "tbl_bmp_assessment_detail", "assessment_id", assessmentId, f.individu.map((r) => ({ indicatorId: r.indicatorId, score: r.score, weightUsed: byId.get(r.indicatorId)!.weight, notes: r.notes ?? null })), userId);
        }
      },
      { timeout: 120_000 },
    );
  } catch (error) {
    console.error("Import form survei Monev BMP error:", error);
    if (isPrismaUniqueViolation(error)) {
      return { success: false, error: "Ada petani/Lembaga yang baru saja diberi penilaian tahun itu oleh pengguna lain — muat ulang lalu validasi kembali (tidak ada yang tersimpan)" };
    }
    return { success: false, error: "Gagal menyimpan ke database — tidak ada yang tersimpan, coba lagi" };
  }
  return { success: true, data: summary };
}

/**
 * Upsert rincian satu induk dalam SATU pernyataan (`INSERT … ON CONFLICT DO
 * UPDATE`), bukan satu round-trip per indikator: 300 form × (18 + 14) upsert
 * berurutan ≈ 6.000 await — lewat tunnel prod melampaui timeout transaksi 120 s
 * dan seluruh import batal (temuan review #347). Kolom & constraint mengikuti
 * migrasi `20260920120000_bmp_indicator_detail`; id memakai UUID (PK string).
 */
async function upsertDetailRowsBulk(
  tx: Prisma.TransactionClient,
  table: "tbl_bmp_assessment_detail" | "tbl_bmp_group_assessment_detail",
  parentColumn: "assessment_id" | "group_assessment_id",
  parentId: string,
  rows: { indicatorId: string; score: number | null; weightUsed: number | null; notes: string | null }[],
  userId: string | null,
): Promise<number> {
  if (rows.length === 0) return 0;
  const values = rows.map(
    (r) => Prisma.sql`(${randomUUID()}, ${parentId}, ${r.indicatorId}, ${r.score}, ${r.weightUsed}, ${r.notes}, true, now(), ${userId}, now(), ${userId})`,
  );
  await tx.$executeRaw`
    INSERT INTO ${Prisma.raw(`"${table}"`)} (id, ${Prisma.raw(`"${parentColumn}"`)}, indicator_id, score, weight_used, notes, is_active, created_at, created_by, modified_at, modified_by)
    VALUES ${Prisma.join(values)}
    ON CONFLICT (${Prisma.raw(`"${parentColumn}"`)}, indicator_id) DO UPDATE SET
      score = EXCLUDED.score, weight_used = EXCLUDED.weight_used, notes = EXCLUDED.notes,
      is_active = true, modified_at = now(), modified_by = EXCLUDED.modified_by`;
  return rows.length;
}
