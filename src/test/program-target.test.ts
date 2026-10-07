import { describe, it, expect } from "vitest";
import {
  PROGRAM_TARGET_PACKAGE,
  buildProgramTargetGrid,
  programContractRows,
  programTargetRowTotal,
  programTargetYearTotal,
  type ProgramTargetRecord,
} from "@/lib/program-target";
import { programTargetSaveSchema } from "@/validations/program-target.schema";
import type { TrainingGroupEntry, TrainingPackageCode } from "@/types/dashboard";

// Struktur kontrak owner (#403) — angka fiktif, BUKAN angka kontrak sebenarnya (repo publik).
const records: ProgramTargetRecord[] = [
  { indicator: "TRAINING_BMP_GROUP_MANAGEMENT", periodType: "BASELINE", year: 2025, value: 100 },
  { indicator: "TRAINING_BMP_GROUP_MANAGEMENT", periodType: "ANNUAL", year: 2026, value: 20 },
  { indicator: "TRAINING_BMP_GROUP_MANAGEMENT", periodType: "ANNUAL", year: 2027, value: 20 },
  { indicator: "TRAINING_GEDSI_LIVELIHOOD", periodType: "BASELINE", year: 2025, value: 50 },
  { indicator: "TRAINING_GEDSI_LIVELIHOOD", periodType: "ANNUAL", year: 2026, value: 40 },
];

const act = (pkg: TrainingPackageCode, date: string, farmers: string[]) => ({
  id: `${pkg}-${date}`, packageCode: pkg, date, hasEvidence: true, hasLocation: true,
  participants: farmers.map((farmerId) => ({ farmerId, gender: "M" as const, preTestScore: null, postTestScore: null })),
});
const group = (id: string, activities: ReturnType<typeof act>[]): TrainingGroupEntry => ({
  id, name: id, code: id, category: "SWADAYA", districtId: "d", districtName: "D", totalFarmers: 10, activities,
});

describe("grid Target Program (#403)", () => {
  it("baseline + tahun target; total baris = baseline + Σ tahunan; total tahun = jumlah kedua baris", () => {
    const g = buildProgramTargetGrid(records);
    expect(g.baselineYear).toBe(2025);
    expect(g.years).toEqual([2026, 2027]);
    expect(programTargetRowTotal(g, "TRAINING_BMP_GROUP_MANAGEMENT")).toBe(140);
    expect(programTargetRowTotal(g, "TRAINING_GEDSI_LIVELIHOOD")).toBe(90);
    expect(programTargetYearTotal(g, 2026)).toBe(60);
    expect(programTargetYearTotal(g, 2027)).toBe(20);
  });

  it("pemetaan kontrak → paket (keputusan owner)", () => {
    expect(PROGRAM_TARGET_PACKAGE).toEqual({
      TRAINING_BMP_GROUP_MANAGEMENT: "PAKET_1_BMP_PC_RSPO_NKT",
      TRAINING_GEDSI_LIVELIHOOD: "PAKET_3_4_GEDSI_FINANCIAL_LIVELIHOOD_BUSDEV",
    });
  });
});

describe("vs Kontrak — target vs realisasi penerima manfaat baru", () => {
  const groups = [
    group("g1", [
      act("PAKET_1_BMP_PC_RSPO_NKT", "2024-03-01", ["a", "b"]),
      act("PAKET_1_BMP_PC_RSPO_NKT", "2026-03-01", ["b", "c", "d"]), // b bukan baru
      act("PAKET_3_4_GEDSI_FINANCIAL_LIVELIHOOD_BUSDEV", "2026-05-01", ["a"]),
      act("PAKET_2_MK", "2026-01-01", ["z"]), // paket lain tak dihitung
    ]),
  ];
  const rows = programContractRows(buildProgramTargetGrid(records), groups);

  it("Start = kumulatif s.d. baseline; tahun = penerima baru; % = realisasi/target", () => {
    const [p1, p34, total] = rows;
    expect(p1.start).toEqual({ target: 100, actual: 2, pct: 2 });
    expect(p1.years).toEqual([
      { target: 20, actual: 2, pct: 10 },
      { target: 20, actual: 0, pct: 0 },
    ]);
    expect(p34.start).toEqual({ target: 50, actual: 0, pct: 0 });
    expect(p34.years[0]).toEqual({ target: 40, actual: 1, pct: 2.5 });
    expect(p34.years[1]).toEqual({ target: null, actual: 0, pct: null }); // tahun tanpa target baris itu
    expect(total.key).toBe("TOTAL");
    expect(total.start).toBeNull();
    expect(total.years).toEqual([
      { target: 60, actual: 3, pct: 5 },
      { target: 20, actual: 0, pct: 0 },
    ]);
  });
});

describe("programTargetSaveSchema", () => {
  const cell = (o: Record<string, unknown>) => ({ indicator: "TRAINING_GEDSI_LIVELIHOOD", periodType: "ANNUAL", year: 2026, value: 1, ...o });
  it("tahun Start harus sama untuk semua baris; sel ganda ditolak; nilai negatif ditolak", () => {
    expect(programTargetSaveSchema.safeParse([cell({ periodType: "BASELINE", year: 2025 }), cell({ indicator: "TRAINING_BMP_GROUP_MANAGEMENT", periodType: "BASELINE", year: 2024 })]).success).toBe(false);
    expect(programTargetSaveSchema.safeParse([cell({}), cell({})]).success).toBe(false);
    expect(programTargetSaveSchema.safeParse([cell({ value: -1 })]).success).toBe(false);
    expect(programTargetSaveSchema.safeParse([cell({ value: null }), cell({ year: 2027 })]).success).toBe(true);
    expect(programTargetSaveSchema.safeParse([cell({ indicator: "X" })]).success).toBe(false);
  });
});
