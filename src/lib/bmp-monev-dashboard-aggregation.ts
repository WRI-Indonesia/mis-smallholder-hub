import {
  BMP_ASSESSMENT_CATEGORIES,
  bmpAssessmentCategory,
  roundScore,
  type BmpAssessmentCategoryKey,
} from "@/lib/bmp-assessment";
import { bmpActivityMaxScore } from "@/lib/bmp-survey-form";

/**
 * Agregasi MURNI Dashboard Monev BMP (#344) atas payload
 * `getBmpMonevDashboardView` — satu entri per Lembaga beserta seluruh
 * penilaian aktifnya. Pola Dashboard Pelatihan: query langsung (bukan
 * snapshot), filter Distrik/Lembaga/Tahun mengiris payload di klien.
 *
 * Grain = petani per tahun. Denominator cakupan = petani aktif Lembaga
 * (termasuk Lembaga yang belum dinilai sama sekali), sama dengan Pelatihan.
 */

export interface BmpMonevAssessmentEntry {
  farmerId: string;
  surveyYear: number;
  score: number;
  /**
   * Skor tertimbang per kegiatan (Σ bobot indikator × skor, skala ~0–3) urut
   * `activities`; null bila penilaian ini belum punya rincian indikator (#346).
   */
  activityScores?: number[] | null;
}

/** Profil kelembagaan: skor 14 indikator level LEMBAGA per tahun (#346). */
export interface BmpMonevGroupProfile {
  surveyYear: number;
  /** indicatorId → skor (null = tidak dinilai). */
  scores: Record<string, number | null>;
}

export interface BmpMonevGroupEntry {
  id: string;
  name: string;
  code: string | null;
  districtId: string;
  districtName: string;
  totalFarmers: number;
  assessments: BmpMonevAssessmentEntry[];
  groupProfiles?: BmpMonevGroupProfile[];
}

/** Kegiatan BMP (5) dengan bobotnya — dari master indikator. */
export interface BmpMonevActivity {
  code: string;
  name: string;
  weight: number;
}

/** Indikator untuk dashboard (subset master). */
export interface BmpMonevIndicator {
  id: string;
  code: string;
  level: "LEMBAGA" | "INDIVIDU";
  name: string;
  activityCode: string;
  activityName: string;
  /** Kriteria (`1.3.2`) — dipakai aturan kriteria alternatif (`BMP_EXCLUSIVE_CRITERIA`). */
  criteriaCode: string;
  weight: number | null;
  inFinalScore: boolean;
  sortOrder: number;
}

/** Agregat skor indikator INDIVIDU per (Lembaga, tahun, indikator) — dihitung server. */
export interface BmpMonevIndicatorStat {
  groupId: string;
  surveyYear: number;
  indicatorId: string;
  /** Σ skor petani yang dinilai (skor non-null). */
  sum: number;
  /** Jumlah petani ber-skor. */
  n: number;
  /** Jumlah petani dengan indikator ini kosong (tidak dinilai). */
  nullCount: number;
}

export interface BmpMonevDashboardView {
  data: {
    groups: BmpMonevGroupEntry[];
    activities?: BmpMonevActivity[];
    indicators?: BmpMonevIndicator[];
    indicatorStats?: BmpMonevIndicatorStat[];
  };
  generatedAt: string;
}

export type BmpMonevCategoryCounts = Record<BmpAssessmentCategoryKey, number>;

export interface BmpMonevTotals {
  /** Petani unik yang dinilai pada tahun terpilih. */
  assessedFarmers: number;
  totalFarmers: number;
  /** Rerata skor petani dinilai; null bila belum ada. */
  avgScore: number | null;
  /** Teladan + Praktisi (sudah menerapkan BMP). */
  adopters: number;
  groupsCovered: number;
  groupsTotal: number;
  byCategory: BmpMonevCategoryCounts;
}

export interface BmpMonevGroupRow {
  id: string;
  name: string;
  districtName: string;
  totalFarmers: number;
  assessedFarmers: number;
  avgScore: number | null;
  byCategory: BmpMonevCategoryCounts;
}

