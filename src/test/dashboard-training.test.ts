import { describe, it, expect } from "vitest";
import {
  TRAINING_COVERAGE_TARGET,
  TRAINING_PASS_SCORE,
  trainingTargetGap,
  trainingTotalTargetGap,
  filterTrainingGroups,
  trainingActivePackages,
  trainingAvailableYears,
  trainingCoverageMatrix,
  trainingQualityStats,
  trainingScoreRows,
  trainingTotals,
  trainingTrendSeries,
  trainingDistrictCoverage,
  trainingBenefitPerYear,
  trainingBenefitYears,
  TRAINING_BENEFIT_PACKAGES,
} from "@/lib/training-dashboard-aggregation";
import type {
  TrainingActivityEntry,
  TrainingDashboardData,
  TrainingGroupEntry,
  TrainingPackageCode,
  TrainingParticipantEntry,
} from "@/types/dashboard";

const p = (
  farmerId: string,
  gender: "M" | "F" = "M",
  pre: number | null = null,
  post: number | null = null,
): TrainingParticipantEntry => ({ farmerId, gender, preTestScore: pre, postTestScore: post });

const act = (
  id: string,
  packageCode: TrainingPackageCode,
  date: string,
  participants: TrainingParticipantEntry[],
  opts: { hasEvidence?: boolean; hasLocation?: boolean } = {},
): TrainingActivityEntry => ({
  id,
  packageCode,
  date,
  hasEvidence: opts.hasEvidence ?? true,
  hasLocation: opts.hasLocation ?? true,
  participants,
});

const group = (id: string, overrides: Partial<TrainingGroupEntry> = {}): TrainingGroupEntry => ({
  id,
  name: `Lembaga ${id}`,
  code: id.toUpperCase(),
  category: "SWADAYA",
  districtId: "d1",
  districtName: "Siak",
  totalFarmers: 10,
  activities: [],
  ...overrides,
});

/**
 * Fixture: dua Lembaga di distrik berbeda.
 * g1 — 10 petani; f1 ikut Paket 1 dua kali (2024 & 2025) + Paket 2-MK; f2 ikut Paket 1.
 * g2 — 5 petani; f9 ikut Paket 1 (2025), tanpa bukti & tanpa lokasi.
 */
const DATA: TrainingDashboardData = {
  groups: [
    group("g1", {
      activities: [
        act("a1", "PAKET_1_BMP_PC_RSPO_NKT", "2024-03-10", [
          p("f1", "M", 40, 70),
          p("f2", "F", 50, 60),
        ]),
        act("a2", "PAKET_1_BMP_PC_RSPO_NKT", "2025-05-20", [p("f1", "M", 60, 55)]),
        act("a3", "PAKET_2_MK", "2025-05-22", [p("f1", "M")]),
      ],
    }),
    group("g2", {
      districtId: "d2",
      districtName: "Pelalawan",
      category: "EX_PLASMA",
      totalFarmers: 5,
      activities: [
        act("a4", "PAKET_1_BMP_PC_RSPO_NKT", "2025-07-01", [p("f9", "F", 30, 80)], {
          hasEvidence: false,
          hasLocation: false,
        }),
      ],
    }),
  ],
};

describe("filterTrainingGroups", () => {
  it("returns all groups when no filter is given", () => {
    expect(filterTrainingGroups(DATA, {}).map((g) => g.id)).toEqual(["g1", "g2"]);
  });

  it("filters by district, group, and category", () => {
    expect(filterTrainingGroups(DATA, { districtId: "d2" }).map((g) => g.id)).toEqual(["g2"]);
    expect(filterTrainingGroups(DATA, { groupId: "g1" }).map((g) => g.id)).toEqual(["g1"]);
    expect(filterTrainingGroups(DATA, { category: "EX_PLASMA" }).map((g) => g.id)).toEqual(["g2"]);
  });

  it("combines filters conjunctively", () => {
    expect(filterTrainingGroups(DATA, { districtId: "d1", category: "EX_PLASMA" })).toEqual([]);
  });
});

