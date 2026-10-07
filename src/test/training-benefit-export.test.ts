import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import { buildProgramTargetGrid, programContractRows, type ProgramTargetRecord } from "@/lib/program-target";
import {
  benefitBarsSvg,
  contractGridSvg,
  contractTrajectory,
  trajectoryLayout,
  trajectorySummary,
  xmlEscape,
} from "@/lib/training-benefit-chart";
import { buildTrainingBenefitWorkbook, type BenefitExcelInput } from "@/lib/training-benefit-xlsx";
import type { TrainingBenefitRow, TrainingBenefitYear } from "@/lib/training-dashboard-aggregation";
import type { TrainingGroupEntry, TrainingPackageCode } from "@/types/dashboard";

// Angka fiktif — BUKAN angka kontrak sebenarnya (repo publik).
const years: TrainingBenefitYear[] = [
  { year: 2024, upTo: true },
  { year: 2025, upTo: false },
  { year: 2026, upTo: false },
];
const row = (code: TrainingBenefitRow["code"], label: string, actuals: number[]): TrainingBenefitRow => {
  let cum = 0;
  return { code, label, cells: actuals.map((a) => ({ actual: a, cumulative: (cum += a) })) };
};
const rows = [row("PAKET_1_BMP_PC_RSPO_NKT", "P1 | BMP, P&C RSPO, HCV", [50, 20, 10]), row("PAKET_2_K3", "P2 | HSE", [5, 0, 1])];
const any = row("ANY", "Petani pernah mengikuti pelatihan (minimal 1)", [60, 20, 12]);

const records: ProgramTargetRecord[] = [
  { indicator: "TRAINING_P1_BMP", periodType: "BASELINE", year: 2025, value: 70 },
  { indicator: "TRAINING_P1_BMP", periodType: "ANNUAL", year: 2026, value: 20 },
  { indicator: "TRAINING_P1_BMP", periodType: "ANNUAL", year: 2027, value: 10 },
  { indicator: "TRAINING_ANY", periodType: "BASELINE", year: 2025, value: 80 },
  { indicator: "TRAINING_ANY", periodType: "ANNUAL", year: 2026, value: 10 },
];
const act = (pkg: TrainingPackageCode, date: string, farmers: string[]) => ({
  id: `${pkg}-${date}`, packageCode: pkg, date, hasEvidence: true, hasLocation: true,
  participants: farmers.map((farmerId) => ({ farmerId, gender: "M" as const, preTestScore: null, postTestScore: null })),
});
const groups: TrainingGroupEntry[] = [
  {
    id: "g", name: "g", code: "g", category: "SWADAYA", districtId: "d", districtName: "D", totalFarmers: 10,
    activities: [act("PAKET_1_BMP_PC_RSPO_NKT", "2025-02-01", ["a", "b"]), act("PAKET_1_BMP_PC_RSPO_NKT", "2026-02-01", ["c"])],
  },
];
const grid = buildProgramTargetGrid(records);
const contractRows = programContractRows(grid, groups);

describe("trayektori vs Kontrak", () => {
  const p1 = contractTrajectory(contractRows[0], grid.baselineYear, grid.years, 2026);

  it("kumulatif Start → tahun; realisasi berhenti di tahun berjalan; ringkasan = total kontrak & capaian", () => {
    expect(p1).toEqual([
      { label: "s.d. 2025", target: 70, actual: 2 },
      { label: "2026", target: 90, actual: 3 },
      { label: "2027", target: 100, actual: null },
    ]);
    expect(trajectorySummary(p1)).toEqual({ total: 100, realized: 3, pct: 3 });
  });

  it("label selisih di tahun berjalan, di bawah titik yang lebih rendah", () => {
    const lay = trajectoryLayout(p1, "2026", 100);
    expect(lay.curIdx).toBe(1);
    expect(lay.gapLabel?.text).toBe("tertinggal 87");
    expect(lay.gapLabel?.tone).toBe("behind");
    expect(lay.gapLabel!.y).toBeGreaterThan(Math.max(lay.yTarget[1], lay.yActual[1]!));
    // ±1% dari target = sesuai
    expect(trajectoryLayout([{ label: "2026", target: 1000, actual: 995 }], "2026", 1000).gapLabel?.text).toBe("≈ sesuai target");
  });
});

