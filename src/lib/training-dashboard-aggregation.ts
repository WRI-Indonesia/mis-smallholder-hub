import type {
  TrainingBenefitFarmer,
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

export interface TrainingDistrictCoverageRow {
  districtName: string;
  totalFarmers: number;
  byPackage: Partial<Record<TrainingPackageCode, number>>;
  anyPackage: number;
  /** Dilatih hanya di tahun lain (lihat TrainingCoverageRow.byPackageOtherYears). */
  byPackageOtherYears: Partial<Record<TrainingPackageCode, number>>;
  anyPackageOtherYears: number;
}

/**
 * Roll-up matriks cakupan ke level distrik (#198) — bahan card "Petani
 * Terlatih vs Belum per Distrik". Σ antar Lembaga aman: petani milik tepat
 * satu Lembaga, jadi distinct count tidak tumpang-tindih antar baris.
 */
export function trainingDistrictCoverage(
  rows: TrainingCoverageRow[]
): TrainingDistrictCoverageRow[] {
  const map = new Map<string, TrainingDistrictCoverageRow>();
  for (const r of rows) {
    let d = map.get(r.districtName);
    if (!d) {
      d = {
        districtName: r.districtName,
        totalFarmers: 0,
        byPackage: {},
        anyPackage: 0,
        byPackageOtherYears: {},
        anyPackageOtherYears: 0,
      };
      map.set(r.districtName, d);
    }
    d.totalFarmers += r.totalFarmers;
    d.anyPackage += r.anyPackage;
    d.anyPackageOtherYears += r.anyPackageOtherYears ?? 0;
    for (const [code, n] of Object.entries(r.byPackage) as [TrainingPackageCode, number][]) {
      d.byPackage[code] = (d.byPackage[code] ?? 0) + n;
    }
    for (const [code, n] of Object.entries(r.byPackageOtherYears ?? {}) as [
      TrainingPackageCode,
      number,
    ][]) {
      d.byPackageOtherYears[code] = (d.byPackageOtherYears[code] ?? 0) + n;
    }
  }
  return [...map.values()].sort((a, b) => a.districtName.localeCompare(b.districtName));
}

/**
 * Ambang lulus post-test (#214): peserta ber-skor dengan post ≥ nilai ini
 * dihitung "lulus" pada KPI kelulusan dan panel kelulusan per paket.
 */
export const TRAINING_PASS_SCORE = 60;

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
  const scoredFarmers = new Set<string>();
  const passedFarmers = new Set<string>();
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
          // Basis petani unik (indikator impact "# of smallholders", #214):
          // sekali mencapai ambang di kehadiran mana pun → lulus.
          scoredFarmers.add(p.farmerId);
          if (p.postTestScore >= TRAINING_PASS_SCORE) passedFarmers.add(p.farmerId);
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
    scoredFarmers: scoredFarmers.size,
    passedFarmers: passedFarmers.size,
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

    // Saat filter tahun aktif: petani yang dilatih paket ybs HANYA di tahun
    // lain. Tanpa ini mereka tampak "belum dilatih" padahal sudah — cakupan
    // program bersifat kumulatif (#201).
    const byPackageOtherYears = emptyByPackage();
    let anyPackageOtherYears = 0;
    if (year != null) {
      const perPackageAll = new Map<TrainingPackageCode, Set<string>>();
      const anyAll = new Set<string>();
      for (const a of g.activities) {
        let set = perPackageAll.get(a.packageCode);
        if (!set) {
          set = new Set<string>();
          perPackageAll.set(a.packageCode, set);
        }
        for (const p of a.participants) {
          set.add(p.farmerId);
          anyAll.add(p.farmerId);
        }
      }
      for (const [code, all] of perPackageAll) {
        const selected = perPackage.get(code);
        let n = 0;
        for (const f of all) if (!selected?.has(f)) n += 1;
        byPackageOtherYears[code] = n;
      }
      for (const f of anyAll) if (!any.has(f)) anyPackageOtherYears += 1;
    }

    return {
      groupId: g.id,
      groupName: g.name,
      groupCode: g.code,
      districtName: g.districtName,
      totalFarmers: g.totalFarmers,
      byPackage,
      anyPackage: any.size,
      byPackageOtherYears,
      anyPackageOtherYears,
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
      scoredFarmers: Set<string>;
      passedFarmers: Set<string>;
      declined: number;
      unchanged: number;
    }
  >();

  for (const g of groups) {
    for (const a of activitiesInYear(g, year)) {
      let e = acc.get(a.packageCode);
      if (!e) {
        e = {
          scored: 0,
          attendance: 0,
          pre: 0,
          post: 0,
          scoredFarmers: new Set<string>(),
          passedFarmers: new Set<string>(),
          declined: 0,
          unchanged: 0,
        };
        acc.set(a.packageCode, e);
      }
      for (const p of a.participants) {
        e.attendance += 1;
        if (p.preTestScore == null || p.postTestScore == null) continue;
        e.scored += 1;
        e.pre += p.preTestScore;
        e.post += p.postTestScore;
        // Kelulusan per paket berbasis petani unik (#214), bukan kehadiran.
        e.scoredFarmers.add(p.farmerId);
        if (p.postTestScore >= TRAINING_PASS_SCORE) e.passedFarmers.add(p.farmerId);
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
      scoredFarmers: e.scoredFarmers.size,
      passedFarmers: e.passedFarmers.size,
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

/**
 * Kartu "Training Benefit per year" (#402): paket yang dilaporkan + label tabel
 * rujukan owner (bukan label pendek dashboard). `OTHER` tidak dilaporkan.
 */
export const TRAINING_BENEFIT_PACKAGES: TrainingPackageCode[] = [
  "PAKET_1_BMP_PC_RSPO_NKT",
  "PAKET_2_MK",
  "PAKET_2_K3",
  "PAKET_3_4_GEDSI_FINANCIAL_LIVELIHOOD_BUSDEV",
];
export const TRAINING_BENEFIT_LABELS: Partial<Record<TrainingPackageCode, string>> = {
  PAKET_1_BMP_PC_RSPO_NKT: "P1 | BMP, P&C RSPO, HCV",
  PAKET_2_MK: "P2 | Group Dynamic",
  PAKET_2_K3: "P2 | HSE",
  PAKET_3_4_GEDSI_FINANCIAL_LIVELIHOOD_BUSDEV: "P3 | GEDSI, Alternative Livelihood, Business Development",
};

/** Label baris total — petani yang mengikuti minimal satu pelatihan (paket apa pun). */
export const TRAINING_BENEFIT_ANY_LABEL = "Petani pernah mengikuti pelatihan (minimal 1)";

export interface TrainingBenefitYear {
  year: number;
  /** Kolom pertama mencakup tahun itu DAN sebelumnya ("≤ 2024"). */
  upTo: boolean;
}
export interface TrainingBenefitRow {
  /** `ANY` = baris "Petani pernah mengikuti pelatihan (minimal 1)" (semua paket, termasuk Lainnya). */
  code: TrainingPackageCode | "ANY";
  label: string;
  /** Sejajar `years`: actual = penerima manfaat BARU di kolom itu; cumulative = s.d. akhir tahun kolom. */
  cells: { actual: number; cumulative: number }[];
}

/** Kolom tahun bergeser otomatis (keputusan owner #402): ≤ (t−2) · t−1 · t. */
export function trainingBenefitYears(currentYear: number): TrainingBenefitYear[] {
  return [
    { year: currentYear - 2, upTo: true },
    { year: currentYear - 1, upTo: false },
    { year: currentYear, upTo: false },
  ];
}

/**
 * Tahun pertama tiap petani dilatih, per paket + "ANY" (pelatihan APA PUN, termasuk
 * Lainnya — padanan baris "Pernah Ikut Pelatihan"). Satu petani dihitung per Lembaga
 * (kunci Lembaga+petani), sama dengan `trainingCoverageMatrix`. Kegiatan bertanggal
 * setelah `upToYear` diabaikan. SATU definisi untuk Training Benefit per year (#402) dan
 * vs Kontrak (#403) — temuan review: dua salinan sempat menyimpang (filter tahun depan).
 */
export function firstTrainingYears(groups: TrainingGroupEntry[], upToYear: number): Map<TrainingPackageCode | "ANY", number[]> {
  const first = new Map<TrainingPackageCode | "ANY", Map<string, number>>();
  const note = (code: TrainingPackageCode | "ANY", key: string, y: number) => {
    let perFarmer = first.get(code);
    if (!perFarmer) first.set(code, (perFarmer = new Map()));
    const prev = perFarmer.get(key);
    if (prev == null || y < prev) perFarmer.set(key, y);
  };
  for (const g of groups) {
    for (const a of g.activities) {
      const y = yearOf(a.date);
      if (y > upToYear) continue;
      for (const p of a.participants) {
        const key = `${g.id}|${p.farmerId}`;
        note(a.packageCode, key, y);
        note("ANY", key, y);
      }
    }
  }
  return new Map([...first].map(([code, m]) => [code, [...m.values()]]));
}

/**
 * Training Benefit per year (#402, keputusan owner 2026-10-07): petani UNIK per paket;
 * Actual = penerima manfaat BARU (tahun pertama petani dilatih paket itu jatuh di kolom
 * tsb), Kumulative = s.d. akhir tahun kolom → Kumulative(t) = Kumulative(t−1) + Actual(t).
 *
 * Satu petani dihitung per Lembaga (kunci Lembaga+petani), sama dengan
 * `trainingCoverageMatrix`/Capaian Paket per Distrik — sehingga Kumulative tahun
 * berjalan = angka "sudah dilatih" Total di kartu itu (tanpa filter tahun). Kegiatan
 * bertanggal setelah tahun berjalan tidak dihitung. Filter Tahun dashboard diabaikan
 * (pemanggil memberi `groups` tanpa saring tahun).
 */
export function trainingBenefitPerYear(
  groups: TrainingGroupEntry[],
  currentYear: number,
): { years: TrainingBenefitYear[]; rows: TrainingBenefitRow[]; any: TrainingBenefitRow } {
  const years = trainingBenefitYears(currentYear);
  const first = firstTrainingYears(groups, currentYear);
  const cellsOf = (first: Iterable<number>) => {
    const counts = new Map<number, number>();
    for (const y of first) counts.set(y, (counts.get(y) ?? 0) + 1);
    const upTo = (limit: number) => [...counts].reduce((s, [y, n]) => (y <= limit ? s + n : s), 0);
    return years.map((c) => ({ actual: c.upTo ? upTo(c.year) : (counts.get(c.year) ?? 0), cumulative: upTo(c.year) }));
  };
  const rows: TrainingBenefitRow[] = TRAINING_BENEFIT_PACKAGES.map((code) => ({
    code,
    label: TRAINING_BENEFIT_LABELS[code] ?? TRAINING_PACKAGE_LABELS[code],
    cells: cellsOf(first.get(code) ?? []),
  }));
  const any: TrainingBenefitRow = { code: "ANY", label: TRAINING_BENEFIT_ANY_LABEL, cells: cellsOf(first.get("ANY") ?? []) };
  return { years, rows, any };
}

/** Satu baris sheet Detail ekspor Training Benefit per year (#402 lanjutan). */
export interface TrainingBenefitDetailRow {
  district: string;
  group: string;
  farmerCode: string;
  gender: "M" | "F";
  /** Sejajar `TRAINING_BENEFIT_PACKAGES`: tahun-tahun (unik, urut) petani dilatih paket itu; kosong = belum. */
  years: number[][];
}

/**
 * Detail per petani untuk ekspor: tahun dilatih tiap paket Training Benefit. Aturan sama
 * dengan `firstTrainingYears` — peserta per Lembaga (payload sudah membuang peserta tamu),
 * kegiatan setelah `upToYear` diabaikan — tetapi SEMUA tahun dicatat, bukan hanya yang
 * pertama. Petani aktif yang belum pernah dilatih tetap muncul (semua paket kosong), jadi
 * jumlah baris = total petani aktif (panjang trek Grafis). Urut Distrik → Lembaga → ID Petani.
 */
export function trainingBenefitDetailRows(
  groups: TrainingGroupEntry[],
  farmers: TrainingBenefitFarmer[],
  upToYear: number,
): TrainingBenefitDetailRow[] {
  const pkgIndex = new Map(TRAINING_BENEFIT_PACKAGES.map((code, i) => [code, i]));
  const years = new Map<string, Set<number>[]>();
  for (const g of groups) {
    for (const a of g.activities) {
      const i = pkgIndex.get(a.packageCode);
      const y = yearOf(a.date);
      if (i == null || y > upToYear) continue;
      for (const p of a.participants) {
        const key = `${g.id}|${p.farmerId}`;
        let perPkg = years.get(key);
        if (!perPkg) years.set(key, (perPkg = TRAINING_BENEFIT_PACKAGES.map(() => new Set<number>())));
        perPkg[i].add(y);
      }
    }
  }
  const groupById = new Map(groups.map((g) => [g.id, g]));
  const rows: TrainingBenefitDetailRow[] = [];
  for (const f of farmers) {
    const g = groupById.get(f.farmerGroupId);
    if (!g) continue;
    const perPkg = years.get(`${g.id}|${f.id}`);
    rows.push({
      district: g.districtName,
      group: g.name,
      farmerCode: f.farmerId,
      gender: f.gender,
      years: TRAINING_BENEFIT_PACKAGES.map((_, i) => (perPkg ? [...perPkg[i]].sort((a, b) => a - b) : [])),
    });
  }
  const cmp = (a: string, b: string) => a.localeCompare(b, "id", { numeric: true });
  return rows.sort((a, b) => cmp(a.district, b.district) || cmp(a.group, b.group) || cmp(a.farmerCode, b.farmerCode));
}