export interface BmpMonevTrendBucket {
  year: number;
  assessedFarmers: number;
  avgScore: number | null;
  byCategory: BmpMonevCategoryCounts;
}

function emptyCategoryCounts(): BmpMonevCategoryCounts {
  return { TELADAN: 0, PRAKTISI: 0, PERINTIS: 0, BELUM: 0 };
}

/** Tahun ber-data, urut TURUN (terbaru dulu) — opsi filter & default. */
export function bmpMonevAvailableYears(groups: BmpMonevGroupEntry[]): number[] {
  const years = new Set<number>();
  for (const g of groups) for (const a of g.assessments) years.add(a.surveyYear);
  return [...years].sort((a, b) => b - a);
}

export function filterBmpMonevGroups(
  groups: BmpMonevGroupEntry[],
  filter: { districtId: string | null; groupId: string | null },
): BmpMonevGroupEntry[] {
  return groups.filter(
    (g) => (!filter.districtId || g.districtId === filter.districtId) && (!filter.groupId || g.id === filter.groupId),
  );
}

/**
 * Penilaian tahun terpilih, satu per petani. Bila (karena data lama) ada
 * lebih dari satu baris aktif untuk petani-tahun yang sama, skor tertinggi
 * yang dipakai — tidak dijumlah dua kali.
 */
function yearAssessments(g: BmpMonevGroupEntry, year: number): Map<string, number> {
  const byFarmer = new Map<string, number>();
  for (const a of g.assessments) {
    if (a.surveyYear !== year) continue;
    const prev = byFarmer.get(a.farmerId);
    if (prev == null || a.score > prev) byFarmer.set(a.farmerId, a.score);
  }
  return byFarmer;
}

function avgOf(scores: number[]): number | null {
  if (scores.length === 0) return null;
  return roundScore(scores.reduce((s, x) => s + x, 0) / scores.length);
}

function countCategories(scores: Iterable<number>): BmpMonevCategoryCounts {
  const counts = emptyCategoryCounts();
  for (const s of scores) counts[bmpAssessmentCategory(s).key]++;
  return counts;
}

export function bmpMonevGroupRows(groups: BmpMonevGroupEntry[], year: number): BmpMonevGroupRow[] {
  return groups
    .map((g) => {
      const scores = [...yearAssessments(g, year).values()];
      return {
        id: g.id,
        name: g.name,
        districtName: g.districtName,
        totalFarmers: g.totalFarmers,
        assessedFarmers: scores.length,
        avgScore: avgOf(scores),
        byCategory: countCategories(scores),
      };
    })
    .sort((a, b) => {
      // Ber-data dulu (rerata turun), lalu Lembaga tanpa data urut nama.
      if (a.avgScore == null && b.avgScore == null) return a.name.localeCompare(b.name);
      if (a.avgScore == null) return 1;
      if (b.avgScore == null) return -1;
      return b.avgScore - a.avgScore || a.name.localeCompare(b.name);
    });
}

export function bmpMonevTotals(groups: BmpMonevGroupEntry[], year: number): BmpMonevTotals {
  const scores: number[] = [];
  let totalFarmers = 0;
  let groupsCovered = 0;
  for (const g of groups) {
    totalFarmers += g.totalFarmers;
    const ya = yearAssessments(g, year);
    if (ya.size > 0) groupsCovered++;
    scores.push(...ya.values());
  }
  const byCategory = countCategories(scores);
  return {
    assessedFarmers: scores.length,
    totalFarmers,
    avgScore: avgOf(scores),
    adopters: byCategory.TELADAN + byCategory.PRAKTISI,
    groupsCovered,
    groupsTotal: groups.length,
    byCategory,
  };
}

/** Tren per tahun (urut naik) atas seluruh Lembaga terpilih. */
export function bmpMonevTrend(groups: BmpMonevGroupEntry[]): BmpMonevTrendBucket[] {
  const years = bmpMonevAvailableYears(groups).sort((a, b) => a - b);
  return years.map((year) => {
    const scores: number[] = [];
    for (const g of groups) scores.push(...yearAssessments(g, year).values());
    return { year, assessedFarmers: scores.length, avgScore: avgOf(scores), byCategory: countCategories(scores) };
  });
}

