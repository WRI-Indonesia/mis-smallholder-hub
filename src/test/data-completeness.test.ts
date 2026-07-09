import { describe, it, expect } from "vitest";
import {
  computeCompleteness,
  computePetaniDomain,
  computeLahanDomain,
  computePelatihanDomain,
  computeProduksiDomain,
  computeProfileChecks,
  NIK_REGEX,
} from "@/lib/data-completeness";
import type { CompletenessFarmerInput, CompletenessGroupInput } from "@/types/data-completeness";

function farmer(overrides: Partial<CompletenessFarmerInput> = {}): CompletenessFarmerInput {
  return {
    id: "db-1",
    farmerId: "F-001",
    name: "Petani A",
    nik: "1234567890123456",
    address: "Jl. Mawar",
    birthDate: new Date("1990-01-01"),
    joinedYear: 2020,
    landParcels: [],
    trainingParticipants: [],
    productionRecords: [],
    ...overrides,
  };
}

const validParcel = {
  parcelId: "P-1",
  geometry: { type: "Polygon" },
  area: 1.5,
  plantingYear: 2018,
  cropType: "Palm Oil",
  landStatus: "Owned",
};

function group(overrides: Partial<CompletenessGroupInput> = {}): CompletenessGroupInput {
  return {
    id: "kt-1",
    name: "KT Sukamaju",
    code: "KT001",
    abrv: "SKM",
    joinYear: 2015,
    locationLat: 1.23,
    locationLong: 103.4,
    district: { id: "d-1", name: "Distrik A" },
    activities: [{ id: "act-1" }],
    farmers: [],
    ...overrides,
  };
}

describe("NIK_REGEX", () => {
  it("accepts exactly 16 digits", () => {
    expect(NIK_REGEX.test("1234567890123456")).toBe(true);
  });
  it("rejects non-16-digit / non-numeric", () => {
    expect(NIK_REGEX.test("123")).toBe(false);
    expect(NIK_REGEX.test("12345678901234567")).toBe(false);
    expect(NIK_REGEX.test("12345678901234ab")).toBe(false);
  });
});

describe("computeProfileChecks", () => {
  it("marks all complete for a fully filled group", () => {
    const checks = computeProfileChecks(group());
    expect(checks.every((c) => c.complete)).toBe(true);
  });
  it("flags missing coordinates and code", () => {
    const checks = computeProfileChecks(group({ code: null, locationLat: null }));
    expect(checks.find((c) => c.key === "code")!.complete).toBe(false);
    expect(checks.find((c) => c.key === "coordinates")!.complete).toBe(false);
  });
});

describe("computePetaniDomain", () => {
  it("flags missing NIK", () => {
    const d = computePetaniDomain([farmer({ nik: null })]);
    expect(d.anomalies.find((a) => a.key === "no-nik")!.count).toBe(1);
  });
  it("flags invalid NIK", () => {
    const d = computePetaniDomain([farmer({ nik: "123" })]);
    expect(d.anomalies.find((a) => a.key === "invalid-nik")!.count).toBe(1);
  });
  it("flags duplicate NIK within the group", () => {
    const d = computePetaniDomain([
      farmer({ id: "a", farmerId: "F-001", nik: "1111111111111111" }),
      farmer({ id: "b", farmerId: "F-002", nik: "1111111111111111" }),
    ]);
    expect(d.anomalies.find((a) => a.key === "dup-nik")!.count).toBe(2);
  });
  it("flags duplicate farmerId within the group", () => {
    const d = computePetaniDomain([
      farmer({ id: "a", farmerId: "F-DUP", nik: "1111111111111111" }),
      farmer({ id: "b", farmerId: "F-DUP", nik: "2222222222222222" }),
    ]);
    expect(d.anomalies.find((a) => a.key === "dup-farmer-id")!.count).toBe(2);
  });
  it("flags missing address / birthDate / joinedYear", () => {
    const d = computePetaniDomain([farmer({ address: null, birthDate: null, joinedYear: null })]);
    expect(d.anomalies.find((a) => a.key === "no-address")!.count).toBe(1);
    expect(d.anomalies.find((a) => a.key === "no-birth-date")!.count).toBe(1);
    expect(d.anomalies.find((a) => a.key === "no-joined-year")!.count).toBe(1);
  });
  it("scores 100 when all farmers are complete", () => {
    const d = computePetaniDomain([farmer(), farmer({ id: "db-2", farmerId: "F-002", nik: "2222222222222222" })]);
    expect(d.score).toBe(100);
    expect(d.anomalies).toHaveLength(0);
  });
  it("counts a multi-anomaly farmer once in completeness", () => {
    const d = computePetaniDomain([farmer({ nik: null, address: null })]);
    // one farmer, multiple anomalies → 0% complete
    expect(d.score).toBe(0);
    expect(d.cards.find((c) => c.label === "Petani dengan Anomali")!.value).toBe(1);
  });
});

