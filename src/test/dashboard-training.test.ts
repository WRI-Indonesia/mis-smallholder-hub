import { describe, it, expect } from "vitest";
import {
  TRAINING_COVERAGE_TARGET,
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
    expect(mk.gain).toBe(0);
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

/**
 * Scope data-access diterapkan di server (`getTrainingDashboardView` memakai
 * `farmerGroupAccessFilter`), bukan di lib agregasi. Server action tidak diimpor
 * di vitest karena menarik rantai next-auth yang tidak resolve — jadi mengikuti
 * gaya `rbac-server-guards.test.ts`: logika filter di-mirror lalu diverifikasi.
 */
describe("RBAC scope — where fragment payload Dashboard Pelatihan", () => {
  type AccessContext =
    | { mode: "ALL" }
    | { mode: "BY_FARMER_GROUP"; ids: string[] }
    | { mode: "BY_DISTRICT"; ids: string[] };

  // Mirror dari access-context.ts `farmerGroupAccessFilter`.
  const farmerGroupAccessFilter = (access: AccessContext) =>
    access.mode === "BY_FARMER_GROUP"
      ? { id: { in: access.ids } }
      : access.mode === "BY_DISTRICT"
        ? { districtId: { in: access.ids } }
        : {};

  // Mirror dari `where` pada query FarmerGroup di dashboard-training.ts.
  const whereFor = (access: AccessContext) => ({
    isActive: true,
    ...farmerGroupAccessFilter(access),
  });

  it("SUPERADMIN / tanpa assignment → seluruh Lembaga aktif", () => {
    expect(whereFor({ mode: "ALL" })).toEqual({ isActive: true });
  });

  it("BY_DISTRICT → dibatasi ke districtId yang di-assign", () => {
    expect(whereFor({ mode: "BY_DISTRICT", ids: ["d1"] })).toEqual({
      isActive: true,
      districtId: { in: ["d1"] },
    });
  });

  it("BY_FARMER_GROUP → dibatasi ke id Lembaga yang di-assign", () => {
    expect(whereFor({ mode: "BY_FARMER_GROUP", ids: ["g1"] })).toEqual({
      isActive: true,
      id: { in: ["g1"] },
    });
  });

  it("scope selalu menyertakan isActive — record nonaktif tidak pernah masuk payload", () => {
    // Dashboard/report memfilter isActive untuk SEMUA role, termasuk SUPERADMIN
    // (pengecualian nonaktif hanya berlaku di list master data).
    const cases: AccessContext[] = [
      { mode: "ALL" },
      { mode: "BY_DISTRICT", ids: ["d1"] },
      { mode: "BY_FARMER_GROUP", ids: ["g1"] },
    ];
    for (const access of cases) {
      expect(whereFor(access).isActive).toBe(true);
    }
  });

  it("tidak menimpa key `id` — scope BY_FARMER_GROUP tetap utuh", () => {
    // Pitfall key-collision (code-standards.md): filter mengembalikan `{ id: { in } }`,
    // jadi query ini tidak boleh punya literal `id` yang menimpanya.
    const where = whereFor({ mode: "BY_FARMER_GROUP", ids: ["g1", "g2"] });
    expect(where).toHaveProperty("id.in", ["g1", "g2"]);
  });
});

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
