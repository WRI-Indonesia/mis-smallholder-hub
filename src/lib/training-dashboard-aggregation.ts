import type {
  TrainingCoverageRow,
  TrainingDashboardData,
  TrainingGroupEntry,
  TrainingPackageCode,
  TrainingQualityStats,
  TrainingScoreRow,
  TrainingSliceFilter,
  TrainingTotals,
  TrainingTrendBucket,
} from "@/types/dashboard";

/** Urutan tampil paket di matriks, chart, dan tabel skor. OTHER selalu terakhir. */
export const TRAINING_PACKAGE_ORDER: TrainingPackageCode[] = [
  "PAKET_1_BMP_PC_RSPO_NKT",
  "PAKET_2_MK",
  "PAKET_2_K3",
  "PAKET_3_4_GEDSI_FINANCIAL_LIVELIHOOD_BUSDEV",
  "OTHER",
];

export const TRAINING_PACKAGE_LABELS: Record<TrainingPackageCode, string> = {
  PAKET_1_BMP_PC_RSPO_NKT: "Paket 1 — BMP/PC/RSPO/NKT",
  PAKET_2_MK: "Paket 2 — MK",
  PAKET_2_K3: "Paket 2 — HSE (K3)",
  PAKET_3_4_GEDSI_FINANCIAL_LIVELIHOOD_BUSDEV: "Paket 3 & 4 — GEDSI/BusDev",
  OTHER: "Lainnya",
};

/** Label ringkas untuk header kolom matriks & legenda chart. */
export const TRAINING_PACKAGE_SHORT: Record<TrainingPackageCode, string> = {
  PAKET_1_BMP_PC_RSPO_NKT: "Paket 1",
  PAKET_2_MK: "Paket 2 - MK",
  PAKET_2_K3: "Paket 2 - HSE",
  PAKET_3_4_GEDSI_FINANCIAL_LIVELIHOOD_BUSDEV: "Paket 3 & 4",
  OTHER: "Lainnya",
};

/**
 * Target cakupan program per paket, dalam persen petani aktif Lembaga
 * (keputusan owner 2026-07-21: **seluruh paket 100%** — setiap petani aktif
 * idealnya mengikuti keempat paket). Warna sel matriks dibaca terhadap angka ini.
 *
 * Mengubah target = ubah baris di sini. `OTHER` sengaja `null` (di luar paket
 * program resmi, tidak punya target sehingga tidak diwarnai sebagai kekurangan).
 */
export const TRAINING_COVERAGE_TARGET: Record<TrainingPackageCode, number | null> = {
  PAKET_1_BMP_PC_RSPO_NKT: 100,
  PAKET_2_MK: 100,
  PAKET_2_K3: 100,
  PAKET_3_4_GEDSI_FINANCIAL_LIVELIHOOD_BUSDEV: 100,
  OTHER: null,
};

/**
 * Berapa petani lagi yang harus dilatih agar satu sel mencapai targetnya.
 * 0 = target tercapai. Paket tanpa target (`OTHER`) selalu 0.
 */
export function trainingTargetGap(
  totalFarmers: number,
  trained: number,
  targetPct: number | null,
): number {
  if (targetPct == null || totalFarmers <= 0) return 0;
  const needed = Math.ceil((targetPct / 100) * totalFarmers);
  return Math.max(0, needed - trained);
}

/**
 * Total kekurangan petani menuju target, dijumlah lintas Lembaga × paket.
 *
 * Dijumlah atas **semua paket bertarget**, bukan hanya paket yang kebetulan
 * sudah punya kegiatan: target program berlaku untuk keempat paket sejak awal.
 * Kalau hanya paket ber-kegiatan yang dihitung, angkanya jadi non-monoton —
 * mencatat satu kegiatan paket baru justru membuat "kekurangan" melonjak,
 * seolah perbaikan data memperburuk keadaan.
 */
export function trainingTotalTargetGap(rows: TrainingCoverageRow[]): number {
  const targeted = TRAINING_PACKAGE_ORDER.filter((c) => TRAINING_COVERAGE_TARGET[c] != null);
  let gap = 0;
  for (const r of rows) {
    for (const code of targeted) {
      gap += trainingTargetGap(r.totalFarmers, r.byPackage[code], TRAINING_COVERAGE_TARGET[code]);
    }
  }
  return gap;
}

const emptyByPackage = (): Record<TrainingPackageCode, number> => ({
  PAKET_1_BMP_PC_RSPO_NKT: 0,
  PAKET_2_MK: 0,
  PAKET_2_K3: 0,
  PAKET_3_4_GEDSI_FINANCIAL_LIVELIHOOD_BUSDEV: 0,
  OTHER: 0,
});

