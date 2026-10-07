import { describe, it, expect } from "vitest";
import {
  PROGRAM_TARGET_LABELS,
  PROGRAM_TARGET_PACKAGE,
  buildProgramTargetGrid,
  programContractRows,
  programTargetRowTotal,
  type ProgramTargetRecord,
} from "@/lib/program-target";
import { programTargetSaveSchema } from "@/validations/program-target.schema";
import { TRAINING_BENEFIT_ANY_LABEL, TRAINING_BENEFIT_LABELS } from "@/lib/training-dashboard-aggregation";
import type { TrainingGroupEntry, TrainingPackageCode } from "@/types/dashboard";

// Struktur kontrak owner (#403) — angka fiktif, BUKAN angka kontrak sebenarnya (repo publik).
const records: ProgramTargetRecord[] = [
  { indicator: "TRAINING_P1_BMP", periodType: "BASELINE", year: 2025, value: 100 },
  { indicator: "TRAINING_P1_BMP", periodType: "ANNUAL", year: 2026, value: 20 },
  { indicator: "TRAINING_P1_BMP", periodType: "ANNUAL", year: 2027, value: 20 },
  { indicator: "TRAINING_P3_GEDSI_LIVELIHOOD", periodType: "BASELINE", year: 2025, value: 50 },
  { indicator: "TRAINING_P3_GEDSI_LIVELIHOOD", periodType: "ANNUAL", year: 2026, value: 40 },
  { indicator: "TRAINING_ANY", periodType: "BASELINE", year: 2025, value: 120 },
  { indicator: "TRAINING_ANY", periodType: "ANNUAL", year: 2026, value: 30 },
];

const act = (pkg: TrainingPackageCode, date: string, farmers: string[]) => ({
  id: `${pkg}-${date}`, packageCode: pkg, date, hasEvidence: true, hasLocation: true,
  participants: farmers.map((farmerId) => ({ farmerId, gender: "M" as const, preTestScore: null, postTestScore: null })),
});
const group = (id: string, activities: ReturnType<typeof act>[]): TrainingGroupEntry => ({
  id, name: id, code: id, category: "SWADAYA", districtId: "d", districtName: "D", totalFarmers: 10, activities,
});

describe("grid Target Program (#403)", () => {
  it("baseline + tahun target; total baris = baseline + Σ tahunan", () => {
    const g = buildProgramTargetGrid(records);
    expect(g.baselineYear).toBe(2025);
    expect(g.years).toEqual([2026, 2027]);
    expect(programTargetRowTotal(g, "TRAINING_P1_BMP")).toBe(140);
    expect(programTargetRowTotal(g, "TRAINING_P3_GEDSI_LIVELIHOOD")).toBe(90);
    expect(programTargetRowTotal(g, "TRAINING_P2_HSE")).toBe(0);
  });

  it("target per paket = baris kartu Training Benefit per year (keputusan owner)", () => {
    expect(PROGRAM_TARGET_PACKAGE).toEqual({
      TRAINING_P1_BMP: "PAKET_1_BMP_PC_RSPO_NKT",
      TRAINING_P2_GROUP_DYNAMIC: "PAKET_2_MK",
      TRAINING_P2_HSE: "PAKET_2_K3",
      TRAINING_P3_GEDSI_LIVELIHOOD: "PAKET_3_4_GEDSI_FINANCIAL_LIVELIHOOD_BUSDEV",
      TRAINING_ANY: "ANY",
    });
    expect(PROGRAM_TARGET_LABELS.TRAINING_P2_HSE).toBe(TRAINING_BENEFIT_LABELS.PAKET_2_K3);
    expect(PROGRAM_TARGET_LABELS.TRAINING_ANY).toBe(TRAINING_BENEFIT_ANY_LABEL);
  });
});

