import { describe, it, expect } from "vitest";
import {
  buildDashboardData,
  farmerPackageCodes,
  sumKelompokTaniStats,
  ktStatsForYear,
  normalizeSnapshotData,
  scopeSnapshotData,
  toSnapshotData,
  type RawFarmer,
  type RawGroup,
} from "@/lib/dashboard-aggregation";
import type { DashboardSnapshotData, KTDetails } from "@/types/dashboard";

function farmer(
  id: string,
  farmerGroupId: string,
  areas: (number | null)[],
  packages: { code: string; active?: boolean }[],
  gender: "M" | "F" = "M",
  joinedYear: number | null = null,
  subGroups: (string | null)[] = []
): RawFarmer {
  return {
    id,
    farmerGroupId,
    gender,
    joinedYear,
    landParcels: areas.map((area, i) => ({ area, subGroupLv2: subGroups[i] ?? null })),
    trainingParticipants: packages.map((p) => ({
      activity: { isActive: p.active ?? true, package: { code: p.code } },
    })),
  };
}

const groups: RawGroup[] = [
  { id: "g1", name: "KT Alpha", code: "A1", districtId: "d1", districtName: "Distrik 1", locationLat: 1, locationLong: 101 },
  { id: "g2", name: "KT Beta", code: "B1", districtId: "d2", districtName: "Distrik 2", locationLat: null, locationLong: null },
];