describe("trainingAvailableYears", () => {
  it("lists years that have activities, newest first", () => {
    expect(trainingAvailableYears(DATA.groups)).toEqual([2025, 2024]);
  });
});

describe("trainingTotals", () => {
  it("counts unique trained farmers, not attendance rows", () => {
    const t = trainingTotals(DATA.groups);
    // f1, f2, f9 — f1 hadir 3x tapi tetap dihitung satu petani.
    expect(t.trainedFarmers).toBe(3);
    expect(t.totalAttendance).toBe(5);
    expect(t.totalActivities).toBe(4);
  });

  it("uses all active farmers as the coverage denominator", () => {
    expect(trainingTotals(DATA.groups).totalFarmers).toBe(15);
  });

  it("counts female attendance per attendance row", () => {
    expect(trainingTotals(DATA.groups).femaleAttendance).toBe(2); // f2 + f9
  });

  it("averages scores only over participants with both pre and post", () => {
    const t = trainingTotals(DATA.groups);
    expect(t.scoredAttendance).toBe(4); // a3's f1 punya skor kosong
    expect(t.avgPreScore).toBeCloseTo((40 + 50 + 60 + 30) / 4);
    expect(t.avgPostScore).toBeCloseTo((70 + 60 + 55 + 80) / 4);
    expect(t.avgScoreGain).toBeCloseTo(66.25 - 45);
  });

  it("menghitung petani unik lulus post-test ≥ 60 — sekali lulus tetap lulus (#214)", () => {
    expect(TRAINING_PASS_SCORE).toBe(60);
    const t = trainingTotals(DATA.groups);
    expect(t.scoredFarmers).toBe(3); // f1, f2, f9 — f1 ber-skor 2x tetap satu petani
    // f1 lulus via a1 (70) meski a2-nya 55; f2 tepat 60 (batas bawah lulus); f9 80.
    expect(t.passedFarmers).toBe(3);

    // Tahun 2025: hanya f1@a2 (55) dan f9 (80) ber-skor → f1 belum lulus tahun itu.
    const t25 = trainingTotals(DATA.groups, 2025);
    expect(t25.scoredFarmers).toBe(2);
    expect(t25.passedFarmers).toBe(1);
  });

  it("narrows to the selected year", () => {
    const t = trainingTotals(DATA.groups, 2024);
    expect(t.totalActivities).toBe(1);
    expect(t.trainedFarmers).toBe(2);
    // Denominator tetap seluruh petani aktif — tidak ikut menyusut per tahun.
    expect(t.totalFarmers).toBe(15);
  });

  it("returns zeroed averages when nothing is scored", () => {
    const t = trainingTotals([
      group("gx", { activities: [act("z", "PAKET_2_MK", "2025-01-01", [p("f1")])] }),
    ]);
    expect(t.scoredAttendance).toBe(0);
    expect(t.scoredFarmers).toBe(0);
    expect(t.passedFarmers).toBe(0);
    expect(t.avgScoreGain).toBe(0);
  });
});