/** Urutan tampil kategori dari TERENDAH ke tertinggi (batang stacked kiri→kanan). */
export const BMP_MONEV_STACK_ORDER = [...BMP_ASSESSMENT_CATEGORIES].reverse();

export interface BmpMonevScoreBin {
  /** Batas bawah inklusif. */
  from: number;
  /** Batas atas eksklusif (bin terakhir inklusif 3,00). */
  to: number;
  count: number;
  /** Kategori yang berlaku untuk seluruh bin (bin sejajar ambang 0,25 → tak pernah memotong ambang). */
  categoryKey: BmpAssessmentCategoryKey;
}

const BMP_MONEV_HISTOGRAM_BIN = 0.25;

/**
 * Histogram skor petani dinilai pada tahun terpilih, bin 0,25 dari 0 sampai 3
 * (12 bin). Ambang kategori (1,00 · 1,50 · 2,50) semuanya kelipatan 0,25,
 * jadi tiap bin hampir utuh berada di satu kategori dan diwarnai mengikutinya
 * (kategori dari titik tengah bin; satu-satunya pengecualian adalah skor tepat
 * 2,50 = Praktisi yang jatuh di bin berwarna Teladan — angka pastinya tetap
 * ada di kartu kategori, histogram hanya memberi bentuk sebaran).
 */
export function bmpMonevScoreHistogram(groups: BmpMonevGroupEntry[], year: number): BmpMonevScoreBin[] {
  const bins: BmpMonevScoreBin[] = [];
  const n = Math.round(3 / BMP_MONEV_HISTOGRAM_BIN);
  for (let i = 0; i < n; i++) {
    const from = roundScore(i * BMP_MONEV_HISTOGRAM_BIN);
    const to = roundScore((i + 1) * BMP_MONEV_HISTOGRAM_BIN);
    bins.push({ from, to, count: 0, categoryKey: bmpAssessmentCategory(from + BMP_MONEV_HISTOGRAM_BIN / 2).key });
  }
  for (const g of groups) {
    for (const s of yearAssessments(g, year).values()) {
      const idx = Math.min(n - 1, Math.max(0, Math.floor(s / BMP_MONEV_HISTOGRAM_BIN)));
      bins[idx].count++;
    }
  }
  return bins;
}

// ── Rincian indikator (#346) ──────────────────────────────────────────────

export interface BmpMonevActivityProfileRow {
  code: string;
  name: string;
  weight: number;
  /** Rerata skor tertimbang kegiatan atas petani ber-rincian; null bila tak ada. */
  avg: number | null;
  /** Skor maksimum kegiatan = Σ bobot efektif × 3 (kriteria alternatif dihitung sekali) = 3,00. */
  max: number;
  n: number;
}

/** Profil 5 kegiatan untuk filter aktif: rerata skor tertimbang per kegiatan atas petani yang punya rincian. */
export function bmpMonevActivityProfile(
  groups: BmpMonevGroupEntry[],
  year: number,
  activities: BmpMonevActivity[],
  indicators: BmpMonevIndicator[],
): BmpMonevActivityProfileRow[] {
  const sums = activities.map(() => 0);
  let n = 0;
  for (const g of groups) {
    // Satu penilaian per petani-tahun = yang berskor TERTINGGI (sama dengan
    // yearAssessments), lalu pakai activityScores-nya bila ada — bukan "yang
    // pertama punya rincian", supaya kartu-kartu tak memilih baris berbeda.
    const best = new Map<string, BmpMonevAssessmentEntry>();
    for (const a of g.assessments) {
      if (a.surveyYear !== year) continue;
      const prev = best.get(a.farmerId);
      if (!prev || a.score > prev.score) best.set(a.farmerId, a);
    }
    for (const a of best.values()) {
      if (!a.activityScores) continue;
      n++;
      a.activityScores.forEach((v, i) => (sums[i] += v));
    }
  }
  return activities.map((act, i) => {
    const avg = n > 0 ? Math.round((sums[i] / n) * 100) / 100 : null;
    const max = bmpActivityMaxScore(indicators, act.code);
    return {
      code: act.code,
      name: act.name,
      weight: act.weight,
      avg,
      max,
      n,
    };
  });
}

