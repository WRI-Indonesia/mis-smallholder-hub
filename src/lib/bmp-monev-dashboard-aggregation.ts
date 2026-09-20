import {
  BMP_ASSESSMENT_CATEGORIES,
  bmpAssessmentCategory,
  roundScore,
  type BmpAssessmentCategoryKey,
} from "@/lib/bmp-assessment";

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
}

export interface BmpMonevGroupEntry {
  id: string;
  name: string;
  code: string | null;
  districtId: string;
  districtName: string;
  totalFarmers: number;
  assessments: BmpMonevAssessmentEntry[];
}

export interface BmpMonevDashboardView {
  data: { groups: BmpMonevGroupEntry[] };
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

export function emptyCategoryCounts(): BmpMonevCategoryCounts {
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

export const BMP_MONEV_HISTOGRAM_BIN = 0.25;

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