describe("trainingCoverageMatrix", () => {
  it("counts unique farmers per package, not repeat attendance", () => {
    const rows = trainingCoverageMatrix(DATA.groups);
    const g1 = rows.find((r) => r.groupId === "g1")!;
    // f1 ikut Paket 1 dua kali → tetap dihitung sekali.
    expect(g1.byPackage.PAKET_1_BMP_PC_RSPO_NKT).toBe(2);
    expect(g1.byPackage.PAKET_2_MK).toBe(1);
    expect(g1.anyPackage).toBe(2);
    expect(g1.totalFarmers).toBe(10);
  });

  it("leaves untouched packages at zero", () => {
    const g2 = trainingCoverageMatrix(DATA.groups).find((r) => r.groupId === "g2")!;
    expect(g2.byPackage.PAKET_2_K3).toBe(0);
    expect(g2.anyPackage).toBe(1);
  });

  it("respects the year filter", () => {
    const g1 = trainingCoverageMatrix(DATA.groups, 2024).find((r) => r.groupId === "g1")!;
    expect(g1.byPackage.PAKET_1_BMP_PC_RSPO_NKT).toBe(2);
    expect(g1.byPackage.PAKET_2_MK).toBe(0);
  });

  it("dengan filter tahun: hitung petani yang dilatih HANYA di tahun lain", () => {
    // 2025: Paket 1 diikuti f1 saja; f2 hanya dilatih 2024 → masuk "tahun lain".
    const g1 = trainingCoverageMatrix(DATA.groups, 2025).find((r) => r.groupId === "g1")!;
    expect(g1.byPackage.PAKET_1_BMP_PC_RSPO_NKT).toBe(1);
    expect(g1.byPackageOtherYears!.PAKET_1_BMP_PC_RSPO_NKT).toBe(1);
    expect(g1.anyPackage).toBe(1);
    expect(g1.anyPackageOtherYears).toBe(1);

    // 2024: Paket 2-MK belum ada; f1 ikut MK di 2025 → "tahun lain" utk MK.
    const g1y24 = trainingCoverageMatrix(DATA.groups, 2024).find((r) => r.groupId === "g1")!;
    expect(g1y24.byPackageOtherYears!.PAKET_1_BMP_PC_RSPO_NKT).toBe(0);
    expect(g1y24.byPackageOtherYears!.PAKET_2_MK).toBe(1);
    // f1 & f2 sudah terlatih di 2024 → tidak ada yang "hanya tahun lain".
    expect(g1y24.anyPackageOtherYears).toBe(0);
  });

  it("tanpa filter tahun: hitungan 'tahun lain' selalu nol", () => {
    const g1 = trainingCoverageMatrix(DATA.groups).find((r) => r.groupId === "g1")!;
    expect(g1.byPackageOtherYears!.PAKET_1_BMP_PC_RSPO_NKT).toBe(0);
    expect(g1.anyPackageOtherYears).toBe(0);
  });
});

describe("trainingActivePackages", () => {
  it("returns only packages with activities, in canonical order", () => {
    expect(trainingActivePackages(DATA.groups)).toEqual(["PAKET_1_BMP_PC_RSPO_NKT", "PAKET_2_MK"]);
    expect(trainingActivePackages(DATA.groups, 2024)).toEqual(["PAKET_1_BMP_PC_RSPO_NKT"]);
  });
});

describe("trainingTrendSeries", () => {
  it("emits 12 month buckets when a year is selected", () => {
    const s = trainingTrendSeries(DATA.groups, 2025);
    expect(s).toHaveLength(12);
    expect(s.map((b) => b.label)[0]).toBe("Jan");
    const mei = s.find((b) => b.label === "Mei")!;
    expect(mei.activities).toBe(2);
    expect(mei.attendance).toBe(2);
    expect(mei.byPackage.PAKET_2_MK).toBe(1);
  });

  it("emits one bucket per year, ascending, when no year is selected", () => {
    const s = trainingTrendSeries(DATA.groups);
    expect(s.map((b) => b.label)).toEqual(["2024", "2025"]);
    expect(s[0].attendance).toBe(2);
    expect(s[1].attendance).toBe(3);
  });
});

describe("trainingScoreRows", () => {
  it("aggregates pre/post per package and flags declines", () => {
    const rows = trainingScoreRows(DATA.groups);
    const paket1 = rows.find((r) => r.packageCode === "PAKET_1_BMP_PC_RSPO_NKT")!;
    expect(paket1.scored).toBe(4);
    expect(paket1.attendance).toBe(4);
    expect(paket1.declined).toBe(1); // f1 di a2: 60 → 55
    expect(paket1.gain).toBeCloseTo((70 + 60 + 55 + 80) / 4 - (40 + 50 + 60 + 30) / 4);
  });

  it("reports attendance without scores as scored=0", () => {
    const mk = trainingScoreRows(DATA.groups).find((r) => r.packageCode === "PAKET_2_MK")!;
    expect(mk.attendance).toBe(1);
    expect(mk.scored).toBe(0);
    expect(mk.scoredFarmers).toBe(0);
    expect(mk.passedFarmers).toBe(0);
    expect(mk.gain).toBe(0);
  });

  it("kelulusan per paket: petani unik, mengikuti filter tahun (#214)", () => {
    const paket1 = trainingScoreRows(DATA.groups).find(
      (r) => r.packageCode === "PAKET_1_BMP_PC_RSPO_NKT",
    )!;
    // f1 ber-skor 2x (70 lulus, 55 tidak) → dihitung satu petani, tetap lulus.
    expect(paket1.scoredFarmers).toBe(3);
    expect(paket1.passedFarmers).toBe(3);

    const paket1y25 = trainingScoreRows(DATA.groups, 2025).find(
      (r) => r.packageCode === "PAKET_1_BMP_PC_RSPO_NKT",
    )!;
    expect(paket1y25.scoredFarmers).toBe(2); // f1 (55) & f9 (80)
    expect(paket1y25.passedFarmers).toBe(1); // hanya f9
  });

  it("counts unchanged scores separately from declines", () => {
    const rows = trainingScoreRows([
      group("gx", { activities: [act("z", "PAKET_2_MK", "2025-01-01", [p("f1", "M", 50, 50)])] }),
    ]);
    expect(rows[0].unchanged).toBe(1);
    expect(rows[0].declined).toBe(0);
  });
});