describe("computeLahanDomain", () => {
  it("flags farmers with zero active parcels", () => {
    const d = computeLahanDomain([farmer({ landParcels: [] })]);
    expect(d.anomalies.find((a) => a.key === "petani-tanpa-lahan")!.count).toBe(1);
  });
  it("flags parcel-level missing fields", () => {
    const d = computeLahanDomain([
      farmer({ landParcels: [{ ...validParcel, geometry: null, area: 0, plantingYear: null, cropType: null, landStatus: null }] }),
    ]);
    expect(d.anomalies.find((a) => a.key === "persil-tanpa-geometry")!.count).toBe(1);
    expect(d.anomalies.find((a) => a.key === "persil-tanpa-luas")!.count).toBe(1);
    expect(d.anomalies.find((a) => a.key === "persil-tanpa-tahun-tanam")!.count).toBe(1);
    expect(d.anomalies.find((a) => a.key === "persil-tanpa-jenis-tanaman")!.count).toBe(1);
    expect(d.score).toBe(0);
  });
  it("scores 100 for a fully valid parcel", () => {
    const d = computeLahanDomain([farmer({ landParcels: [validParcel] })]);
    expect(d.score).toBe(100);
  });
});

describe("computePelatihanDomain", () => {
  it("flags farmers who never participated", () => {
    const d = computePelatihanDomain([farmer({ trainingParticipants: [] })], 1);
    expect(d.anomalies.find((a) => a.key === "petani-belum-pelatihan")!.count).toBe(1);
    expect(d.score).toBe(0);
  });
  it("flags participants missing pre/post test scores", () => {
    const d = computePelatihanDomain(
      [farmer({ trainingParticipants: [{ id: "tp-1", preTestScore: null, postTestScore: null }] })],
      1
    );
    expect(d.anomalies.find((a) => a.key === "peserta-tanpa-pretest")!.count).toBe(1);
    expect(d.anomalies.find((a) => a.key === "peserta-tanpa-posttest")!.count).toBe(1);
    expect(d.score).toBe(100); // participated → covered
  });
  it("flags a group with no training activity", () => {
    const d = computePelatihanDomain([farmer({ trainingParticipants: [{ id: "tp-1", preTestScore: 80, postTestScore: 90 }] })], 0);
    expect(d.anomalies.find((a) => a.key === "kt-tanpa-aktivitas")!.count).toBe(1);
  });
});

describe("computeProduksiDomain", () => {
  it("flags farmers without any production record", () => {
    const d = computeProduksiDomain([farmer({ productionRecords: [] })]);
    expect(d.anomalies.find((a) => a.key === "petani-tanpa-produksi")!.count).toBe(1);
  });
  it("flags farmers with land but no production (strong anomaly)", () => {
    const d = computeProduksiDomain([farmer({ landParcels: [validParcel], productionRecords: [] })]);
    expect(d.anomalies.find((a) => a.key === "berlahan-tanpa-produksi")!.count).toBe(1);
  });
  it("flags production records without a linked parcel", () => {
    const d = computeProduksiDomain([farmer({ productionRecords: [{ id: "pr-1", parcelId: null }] })]);
    expect(d.anomalies.find((a) => a.key === "produksi-tanpa-persil")!.count).toBe(1);
  });
});

describe("computeCompleteness (orchestrator)", () => {
  it("returns a perfect clean result for fully complete data", () => {
    const clean = farmer({
      landParcels: [validParcel],
      trainingParticipants: [{ id: "tp-1", preTestScore: 80, postTestScore: 90 }],
      productionRecords: [{ id: "pr-1", parcelId: "P-1" }],
    });
    const result = computeCompleteness(group({ farmers: [clean] }));
    expect(result.healthScore).toBe(100);
    expect(result.totalAnomalies).toBe(0);
    expect(result.domains.every((d) => d.score === 100)).toBe(true);
  });

  it("aggregates total anomalies across domains and profile", () => {
    const bad = farmer({
      nik: null,
      landParcels: [],
      trainingParticipants: [],
      productionRecords: [],
    });
    const result = computeCompleteness(group({ code: null, farmers: [bad], activities: [] }));
    expect(result.totalAnomalies).toBeGreaterThan(0);
    expect(result.healthScore).toBeLessThan(100);
    // profile failed check (code) counted
    expect(result.profileChecks.find((c) => c.key === "code")!.complete).toBe(false);
  });

  it("handles an empty group (no farmers) without dividing by zero", () => {
    const result = computeCompleteness(group({ farmers: [] }));
    expect(result.totalFarmers).toBe(0);
    expect(Number.isNaN(result.healthScore)).toBe(false);
    expect(result.domains.find((d) => d.domain === "petani")!.score).toBe(0);
  });
});