describe("SVG ekspor", () => {
  it("escape XML — label paket memuat &", () => {
    expect(xmlEscape(`P&C <x> "y"`)).toBe("P&amp;C &lt;x&gt; &quot;y&quot;");
    const { svg } = benefitBarsSvg(years, rows, any, 100);
    expect(svg).toContain("P1 | BMP, P&amp;C RSPO, HCV");
    expect(svg).not.toMatch(/&(?!amp;|lt;|gt;|quot;)/);
    expect(svg).toContain("trek penuh = 100 petani aktif");
  });

  it("grid kontrak: satu kotak per baris, total kontrak + % di kepala", () => {
    const series = contractRows.map((r) => ({ label: r.label, points: contractTrajectory(r, grid.baselineYear, grid.years, 2026), emphasis: r.key === "TRAINING_ANY" }));
    const { svg, width, height } = contractGridSvg(series, 2026);
    expect(svg.match(/<g transform="translate\(\d+\.?\d*,\d+\.?\d*\)">/g)).toHaveLength(6); // 5 grafik + margin
    expect(svg).toContain("dari 100");
    expect(svg).toContain("target belum diisi"); // paket tanpa target
    expect(width).toBeGreaterThan(1000);
    expect(height).toBeGreaterThan(400);
  });
});

describe("Workbook Training Benefit (3 sheet)", () => {
  const base: BenefitExcelInput = {
    years, rows, any, activeFarmers: 100, currentYear: 2026, filterActive: true,
    contract: { baselineYear: grid.baselineYear, years: grid.years, rows: contractRows },
    images: {},
  };
  const roundTrip = async (input: BenefitExcelInput) => {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await buildTrainingBenefitWorkbook(input).xlsx.writeBuffer());
    return wb;
  };

  it("sheet Tabel · Grafis · vs Kontrak, tabel mulai di baris 1", async () => {
    const wb = await roundTrip(base);
    expect(wb.worksheets.map((w) => w.name)).toEqual(["Tabel", "Grafis", "vs Kontrak"]);
    const tabel = wb.getWorksheet("Tabel")!;
    expect(tabel.getRow(1).getCell(1).value).toBe("Package");
    expect(tabel.getRow(3).values).toEqual([undefined, "P1 | BMP, P&C RSPO, HCV", 50, 50, 20, 70, 10, 80]);
  });

  it("Grafis: angka segmen + kumulatif + belum dilatih + petani aktif", async () => {
    const ws = (await roundTrip(base)).getWorksheet("Grafis")!;
    expect(ws.getRow(1).values).toEqual([undefined, "Package", "s.d. 2024", "baru 2025", "baru 2026", "Kumulative 2026", "Belum dilatih", "Petani aktif"]);
    expect(ws.getRow(4).values).toEqual([undefined, "Petani pernah mengikuti pelatihan (minimal 1)", 60, 20, 12, 92, 8, 100]);
  });

  it("vs Kontrak: Start + tahun (target/realisasi/%), tahun mendatang tanpa realisasi, total kontrak; catatan filter", async () => {
    const ws = (await roundTrip(base)).getWorksheet("vs Kontrak")!;
    expect(ws.getRow(1).getCell(2).value).toBe("Start s.d. 2025");
    expect(ws.getRow(1).getCell(11).value).toBe("Total kontrak");
    // P1: Start 70/2, 2026 20/1 (5%), 2027 target 10 belum mulai, total 100 / 3 (3%)
    expect(ws.getRow(3).values).toEqual([undefined, "P1 | BMP, P&C RSPO, HCV", 70, 2, 2 / 70, 20, 1, 0.05, 10, null, null, 100, 3, 0.03].map((v) => (v === null ? undefined : v)));
    const texts = ws.getColumn(1).values.filter((v): v is string => typeof v === "string");
    expect(texts.some((t) => t.startsWith("Filter Distrik/Lembaga aktif"))).toBe(true);
  });

  it("tanpa target → sheet vs Kontrak berisi pesan", async () => {
    const ws = (await roundTrip({ ...base, contract: null })).getWorksheet("vs Kontrak")!;
    expect(String(ws.getRow(1).getCell(1).value)).toMatch(/^Belum ada target kontrak/);
  });

  it("gambar ditempel di bawah tabel", async () => {
    const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const wb = buildTrainingBenefitWorkbook({ ...base, images: { grafis: { base64: png, widthPx: 10, heightPx: 10 }, kontrak: { base64: png, widthPx: 10, heightPx: 10 } } });
    const grafis = wb.getWorksheet("Grafis")!;
    const [img] = grafis.getImages();
    expect(img.range.tl.nativeRow).toBeGreaterThan(4);
    expect(wb.getWorksheet("vs Kontrak")!.getImages()).toHaveLength(1);
  });
});