describe("trainingQualityStats", () => {
  it("counts missing evidence, location, and scores", () => {
    const q = trainingQualityStats(DATA.groups);
    expect(q.totalActivities).toBe(4);
    expect(q.activitiesWithoutEvidence).toBe(1);
    expect(q.activitiesWithoutLocation).toBe(1);
    expect(q.participantsWithoutScores).toBe(1); // f1 di a3
    expect(q.activitiesWithoutParticipants).toBe(0);
  });

  it("flags activities that have no participants at all", () => {
    const q = trainingQualityStats([
      group("gx", { activities: [act("z", "PAKET_2_MK", "2025-01-01", [])] }),
    ]);
    expect(q.activitiesWithoutParticipants).toBe(1);
    expect(q.totalAttendance).toBe(0);
  });
});

// Scope data-access & guard `getTrainingDashboardView`/`getUntrainedFarmers`
// diuji lewat action asli di `dashboard-training-guard.test.ts`.

describe("target cakupan (TRAINING_COVERAGE_TARGET / trainingTargetGap)", () => {
  it("menargetkan 100% untuk keempat paket program, OTHER tanpa target", () => {
    expect(TRAINING_COVERAGE_TARGET.PAKET_1_BMP_PC_RSPO_NKT).toBe(100);
    expect(TRAINING_COVERAGE_TARGET.PAKET_2_MK).toBe(100);
    expect(TRAINING_COVERAGE_TARGET.PAKET_2_K3).toBe(100);
    expect(TRAINING_COVERAGE_TARGET.PAKET_3_4_GEDSI_FINANCIAL_LIVELIHOOD_BUSDEV).toBe(100);
    expect(TRAINING_COVERAGE_TARGET.OTHER).toBeNull();
  });

  it("gap = sisa petani menuju target", () => {
    expect(trainingTargetGap(10, 4, 100)).toBe(6);
    expect(trainingTargetGap(10, 4, 50)).toBe(1); // butuh 5, sudah 4
  });

  it("gap 0 saat target tercapai", () => {
    expect(trainingTargetGap(10, 10, 100)).toBe(0);
    // `trained > totalFarmers` seharusnya tidak mungkin lagi setelah pembilang
    // difilter `farmer.isActive` + keanggotaan Lembaga (lihat action). Dijaga
    // agar tidak negatif kalau toh terjadi — bukan pengesahan atas kondisi itu.
    expect(trainingTargetGap(10, 12, 100)).toBe(0);
  });

  it("paket tanpa target dan Lembaga tanpa petani aktif tidak pernah menghasilkan gap", () => {
    expect(trainingTargetGap(10, 0, null)).toBe(0);
    expect(trainingTargetGap(0, 0, 100)).toBe(0);
  });

  it("membulatkan ke atas — target 30% dari 10 petani butuh 3 orang", () => {
    expect(trainingTargetGap(10, 0, 30)).toBe(3);
    expect(trainingTargetGap(7, 0, 30)).toBe(3); // ceil(2,1)
  });

  it("total gap dijumlah atas SEMUA paket bertarget, bukan hanya yang sudah ada kegiatannya", () => {
    const rows = trainingCoverageMatrix(DATA.groups);
    // g1 (10 petani): P1 10-2=8, MK 10-1=9, K3 10, P3&4 10 → 37.
    // g2 (5 petani):  P1 5-1=4,  MK 5,     K3 5,  P3&4 5  → 19.
    expect(trainingTotalTargetGap(rows)).toBe(56);
  });

  it("gap tidak melonjak saat paket baru mulai dicatat (monoton turun)", () => {
    // Regresi: dulu dijumlah atas `trainingActivePackages`, sehingga mencatat
    // kegiatan paket baru justru MENAIKKAN angka "kekurangan" — perbaikan data
    // terbaca sebagai kemunduran.
    const before = trainingTotalTargetGap(trainingCoverageMatrix([group("g1")]));
    const after = trainingTotalTargetGap(
      trainingCoverageMatrix([
        group("g1", {
          activities: [act("z", "PAKET_2_K3", "2025-02-01", [p("f1"), p("f2")])],
        }),
      ]),
    );
    expect(before).toBe(40); // 4 paket × 10 petani, belum ada kegiatan
    expect(after).toBe(38); // 2 petani ikut K3 → berkurang 2, tidak melonjak
    expect(after).toBeLessThan(before);
  });
});

