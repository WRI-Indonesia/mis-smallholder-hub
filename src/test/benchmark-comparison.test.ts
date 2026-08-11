import { describe, expect, it } from "vitest";
import {
  aggregateMisMetrics,
  buildComparisonView,
  type ComparisonBenchmarkInput,
  type ComparisonGroupInput,
  type MisAggregationInput,
} from "@/lib/benchmark-comparison";
import type { BenchmarkReferenceValues } from "@/types/benchmark-comparison";

const G1 = "group-1";
const G2 = "group-2";

function baseInput(overrides: Partial<MisAggregationInput> = {}): MisAggregationInput {
  return {
    groupIds: [G1, G2],
    farmers: [],
    parcels: [],
    trainingParticipations: [],
    productionFarmerIds: [],
    ...overrides,
  };
}

function group(overrides: Partial<ComparisonGroupInput> = {}): ComparisonGroupInput {
  return {
    id: G1,
    code: "ISH-1401-01",
    abrv: "APSS",
    name: "APSS - Sei Galuh",
    district: { id: "d-kampar", name: "Kampar" },
    ...overrides,
  };
}

function reference(overrides: Partial<BenchmarkReferenceValues> = {}): BenchmarkReferenceValues {
  return {
    farmerCount: null,
    parcelCount: null,
    areaHa: null,
    trainingP1: null,
    trainingP2Mk: null,
    trainingP2K3: null,
    trainingP34: null,
    productionFarmerCount: null,
    ...overrides,
  };
}

function benchmark(
  farmerGroupId: string,
  overrides: Partial<BenchmarkReferenceValues> = {},
  notes: string | null = null
): ComparisonBenchmarkInput {
  return { farmerGroupId, notes, ...reference(overrides) };
}

describe("aggregateMisMetrics", () => {
  it("menghitung petani, persil, dan luas per lembaga (luas dibulatkan 2 digit)", () => {
    const result = aggregateMisMetrics(
      baseInput({
        farmers: [
          { id: "f1", farmerGroupId: G1 },
          { id: "f2", farmerGroupId: G1 },
          { id: "f3", farmerGroupId: G2 },
        ],
        parcels: [
          { farmerId: "f1", area: 1.005 },
          { farmerId: "f1", area: 2.001 },
          { farmerId: "f3", area: null },
        ],
      })
    );

    expect(result.get(G1)).toMatchObject({ farmerCount: 2, parcelCount: 2, areaHa: 3.01 });
    expect(result.get(G2)).toMatchObject({ farmerCount: 1, parcelCount: 1, areaHa: 0 });
  });

  it("training: distinct petani per paket, partisipasi lintas lembaga tidak dihitung", () => {
    const result = aggregateMisMetrics(
      baseInput({
        farmers: [
          { id: "f1", farmerGroupId: G1 },
          { id: "f2", farmerGroupId: G1 },
        ],
        trainingParticipations: [
          // f1 ikut Paket 1 dua kali → dihitung 1
          { farmerId: "f1", activityFarmerGroupId: G1, packageCode: "PAKET_1_BMP_PC_RSPO_NKT" },
          { farmerId: "f1", activityFarmerGroupId: G1, packageCode: "PAKET_1_BMP_PC_RSPO_NKT" },
          // kegiatan milik lembaga lain → tidak dihitung (konvensi dashboard)
          { farmerId: "f2", activityFarmerGroupId: G2, packageCode: "PAKET_1_BMP_PC_RSPO_NKT" },
          // paket OTHER → tidak dihitung
          { farmerId: "f2", activityFarmerGroupId: G1, packageCode: "OTHER" },
          { farmerId: "f2", activityFarmerGroupId: G1, packageCode: "PAKET_2_MK" },
        ],
      })
    );

    expect(result.get(G1)).toMatchObject({ trainingP1: 1, trainingP2Mk: 1, trainingP2K3: 0 });
    expect(result.get(G2)).toMatchObject({ trainingP1: 0 });
  });

  it("produksi: distinct petani, petani di luar daftar aktif diabaikan", () => {
    const result = aggregateMisMetrics(
      baseInput({
        farmers: [{ id: "f1", farmerGroupId: G1 }],
        productionFarmerIds: ["f1", "f1", "f-nonaktif"],
      })
    );

    expect(result.get(G1)?.productionFarmerCount).toBe(1);
  });
});

describe("buildComparisonView", () => {
  it("selisih = acuan − MIS; metrik tanpa acuan → diff null; ringkasan hanya yang ≠ 0", () => {
    const mis = aggregateMisMetrics(
      baseInput({
        groupIds: [G1],
        farmers: [
          { id: "f1", farmerGroupId: G1 },
          { id: "f2", farmerGroupId: G1 },
        ],
        parcels: [{ farmerId: "f1", area: 10 }],
      })
    );

    const view = buildComparisonView(
      [group()],
      mis,
      [benchmark(G1, { farmerCount: 5, parcelCount: 1, areaHa: 10.002 }, "catatan uji")]
    );

    const row = view.sections[0].rows[0];
    expect(row.diff.farmerCount).toBe(3); // 5 − 2
    expect(row.diff.parcelCount).toBe(0);
    expect(row.diff.areaHa).toBe(0); // dalam toleransi pembulatan
    expect(row.diff.trainingP1).toBeNull(); // acuan belum diisi
    expect(row.diffSummary).toEqual(["Petani (3)"]);
    expect(row.notes).toBe("catatan uji");
    expect(view.groupsWithDiff).toBe(1);
  });

  it("lembaga tanpa baris acuan: reference null, semua diff null, tidak dihitung selisih", () => {
    const view = buildComparisonView([group()], new Map(), []);

    const row = view.sections[0].rows[0];
    expect(row.reference).toBeNull();
    expect(row.diff.farmerCount).toBeNull();
    expect(row.diffSummary).toEqual([]);
    expect(view.groupsWithDiff).toBe(0);
    expect(view.totalGroups).toBe(1);
  });

  it("seksi per distrik terurut, baris terurut code, total acuan hanya menjumlah yang terisi", () => {
    const kampar1 = group();
    const kampar2 = group({ id: G2, code: "ISH-1401-02", name: "KUD Karya Sembada" });
    const siak = group({
      id: "group-3",
      code: "ISH-1408-01",
      name: "KPM Karya Maju",
      district: { id: "d-siak", name: "Siak" },
    });

    const mis = aggregateMisMetrics(
      baseInput({
        groupIds: [G1, G2, "group-3"],
        farmers: [
          { id: "f1", farmerGroupId: G1 },
          { id: "f2", farmerGroupId: G2 },
          { id: "f3", farmerGroupId: "group-3" },
        ],
      })
    );

    const view = buildComparisonView(
      [siak, kampar2, kampar1],
      mis,
      [benchmark(G1, { farmerCount: 3 })] // hanya G1 punya acuan
    );

    expect(view.sections.map((s) => s.districtName)).toEqual(["Kampar", "Siak"]);
    expect(view.sections[0].rows.map((r) => r.code)).toEqual(["ISH-1401-01", "ISH-1401-02"]);
    // total acuan Kampar = 3 (G2 tanpa acuan tidak menyumbang), total MIS = 2 petani
    expect(view.sections[0].totals.reference.farmerCount).toBe(3);
    expect(view.sections[0].totals.mis.farmerCount).toBe(2);
  });
});
