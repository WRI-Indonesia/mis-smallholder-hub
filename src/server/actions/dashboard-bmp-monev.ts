"use server";

import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { getAccessContext, farmerGroupAccessFilter } from "@/lib/access-context";
import type {
  BmpMonevActivity,
  BmpMonevDashboardView,
  BmpMonevGroupEntry,
  BmpMonevIndicator,
  BmpMonevIndicatorStat,
} from "@/lib/bmp-monev-dashboard-aggregation";
import { recomputeBmpScore, type BmpIndicatorRef } from "@/lib/bmp-survey-form";

/**
 * Payload Dashboard Monev BMP (#344): satu entri per Lembaga Petani beserta
 * seluruh penilaian aktifnya (petani, tahun, skor), dalam scope data-access
 * user. Query langsung seperti Dashboard Pelatihan — volume kecil (≤ 12.000
 * petani × beberapa tahun), agregasi di klien dari payload ini.
 *
 * Terpisah dari BMP Dashboard (Produksi): grain berbeda (penilaian tahunan vs
 * produksi bulanan) dan dashboard produksi bergantung snapshot.
 */
export async function getBmpMonevDashboardView(): Promise<BmpMonevDashboardView> {
  if (!(await hasPermission("dashboard-bmp-monev", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses dashboard Monev BMP");
  }

  const access = await getAccessContext();

  const groups = await prisma.farmerGroup.findMany({
    where: { isActive: true, ...farmerGroupAccessFilter(access) },
    select: {
      id: true,
      name: true,
      code: true,
      districtId: true,
      district: { select: { name: true } },
      // Denominator cakupan: seluruh petani aktif Lembaga (bukan hanya yang dinilai).
      _count: { select: { farmers: { where: { isActive: true } } } },
      farmers: {
        where: { isActive: true, bmpAssessments: { some: { isActive: true } } },
        select: {
          id: true,
          bmpAssessments: {
            where: { isActive: true },
            select: {
              id: true,
              surveyYear: true,
              score: true,
              // Rincian indikator (#346) — hanya id/skor; agregat dihitung di sini,
              // baris mentah tidak dikirim ke klien.
              details: { where: { isActive: true }, select: { indicatorId: true, score: true } },
            },
          },
        },
      },
      // Penilaian Lembaga per tahun (14 indikator level LEMBAGA) — profil kelembagaan
      // + sumber indikator Lembaga saat menghitung skor per kegiatan petani.
      bmpGroupAssessments: {
        where: { isActive: true },
        select: { surveyYear: true, details: { where: { isActive: true }, select: { indicatorId: true, score: true } } },
      },
    },
    orderBy: { name: "asc" },
  });

  const indicatorRows: BmpIndicatorRef[] = await prisma.bmpIndicator.findMany({
    where: { isActive: true },
    select: {
      id: true, code: true, activityCode: true, activityName: true, activityWeight: true, criteriaCode: true, criteriaName: true, seq: true,
      level: true, name: true, weight: true, inFinalScore: true, scoreLabel0: true, scoreLabel1: true, scoreLabel2: true, scoreLabel3: true, sortOrder: true,
    },
    orderBy: { sortOrder: "asc" },
  });
  const indById = new Map(indicatorRows.map((i) => [i.id, i]));
  const activities: BmpMonevActivity[] = [];
  for (const i of indicatorRows) if (!activities.some((a) => a.code === i.activityCode)) activities.push({ code: i.activityCode, name: i.activityName, weight: i.activityWeight });
  const indicators: BmpMonevIndicator[] = indicatorRows.map((i) => ({ id: i.id, code: i.code, level: i.level, name: i.name, activityCode: i.activityCode, activityName: i.activityName, criteriaCode: i.criteriaCode, weight: i.weight, inFinalScore: i.inFinalScore, sortOrder: i.sortOrder }));
  const indicatorStats: BmpMonevIndicatorStat[] = [];

  const entries: BmpMonevGroupEntry[] = groups.map((g) => {
    const lembagaByYear = new Map<number, Map<string, number | null>>();
    const groupProfiles = g.bmpGroupAssessments.map((ga) => {
      const scores: Record<string, number | null> = {};
      const byCode = new Map<string, number | null>();
      for (const d of ga.details) {
        scores[d.indicatorId] = d.score;
        const ind = indById.get(d.indicatorId);
        if (ind) byCode.set(ind.code, d.score);
      }
      lembagaByYear.set(ga.surveyYear, byCode);
      return { surveyYear: ga.surveyYear, scores };
    });
    const stat = new Map<string, BmpMonevIndicatorStat>();
    const assessments = g.farmers.flatMap((f) =>
      f.bmpAssessments.map((a) => {
        let activityScores: number[] | null = null;
        if (a.details.length > 0) {
          const individu = new Map<string, number | null>();
          for (const d of a.details) {
            const ind = indById.get(d.indicatorId);
            if (!ind) continue;
            individu.set(ind.code, d.score);
            const key = `${a.surveyYear}:${d.indicatorId}`;
            const st = stat.get(key) ?? { groupId: g.id, surveyYear: a.surveyYear, indicatorId: d.indicatorId, sum: 0, n: 0, nullCount: 0 };
            if (d.score == null) st.nullCount++;
            else { st.sum += d.score; st.n++; }
            stat.set(key, st);
          }
          const rc = recomputeBmpScore(indicatorRows, individu, lembagaByYear.get(a.surveyYear) ?? new Map());
          activityScores = activities.map((act) => rc.activities.find((x) => x.activityCode === act.code)?.indicatorScore ?? 0);
        }
        return { farmerId: f.id, surveyYear: a.surveyYear, score: a.score, activityScores };
      }),
    );
    indicatorStats.push(...stat.values());
    return {
      id: g.id,
      name: g.name,
      code: g.code,
      districtId: g.districtId,
      districtName: g.district.name,
      totalFarmers: g._count.farmers,
      assessments,
      groupProfiles,
    };
  });

  return { data: { groups: entries, activities, indicators, indicatorStats }, generatedAt: new Date().toISOString() };
}

export interface BmpMonevPriorityFarmer {
  assessmentId: string;
  farmerId: string;
  farmerName: string;
  farmerCode: string;
  farmerGroupName: string;
  score: number;
  /** Kegiatan dengan skor kegiatan terendah (bila ada rincian), untuk fokus pendampingan. */
  weakestActivity: string | null;
  /** Kegiatan dengan skor kegiatan tertinggi (bila ada rincian) — praktik yang bisa dicontoh. */
  strongestActivity: string | null;
}

export type BmpMonevFarmerRankOrder = "lowest" | "highest";

/**
 * Petani berskor terendah/tertinggi pada filter aktif (#346 — kartu "Petani
 * prioritas pendampingan" dan "Petani teladan", permintaan owner 2026-09-20).
 * Diambil on-demand (pola `getUntrainedFarmers`) supaya nama petani tidak ikut
 * payload dashboard. Scope: sama dengan dashboard.
 */
export async function getBmpMonevPriorityFarmers(
  filter: { districtId: string | null; groupId: string | null; year: number },
  limit = 10,
  order: BmpMonevFarmerRankOrder = "lowest",
): Promise<BmpMonevPriorityFarmer[]> {
  if (!(await hasPermission("dashboard-bmp-monev", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses dashboard Monev BMP");
  }
  if (!Number.isInteger(filter.year)) throw new Error("Tahun tidak valid");
  const access = await getAccessContext();
  const rows = await prisma.bmpAssessment.findMany({
    where: {
      isActive: true,
      surveyYear: filter.year,
      farmer: {
        isActive: true,
        ...(filter.groupId ? { farmerGroupId: filter.groupId } : {}),
        farmerGroup: {
          isActive: true,
          ...(filter.districtId ? { districtId: filter.districtId } : {}),
          AND: [farmerGroupAccessFilter(access)],
        },
      },
    },
    select: {
      id: true,
      farmerId: true,
      score: true,
      farmer: { select: { name: true, farmerId: true, farmerGroupId: true, farmerGroup: { select: { name: true } } } },
      details: { where: { isActive: true }, select: { indicatorId: true, score: true } },
    },
    orderBy: [{ score: order === "highest" ? "desc" : "asc" }, { farmer: { name: "asc" } }],
    take: Math.min(Math.max(limit, 1), 50),
  });
  if (rows.length === 0) return [];
  const indicators: BmpIndicatorRef[] = await prisma.bmpIndicator.findMany({
    where: { isActive: true },
    select: {
      id: true, code: true, activityCode: true, activityName: true, activityWeight: true, criteriaCode: true, criteriaName: true, seq: true,
      level: true, name: true, weight: true, inFinalScore: true, scoreLabel0: true, scoreLabel1: true, scoreLabel2: true, scoreLabel3: true, sortOrder: true,
    },
  });
  const byId = new Map(indicators.map((i) => [i.id, i]));
  // Skor Lembaga tahun itu ikut dihitung (sama dengan `getBmpMonevDashboardView`)
  // supaya kelima kegiatan dibandingkan pada skala 0–3 yang sama — tanpa ini
  // Training (individu hanya 0,3 dari 1,0) selalu tampak "terlemah" (temuan review).
  const groupIds = [...new Set(rows.map((r) => r.farmer.farmerGroupId))];
  const groupAssessments = await prisma.bmpGroupAssessment.findMany({
    where: { farmerGroupId: { in: groupIds }, surveyYear: filter.year, isActive: true },
    select: { farmerGroupId: true, details: { where: { isActive: true }, select: { indicatorId: true, score: true } } },
  });
  const lembagaByGroup = new Map<string, Map<string, number | null>>();
  for (const ga of groupAssessments) {
    const m = new Map<string, number | null>();
    for (const d of ga.details) {
      const ind = byId.get(d.indicatorId);
      if (ind) m.set(ind.code, d.score);
    }
    lembagaByGroup.set(ga.farmerGroupId, m);
  }
  return rows.map((r) => {
    let weakestActivity: string | null = null;
    let strongestActivity: string | null = null;
    if (r.details.length > 0) {
      const individu = new Map<string, number | null>();
      for (const d of r.details) {
        const ind = byId.get(d.indicatorId);
        if (ind) individu.set(ind.code, d.score);
      }
      const rc = recomputeBmpScore(indicators, individu, lembagaByGroup.get(r.farmer.farmerGroupId) ?? new Map());
      const candidates = [...rc.activities].sort((a, b) => a.indicatorScore - b.indicatorScore);
      weakestActivity = candidates[0]?.activityName ?? null;
      strongestActivity = candidates.at(-1)?.activityName ?? null;
    }
    return { assessmentId: r.id, farmerId: r.farmerId, farmerName: r.farmer.name, farmerCode: r.farmer.farmerId, farmerGroupName: r.farmer.farmerGroup.name, score: r.score, weakestActivity, strongestActivity };
  });
}