const yearOf = (iso: string) => Number(iso.slice(0, 4));
const monthOf = (iso: string) => Number(iso.slice(5, 7)); // 1-12

/** Kegiatan Lembaga ini yang lolos filter tahun (null = semua tahun). */
function activitiesInYear(g: TrainingGroupEntry, year: number | null | undefined) {
  return year == null ? g.activities : g.activities.filter((a) => yearOf(a.date) === year);
}

/**
 * Persempit data per-Lembaga sesuai pilihan Distrik/Lembaga/Kategori. Filter
 * tahun TIDAK diterapkan di sini — denominator cakupan (total petani aktif)
 * tidak bergantung tahun, jadi tahun disaring per-kegiatan di tiap agregator.
 */
export function filterTrainingGroups(
  data: TrainingDashboardData,
  filter: TrainingSliceFilter,
): TrainingGroupEntry[] {
  return data.groups.filter((g) => {
    if (filter.districtId && g.districtId !== filter.districtId) return false;
    if (filter.groupId && g.id !== filter.groupId) return false;
    if (filter.category && g.category !== filter.category) return false;
    return true;
  });
}

/** Tahun yang punya kegiatan, terbaru dulu — mengisi dropdown Tahun. */
export function trainingAvailableYears(groups: TrainingGroupEntry[]): number[] {
  const set = new Set<number>();
  for (const g of groups) for (const a of g.activities) set.add(yearOf(a.date));
  return [...set].sort((a, b) => b - a);
}

/**
 * KPI baris atas. `trainedFarmers` dihitung dari petani unik lintas Lembaga
 * (farmerId unik secara global, bukan dijumlah per Lembaga) supaya tidak
 * double-count bila seorang petani muncul di dua Lembaga.
 */
export function trainingTotals(
  groups: TrainingGroupEntry[],
  year: number | null = null,
): TrainingTotals {
  const trained = new Set<string>();
  let totalFarmers = 0;
  let totalActivities = 0;
  let totalAttendance = 0;
  let femaleAttendance = 0;
  let scoredAttendance = 0;
  let sumPre = 0;
  let sumPost = 0;

  for (const g of groups) {
    totalFarmers += g.totalFarmers;
    for (const a of activitiesInYear(g, year)) {
      totalActivities += 1;
      for (const p of a.participants) {
        totalAttendance += 1;
        trained.add(p.farmerId);
        if (p.gender === "F") femaleAttendance += 1;
        if (p.preTestScore != null && p.postTestScore != null) {
          scoredAttendance += 1;
          sumPre += p.preTestScore;
          sumPost += p.postTestScore;
        }
      }
    }
  }

  const avgPre = scoredAttendance > 0 ? sumPre / scoredAttendance : 0;
  const avgPost = scoredAttendance > 0 ? sumPost / scoredAttendance : 0;

  return {
    totalFarmers,
    trainedFarmers: trained.size,
    totalActivities,
    totalAttendance,
    femaleAttendance,
    scoredAttendance,
    avgPreScore: avgPre,
    avgPostScore: avgPost,
    avgScoreGain: avgPost - avgPre,
  };
}

/**
 * Matriks cakupan: satu baris per Lembaga, sel = jumlah petani UNIK Lembaga itu
 * yang sudah dilatih paket ybs. Persentase dihitung di UI terhadap `totalFarmers`
 * (seluruh petani aktif Lembaga — keputusan owner, bukan hanya yang pernah dilatih).
 */
export function trainingCoverageMatrix(
  groups: TrainingGroupEntry[],
  year: number | null = null,
): TrainingCoverageRow[] {
  return groups.map((g) => {
    const perPackage = new Map<TrainingPackageCode, Set<string>>();
    const any = new Set<string>();

    for (const a of activitiesInYear(g, year)) {
      let set = perPackage.get(a.packageCode);
      if (!set) {
        set = new Set<string>();
        perPackage.set(a.packageCode, set);
      }
      for (const p of a.participants) {
        set.add(p.farmerId);
        any.add(p.farmerId);
      }
    }

    const byPackage = emptyByPackage();
    for (const [code, set] of perPackage) byPackage[code] = set.size;

    return {
      groupId: g.id,
      groupName: g.name,
      groupCode: g.code,
      districtName: g.districtName,
      totalFarmers: g.totalFarmers,
      byPackage,
      anyPackage: any.size,
    };
  });
}