export interface BmpMonevWeakIndicatorRow {
  indicatorId: string;
  code: string;
  name: string;
  activityName: string;
  weight: number | null;
  avg: number | null;
  n: number;
  nullCount: number;
}

/**
 * Indikator INDIVIDU berbobot dengan rerata skor terendah pada filter aktif
 * (rerata atas petani ber-skor; jumlah "tidak dinilai" ditampilkan terpisah
 * supaya indikator yang jarang diisi tidak tampak "buruk" hanya karena kosong).
 */
export function bmpMonevWeakestIndicators(
  groups: BmpMonevGroupEntry[],
  year: number,
  indicators: BmpMonevIndicator[],
  stats: BmpMonevIndicatorStat[],
  limit = 5,
): BmpMonevWeakIndicatorRow[] {
  const groupIds = new Set(groups.map((g) => g.id));
  const acc = new Map<string, { sum: number; n: number; nullCount: number }>();
  for (const s of stats) {
    if (s.surveyYear !== year || !groupIds.has(s.groupId)) continue;
    const a = acc.get(s.indicatorId) ?? { sum: 0, n: 0, nullCount: 0 };
    a.sum += s.sum;
    a.n += s.n;
    a.nullCount += s.nullCount;
    acc.set(s.indicatorId, a);
  }
  return indicators
    .filter((i) => i.level === "INDIVIDU" && i.inFinalScore && i.weight != null)
    .map((i) => {
      const a = acc.get(i.id);
      return { indicatorId: i.id, code: i.code, name: i.name, activityName: i.activityName, weight: i.weight, avg: a && a.n > 0 ? Math.round((a.sum / a.n) * 100) / 100 : null, n: a?.n ?? 0, nullCount: a?.nullCount ?? 0 };
    })
    .filter((r) => r.avg != null)
    .sort((a, b) => a.avg! - b.avg! || b.nullCount - a.nullCount)
    .slice(0, limit);
}

export interface BmpMonevGroupProfileRow {
  id: string;
  name: string;
  /** indicatorId → skor; indikator tanpa penilaian Lembaga tahun itu → undefined. */
  scores: Record<string, number | null>;
  hasProfile: boolean;
  /**
   * Rata-rata SEDERHANA skor indikator Lembaga yang terisi (sel kosong
   * diabaikan) — alat baca/urut heatmap (permintaan owner 2026-09-20), bukan
   * skor kelembagaan resmi (form tidak mendefinisikannya).
   */
  avg: number | null;
  filled: number;
}

export type BmpMonevGroupProfileSort = "avg" | "name";

/** Heatmap Lembaga × indikator LEMBAGA untuk tahun terpilih; urut rerata turun atau abjad. */
export function bmpMonevGroupProfiles(groups: BmpMonevGroupEntry[], year: number, sort: BmpMonevGroupProfileSort = "avg"): BmpMonevGroupProfileRow[] {
  return groups
    .map((g) => {
      const p = g.groupProfiles?.find((x) => x.surveyYear === year);
      const vals = Object.values(p?.scores ?? {}).filter((v): v is number => v != null);
      return {
        id: g.id,
        name: g.name,
        scores: p?.scores ?? {},
        hasProfile: Boolean(p),
        avg: vals.length > 0 ? Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 100) / 100 : null,
        filled: vals.length,
      };
    })
    .sort((a, b) => {
      if (a.hasProfile !== b.hasProfile) return Number(b.hasProfile) - Number(a.hasProfile);
      if (sort === "avg") return (b.avg ?? -1) - (a.avg ?? -1) || a.name.localeCompare(b.name);
      return a.name.localeCompare(b.name);
    });
}

/** Rerata per indikator Lembaga (kolom heatmap) atas Lembaga ber-profil; null bila tak ada yang terisi. */
export function bmpMonevGroupIndicatorAverages(rows: BmpMonevGroupProfileRow[], indicatorIds: string[]): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  for (const id of indicatorIds) {
    const vals = rows.filter((r) => r.hasProfile).map((r) => r.scores[id]).filter((v): v is number => v != null);
    out[id] = vals.length ? Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 100) / 100 : null;
  }
  return out;
}