describe("trainingDistrictCoverage (#198)", () => {
  const row = (
    districtName: string,
    totalFarmers: number,
    k3: number,
    anyPackage: number,
  ): import("@/types/dashboard").TrainingCoverageRow => ({
    groupId: `${districtName}-${totalFarmers}`,
    groupName: "G",
    groupCode: null,
    districtName,
    totalFarmers,
    byPackage: {
      PAKET_1_BMP_PC_RSPO_NKT: 0,
      PAKET_2_MK: 0,
      PAKET_2_K3: k3,
      PAKET_3_4_GEDSI_FINANCIAL_LIVELIHOOD_BUSDEV: 0,
      OTHER: 0,
    },
    anyPackage,
  });

  it("roll-up per distrik: Σ petani, Σ per paket, Σ anyPackage; urut nama", () => {
    const d = trainingDistrictCoverage([
      row("Siak", 100, 40, 60),
      row("Pelalawan", 50, 10, 20),
      row("Siak", 30, 5, 10),
    ]);
    expect(d.map((x) => x.districtName)).toEqual(["Pelalawan", "Siak"]);
    const siak = d[1];
    expect(siak.totalFarmers).toBe(130);
    expect(siak.byPackage.PAKET_2_K3).toBe(45);
    expect(siak.anyPackage).toBe(70);
    // Belum = total − sudah, tidak pernah negatif (invarian pembilang ≤ penyebut)
    expect(siak.totalFarmers - (siak.byPackage.PAKET_2_K3 ?? 0)).toBeGreaterThanOrEqual(0);
  });

  it("daftar kosong → kosong", () => {
    expect(trainingDistrictCoverage([])).toEqual([]);
  });

  it("roll-up menyertakan hitungan 'tahun lain' saat filter tahun aktif", () => {
    const d = trainingDistrictCoverage(trainingCoverageMatrix(DATA.groups, 2025));
    const siak = d.find((x) => x.districtName === "Siak")!;
    expect(siak.byPackageOtherYears.PAKET_1_BMP_PC_RSPO_NKT).toBe(1); // f2 (hanya 2024)
    expect(siak.anyPackageOtherYears).toBe(1);
    const pelalawan = d.find((x) => x.districtName === "Pelalawan")!;
    expect(pelalawan.anyPackageOtherYears).toBe(0);
  });
});