describe("dashboard aggregation", () => {
  describe("farmerPackageCodes", () => {
    it("excludes OTHER, inactive activities, and dedupes package codes", () => {
      const f = farmer("f1", "g1", [], [
        { code: "PAKET_1_BMP_PC_RSPO_NKT" },
        { code: "PAKET_1_BMP_PC_RSPO_NKT" }, // duplicate
        { code: "OTHER" }, // excluded
        { code: "PAKET_2_MK", active: false }, // inactive → excluded
      ]);
      const codes = farmerPackageCodes(f);
      expect([...codes].sort()).toEqual(["PAKET_1_BMP_PC_RSPO_NKT"]);
    });
  });

  describe("buildDashboardData", () => {
    it("aggregates totals, per-KT details, and training counts", () => {
      const farmers: RawFarmer[] = [
        farmer("f1", "g1", [1.25, 0.75], [{ code: "PAKET_1_BMP_PC_RSPO_NKT" }, { code: "PAKET_2_MK" }], "M", 2025),
        farmer("f2", "g1", [2.5], [{ code: "PAKET_1_BMP_PC_RSPO_NKT" }, { code: "OTHER" }], "M", 2026),
        farmer("f3", "g2", [], [{ code: "PAKET_2_K3" }], "F", 2025),
      ];

      const { stats, kelompokTaniList } = buildDashboardData(groups, farmers);

      // Global stats
      expect(stats.totalKelompokTani).toBe(2);
      expect(stats.totalPetani).toBe(3);
      expect(stats.totalPetaniLaki).toBe(2);
      expect(stats.totalPetaniPerempuan).toBe(1);
      expect(stats.totalPersilLahan).toBe(3);
      expect(stats.totalLuasLahan).toBe(4.5);
      expect(stats.trainingCounts.PAKET_1_BMP_PC_RSPO_NKT).toBe(2); // f1, f2
      expect(stats.trainingCounts.PAKET_2_MK).toBe(1); // f1
      expect(stats.trainingCounts.PAKET_2_K3).toBe(1); // f3
      expect(stats.trainingCounts.PAKET_3_4_GEDSI_FINANCIAL_LIVELIHOOD_BUSDEV).toBe(0);

      // Per-KT
      const g1 = kelompokTaniList.find((k) => k.id === "g1")!;
      expect(g1.districtId).toBe("d1");
      expect(g1.districtName).toBe("Distrik 1");
      expect(g1.totalFarmers).toBe(2);
      expect(g1.totalFarmersMale).toBe(2);
      expect(g1.totalFarmersFemale).toBe(0);
      expect(g1.totalParcels).toBe(3);
      expect(g1.totalArea).toBe(4.5);
      expect(g1.trainingCoverage.PAKET_1_BMP_PC_RSPO_NKT).toBe(2);
      expect(g1.trainingCoverage.PAKET_2_MK).toBe(1);

      // Per-year breakdown: f1 (2025) + f2 (2026) in g1
      expect(g1.byYear["2025"].totalFarmers).toBe(1);
      expect(g1.byYear["2025"].totalArea).toBe(2);
      expect(g1.byYear["2025"].trainingCoverage.PAKET_2_MK).toBe(1);
      expect(g1.byYear["2026"].totalFarmers).toBe(1);
      expect(g1.byYear["2026"].totalArea).toBe(2.5);

      const g2 = kelompokTaniList.find((k) => k.id === "g2")!;
      expect(g2.totalFarmers).toBe(1);
      expect(g2.totalParcels).toBe(0);
      expect(g2.totalArea).toBe(0);
      expect(g2.locationLat).toBeNull();
      expect(g2.trainingCoverage.PAKET_2_K3).toBe(1);
    });

    it("returns zeros for empty inputs", () => {
      const { stats, kelompokTaniList } = buildDashboardData([], []);
      expect(stats.totalKelompokTani).toBe(0);
      expect(stats.totalPetani).toBe(0);
      expect(stats.totalLuasLahan).toBe(0);
      expect(stats.trainingCounts.PAKET_1_BMP_PC_RSPO_NKT).toBe(0);
      expect(kelompokTaniList).toEqual([]);
    });

    it("handles a KT with no farmers gracefully", () => {
      const { kelompokTaniList } = buildDashboardData(groups, [
        farmer("f1", "g1", [3], [{ code: "PAKET_1_BMP_PC_RSPO_NKT" }]),
      ]);
      const g2 = kelompokTaniList.find((k) => k.id === "g2")!;
      expect(g2.totalFarmers).toBe(0);
      expect(g2.totalParcels).toBe(0);
      expect(g2.trainingCoverage.PAKET_1_BMP_PC_RSPO_NKT).toBe(0);
    });

    it("counts null parcel areas as zero", () => {
      const { stats } = buildDashboardData([groups[0]], [
        farmer("f1", "g1", [null, 1.5], [{ code: "PAKET_1_BMP_PC_RSPO_NKT" }]),
      ]);
      expect(stats.totalPersilLahan).toBe(2);
      expect(stats.totalLuasLahan).toBe(1.5);
    });

    it("Total Kelompok Tani: distinct subGroupLv2 per Lembaga (trim/case, null diabaikan)", () => {
      const { stats, kelompokTaniList } = buildDashboardData(groups, [
        // g1: "KT A" (×2 lahan, beda kapital/spasi → 1) + "KT B" + null → 2 distinct
        farmer("f1", "g1", [1, 1, 1], [], "M", null, ["KT A", "  kt a ", null]),
        farmer("f2", "g1", [1], [], "M", null, ["KT B"]),
        // g2: "KT A" (nama sama dgn g1 tapi Lembaga beda → dihitung terpisah)
        farmer("f3", "g2", [1], [], "F", null, ["KT A"]),
      ]);
      const g1 = kelompokTaniList.find((k) => k.id === "g1")!;
      const g2 = kelompokTaniList.find((k) => k.id === "g2")!;
      expect(g1.kelompokTaniCount).toBe(2); // KT A, KT B
      expect(g2.kelompokTaniCount).toBe(1); // KT A (Lembaga lain)
      expect(stats.totalKelompokTaniLahan).toBe(3); // 2 + 1 (per-Lembaga)
    });

    it("Total Kelompok Tani = 0 bila subGroupLv2 kosong semua", () => {
      const { stats } = buildDashboardData([groups[0]], [
        farmer("f1", "g1", [1, 2], [{ code: "PAKET_1_BMP_PC_RSPO_NKT" }]), // tanpa subGroupLv2
      ]);
      expect(stats.totalKelompokTaniLahan).toBe(0);
    });
  });

  describe("sumKelompokTaniStats & ktStatsForYear", () => {
    const emptyCov = { PAKET_1_BMP_PC_RSPO_NKT: 0, PAKET_2_MK: 0, PAKET_2_K3: 0, PAKET_3_4_GEDSI_FINANCIAL_LIVELIHOOD_BUSDEV: 0 };
    const kts: KTDetails[] = [
      {
        id: "g1", name: "KT Alpha", code: "A1", districtId: "d1", districtName: "Distrik 1", locationLat: 1, locationLong: 101,
        totalFarmers: 2, totalFarmersMale: 1, totalFarmersFemale: 1, totalParcels: 3, totalArea: 4.5,
        trainingCoverage: { PAKET_1_BMP_PC_RSPO_NKT: 2, PAKET_2_MK: 1, PAKET_2_K3: 0, PAKET_3_4_GEDSI_FINANCIAL_LIVELIHOOD_BUSDEV: 0 },
        byYear: {
          "2025": { totalFarmers: 1, totalFarmersMale: 1, totalFarmersFemale: 0, totalParcels: 2, totalArea: 2, trainingCoverage: { ...emptyCov, PAKET_2_MK: 1 } },
        },
      },
      {
        id: "g2", name: "KT Beta", code: "B1", districtId: "d2", districtName: "Distrik 2", locationLat: null, locationLong: null,
        totalFarmers: 1, totalFarmersMale: 0, totalFarmersFemale: 1, totalParcels: 0, totalArea: 0,
        trainingCoverage: { PAKET_1_BMP_PC_RSPO_NKT: 0, PAKET_2_MK: 0, PAKET_2_K3: 1, PAKET_3_4_GEDSI_FINANCIAL_LIVELIHOOD_BUSDEV: 0 },
        byYear: {},
      },
    ];

    it("sums a subset of KT details back into dashboard stats", () => {
      const all = sumKelompokTaniStats(kts);
      expect(all.totalKelompokTani).toBe(2);
      expect(all.totalPetani).toBe(3);
      expect(all.totalPetaniLaki).toBe(1);
      expect(all.totalPetaniPerempuan).toBe(2);
      expect(all.totalPersilLahan).toBe(3);
      expect(all.totalLuasLahan).toBe(4.5);
      expect(all.trainingCounts.PAKET_1_BMP_PC_RSPO_NKT).toBe(2);
      expect(all.trainingCounts.PAKET_2_K3).toBe(1);

      const one = sumKelompokTaniStats([kts[0]]);
      expect(one.totalKelompokTani).toBe(1);
      expect(one.totalPetani).toBe(2);
      expect(one.trainingCounts.PAKET_2_MK).toBe(1);
      expect(one.trainingCounts.PAKET_2_K3).toBe(0);
    });

    it("ktStatsForYear resolves all-years vs a specific year vs a missing year", () => {
      // year null → all-years aggregate unchanged
      expect(ktStatsForYear(kts[0], null).totalFarmers).toBe(2);
      // specific year → uses byYear bucket
      const y2025 = ktStatsForYear(kts[0], 2025);
      expect(y2025.totalFarmers).toBe(1);
      expect(y2025.totalArea).toBe(2);
      expect(y2025.trainingCoverage.PAKET_2_MK).toBe(1);
      // year with no bucket → zeros (but keeps identity fields)
      const y2099 = ktStatsForYear(kts[0], 2099);
      expect(y2099.totalFarmers).toBe(0);
      expect(y2099.name).toBe("KT Alpha");
      expect(y2099.trainingCoverage.PAKET_2_MK).toBe(0);
    });
  });

  describe("snapshot data shape", () => {
    it("toSnapshotData flattens stats to top level with trainingCounts", () => {
      const data = buildDashboardData(groups, [
        farmer("f1", "g1", [2], [{ code: "PAKET_1_BMP_PC_RSPO_NKT" }]),
      ]);
      const flat = toSnapshotData(data);
      expect(flat.trainingCounts).toBeDefined();
      expect(flat.trainingCounts.PAKET_1_BMP_PC_RSPO_NKT).toBe(1);
      expect(flat.kelompokTaniList.length).toBe(2);
    });

    it("normalizeSnapshotData reads both flat and nested stored shapes", () => {
      const flat = normalizeSnapshotData({
        totalKelompokTani: 1, totalPetani: 2, totalPersilLahan: 1, totalLuasLahan: 2,
        trainingCounts: { PAKET_1_BMP_PC_RSPO_NKT: 1, PAKET_2_MK: 0, PAKET_2_K3: 0, PAKET_3_4_GEDSI_FINANCIAL_LIVELIHOOD_BUSDEV: 0 },
        kelompokTaniList: [],
      });
      expect(flat.trainingCounts.PAKET_1_BMP_PC_RSPO_NKT).toBe(1);

      // Older nested shape produced by the initial generateSnapshot bug
      const nested = normalizeSnapshotData({
        stats: {
          totalKelompokTani: 1, totalPetani: 2, totalPersilLahan: 1, totalLuasLahan: 2,
          trainingCounts: { PAKET_1_BMP_PC_RSPO_NKT: 3, PAKET_2_MK: 0, PAKET_2_K3: 0, PAKET_3_4_GEDSI_FINANCIAL_LIVELIHOOD_BUSDEV: 0 },
        },
        kelompokTaniList: [{ id: "g1" }],
      });
      expect(nested.trainingCounts.PAKET_1_BMP_PC_RSPO_NKT).toBe(3);
      expect(nested.totalPetani).toBe(2);
      expect(nested.kelompokTaniList.length).toBe(1);
      // Older snapshots without gender default to 0 instead of undefined
      expect(nested.totalPetaniLaki).toBe(0);
      expect(flat.totalPetaniPerempuan).toBe(0);

      // Garbage falls back to safe zeros
      const empty = normalizeSnapshotData(null);
      expect(empty.trainingCounts.PAKET_2_MK).toBe(0);
      expect(empty.kelompokTaniList).toEqual([]);
    });
  });

  describe("scopeSnapshotData (RBAC read-time scoping)", () => {
    const emptyCov = { PAKET_1_BMP_PC_RSPO_NKT: 0, PAKET_2_MK: 0, PAKET_2_K3: 0, PAKET_3_4_GEDSI_FINANCIAL_LIVELIHOOD_BUSDEV: 0 };
    const kt = (id: string, districtId: string, farmers: number, kelompokTaniCount = 0): KTDetails => ({
      id, name: id, code: null, districtId, districtName: districtId, locationLat: null, locationLong: null,
      kelompokTaniCount,
      totalFarmers: farmers, totalFarmersMale: farmers, totalFarmersFemale: 0, totalParcels: 0, totalArea: 0,
      trainingCoverage: { ...emptyCov }, byYear: {},
    });
    const data: DashboardSnapshotData = {
      totalKelompokTani: 2, totalKelompokTaniLahan: 5, totalPetani: 5, totalPetaniLaki: 5, totalPetaniPerempuan: 0,
      totalPersilLahan: 0, totalLuasLahan: 0, trainingCounts: { ...emptyCov },
      kelompokTaniList: [kt("ktA", "d1", 3, 3), kt("ktB", "d2", 2, 2)],
    };

    it("ALL → unchanged", () => {
      const r = scopeSnapshotData(data, { mode: "ALL" });
      expect(r.totalKelompokTani).toBe(2);
      expect(r.totalPetani).toBe(5);
    });

    it("BY_DISTRICT → only KTs in accessible districts, totals recomputed", () => {
      const r = scopeSnapshotData(data, { mode: "BY_DISTRICT", districtIds: ["d1"] });
      expect(r.kelompokTaniList.map((k) => k.id)).toEqual(["ktA"]);
      expect(r.totalKelompokTani).toBe(1);
      expect(r.totalKelompokTaniLahan).toBe(3); // hanya ktA (3 KT) setelah slice scope
      expect(r.totalPetani).toBe(3);
    });

    it("BY_FARMER_GROUP → only accessible KT ids", () => {
      const r = scopeSnapshotData(data, { mode: "BY_FARMER_GROUP", groupIds: ["ktB"] });
      expect(r.kelompokTaniList.map((k) => k.id)).toEqual(["ktB"]);
      expect(r.totalPetani).toBe(2);
    });
  });
});