describe("vs Kontrak — target vs realisasi penerima manfaat baru", () => {
  const groups = [
    group("g1", [
      act("PAKET_1_BMP_PC_RSPO_NKT", "2024-03-01", ["a", "b"]),
      act("PAKET_1_BMP_PC_RSPO_NKT", "2026-03-01", ["b", "c", "d"]), // b bukan baru
      act("PAKET_3_4_GEDSI_FINANCIAL_LIVELIHOOD_BUSDEV", "2026-05-01", ["a"]),
      act("PAKET_2_MK", "2026-01-01", ["z"]), // baris MK; di baris ANY: z baru 2026
      act("OTHER", "2023-06-01", ["y"]), // Lainnya: hanya baris ANY (s.d. baseline)
    ]),
  ];
  const rows = programContractRows(buildProgramTargetGrid(records), groups);

  it("Start = kumulatif s.d. baseline; tahun = penerima baru; % = realisasi/target", () => {
    expect(rows.map((r) => r.key)).toEqual(["TRAINING_P1_BMP", "TRAINING_P2_GROUP_DYNAMIC", "TRAINING_P2_HSE", "TRAINING_P3_GEDSI_LIVELIHOOD", "TRAINING_ANY"]);
    const [p1, mk, hse, p34] = rows;
    expect(p1.start).toEqual({ target: 100, actual: 2, pct: 2 });
    expect(p1.years).toEqual([
      { target: 20, actual: 2, pct: 10 },
      { target: 20, actual: 0, pct: 0 },
    ]);
    expect(p34.start).toEqual({ target: 50, actual: 0, pct: 0 });
    expect(p34.years[0]).toEqual({ target: 40, actual: 1, pct: 2.5 });
    expect(p34.years[1]).toEqual({ target: null, actual: 0, pct: null }); // tahun tanpa target baris itu
    // Paket tanpa target tetap tampil (target null), realisasinya tetap dihitung.
    expect(mk.start).toEqual({ target: null, actual: 0, pct: null });
    expect(mk.years[0]).toEqual({ target: null, actual: 1, pct: null });
    expect(hse.years.every((c) => c.actual === 0)).toBe(true);
  });

  it("baris pernah ikut = tahun pertama pelatihan APA PUN (termasuk Lainnya), petani dihitung sekali — bukan jumlah paket", () => {
    const any = rows[4];
    // s.d. 2025: a, b (2024) + y (OTHER 2023) = 3; 2026 baru: c, d, z (a & b sudah) = 3.
    expect(any.start).toEqual({ target: 120, actual: 3, pct: 2.5 });
    expect(any.years[0]).toEqual({ target: 30, actual: 3, pct: 10 });
  });
});

describe("programTargetSaveSchema", () => {
  const cell = (o: Record<string, unknown>) => ({ indicator: "TRAINING_P3_GEDSI_LIVELIHOOD", periodType: "ANNUAL", year: 2026, value: 1, ...o });
  it("tahun Start harus sama untuk semua baris; sel ganda ditolak; nilai negatif ditolak", () => {
    expect(programTargetSaveSchema.safeParse([cell({ periodType: "BASELINE", year: 2025 }), cell({ indicator: "TRAINING_P1_BMP", periodType: "BASELINE", year: 2024 })]).success).toBe(false);
    expect(programTargetSaveSchema.safeParse([cell({}), cell({})]).success).toBe(false);
    expect(programTargetSaveSchema.safeParse([cell({ value: -1 })]).success).toBe(false);
    expect(programTargetSaveSchema.safeParse([cell({ value: null }), cell({ year: 2027 })]).success).toBe(true);
    expect(programTargetSaveSchema.safeParse([cell({ indicator: "X" })]).success).toBe(false);
    expect(programTargetSaveSchema.safeParse([cell({ indicator: "TRAINING_BMP_GROUP_MANAGEMENT" })]).success).toBe(false); // indikator lama
    expect(programTargetSaveSchema.safeParse([cell({ indicator: "TRAINING_ANY" })]).success).toBe(true);
  });
});