describe("trainingBenefitPerYear — Training Benefit per year (#402)", () => {
  const P1: TrainingPackageCode = "PAKET_1_BMP_PC_RSPO_NKT";
  const MK: TrainingPackageCode = "PAKET_2_MK";
  const groups = [
    group("g1", {
      activities: [
        act("a1", P1, "2023-05-01", [p("f1"), p("f2")]),
        act("a2", P1, "2025-03-01", [p("f2"), p("f3")]), // f2 sudah dilatih 2023 → bukan penerima baru 2025
        act("a3", P1, "2026-02-01", [p("f4")]),
        act("a4", MK, "2026-01-10", [p("f1")]),
        act("a5", P1, "2027-01-01", [p("f9")]), // setelah tahun berjalan → diabaikan
        act("a6", "OTHER", "2026-01-01", [p("f5")]), // OTHER tak dilaporkan
      ],
    }),
    // Petani yang sama di Lembaga lain dihitung terpisah — sama dengan matriks cakupan.
    group("g2", { activities: [act("b1", P1, "2025-06-01", [p("f1")])] }),
  ];

  it("kolom tahun bergeser otomatis: ≤ t−2 · t−1 · t", () => {
    expect(trainingBenefitYears(2026)).toEqual([
      { year: 2024, upTo: true },
      { year: 2025, upTo: false },
      { year: 2026, upTo: false },
    ]);
    expect(trainingBenefitYears(2027)[0]).toEqual({ year: 2025, upTo: true });
  });

  it("Actual = penerima manfaat baru; Kumulative = s.d. akhir tahun; Kum(t) = Kum(t−1) + Actual(t)", () => {
    const { rows } = trainingBenefitPerYear(groups, 2026);
    const p1 = rows.find((r) => r.code === P1)!;
    expect(p1.label).toBe("P1 | BMP, P&C RSPO, HCV");
    expect(p1.cells).toEqual([
      { actual: 2, cumulative: 2 }, // ≤2024: g1 f1, f2
      { actual: 2, cumulative: 4 }, // 2025: g1 f3 (f2 tidak baru) + g2 f1
      { actual: 1, cumulative: 5 }, // 2026: g1 f4; 2027 diabaikan
    ]);
    for (const r of rows) {
      for (let i = 1; i < r.cells.length; i++) {
        expect(r.cells[i].cumulative).toBe(r.cells[i - 1].cumulative + r.cells[i].actual);
      }
    }
    expect(rows.find((r) => r.code === MK)!.cells.map((c) => c.cumulative)).toEqual([0, 0, 1]);
  });

  it("hanya 4 paket laporan (tanpa Lainnya), urutan tetap", () => {
    const { rows } = trainingBenefitPerYear(groups, 2026);
    expect(rows.map((r) => r.code)).toEqual(TRAINING_BENEFIT_PACKAGES);
    expect(rows.map((r) => r.code)).not.toContain("OTHER");
  });

  it("Kumulative tahun berjalan = petani dilatih di matriks cakupan (tanpa filter tahun) — Capaian Paket per Distrik", () => {
    const current = [group("g1", { activities: groups[0].activities.filter((a) => a.date < "2027") }), groups[1]];
    const { rows } = trainingBenefitPerYear(current, 2026);
    const matrix = trainingCoverageMatrix(current, null);
    for (const r of rows) {
      const fromMatrix = matrix.reduce((s, m) => s + (m.byPackage[r.code as TrainingPackageCode] ?? 0), 0);
      expect(r.cells[2].cumulative).toBe(fromMatrix);
    }
  });

  it("baris ≥ 1 pelatihan: paket apa pun (termasuk Lainnya), petani dihitung sekali pada tahun pertamanya; = Pernah Ikut Pelatihan", () => {
    const current = [group("g1", { activities: groups[0].activities.filter((a) => a.date < "2027") }), groups[1]];
    const { any } = trainingBenefitPerYear(current, 2026);
    expect(any.label).toBe("Petani mengikuti ≥ 1 pelatihan");
    // g1: f1,f2 (2023) · f3 (2025) · f4, f5 (2026; f5 hanya Lainnya; f1 MK 2026 bukan baru) · g2: f1 (2025)
    expect(any.cells).toEqual([
      { actual: 2, cumulative: 2 },
      { actual: 2, cumulative: 4 },
      { actual: 2, cumulative: 6 },
    ]);
    const matrix = trainingCoverageMatrix(current, null);
    expect(any.cells[2].cumulative).toBe(matrix.reduce((s, m) => s + m.anyPackage, 0));
  });
});