/** Paket yang benar-benar punya kegiatan — kolom matriks & seri chart mengikuti ini. */
export function trainingActivePackages(
  groups: TrainingGroupEntry[],
  year: number | null = null,
): TrainingPackageCode[] {
  const seen = new Set<TrainingPackageCode>();
  for (const g of groups) for (const a of activitiesInYear(g, year)) seen.add(a.packageCode);
  return TRAINING_PACKAGE_ORDER.filter((c) => seen.has(c));
}

const MONTHS_ID = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

/**
 * Seri chart tren. Tahun dipilih → 12 bucket bulan Jan–Des tahun itu; "semua
 * tahun" → satu bucket per tahun yang ada datanya (urut menaik).
 */
export function trainingTrendSeries(
  groups: TrainingGroupEntry[],
  year: number | null = null,
): TrainingTrendBucket[] {
  const buckets = new Map<string, TrainingTrendBucket>();

  const ensure = (label: string) => {
    let b = buckets.get(label);
    if (!b) {
      b = { label, activities: 0, attendance: 0, byPackage: emptyByPackage() };
      buckets.set(label, b);
    }
    return b;
  };

  if (year != null) for (const m of MONTHS_ID) ensure(m);
  else {
    const years = trainingAvailableYears(groups).sort((a, b) => a - b);
    for (const y of years) ensure(String(y));
  }

  for (const g of groups) {
    for (const a of activitiesInYear(g, year)) {
      const label = year != null ? MONTHS_ID[monthOf(a.date) - 1] : String(yearOf(a.date));
      const b = ensure(label);
      b.activities += 1;
      b.attendance += a.participants.length;
      b.byPackage[a.packageCode] += a.participants.length;
    }
  }

  return [...buckets.values()];
}

/** Ringkasan pre/post-test per paket — hanya peserta dengan kedua skor terisi. */
export function trainingScoreRows(
  groups: TrainingGroupEntry[],
  year: number | null = null,
): TrainingScoreRow[] {
  const acc = new Map<
    TrainingPackageCode,
    {
      scored: number;
      attendance: number;
      pre: number;
      post: number;
      declined: number;
      unchanged: number;
    }
  >();

  for (const g of groups) {
    for (const a of activitiesInYear(g, year)) {
      let e = acc.get(a.packageCode);
      if (!e) {
        e = { scored: 0, attendance: 0, pre: 0, post: 0, declined: 0, unchanged: 0 };
        acc.set(a.packageCode, e);
      }
      for (const p of a.participants) {
        e.attendance += 1;
        if (p.preTestScore == null || p.postTestScore == null) continue;
        e.scored += 1;
        e.pre += p.preTestScore;
        e.post += p.postTestScore;
        if (p.postTestScore < p.preTestScore) e.declined += 1;
        else if (p.postTestScore === p.preTestScore) e.unchanged += 1;
      }
    }
  }

  return TRAINING_PACKAGE_ORDER.filter((c) => acc.has(c)).map((code) => {
    const e = acc.get(code)!;
    const avgPre = e.scored > 0 ? e.pre / e.scored : 0;
    const avgPost = e.scored > 0 ? e.post / e.scored : 0;
    return {
      packageCode: code,
      scored: e.scored,
      attendance: e.attendance,
      avgPre,
      avgPost,
      gain: avgPost - avgPre,
      declined: e.declined,
      unchanged: e.unchanged,
    };
  });
}

/** Hitungan temuan kualitas data pada irisan yang sedang tampil. */
export function trainingQualityStats(
  groups: TrainingGroupEntry[],
  year: number | null = null,
): TrainingQualityStats {
  let activitiesWithoutEvidence = 0;
  let activitiesWithoutLocation = 0;
  let activitiesWithoutParticipants = 0;
  let participantsWithoutScores = 0;
  let totalActivities = 0;
  let totalAttendance = 0;

  for (const g of groups) {
    for (const a of activitiesInYear(g, year)) {
      totalActivities += 1;
      if (!a.hasEvidence) activitiesWithoutEvidence += 1;
      if (!a.hasLocation) activitiesWithoutLocation += 1;
      if (a.participants.length === 0) activitiesWithoutParticipants += 1;
      for (const p of a.participants) {
        totalAttendance += 1;
        if (p.preTestScore == null || p.postTestScore == null) participantsWithoutScores += 1;
      }
    }
  }

  return {
    activitiesWithoutEvidence,
    activitiesWithoutLocation,
    activitiesWithoutParticipants,
    participantsWithoutScores,
    totalActivities,
    totalAttendance,
  };
}
