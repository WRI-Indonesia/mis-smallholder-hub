import { describe, it, expect } from "vitest";
import {
  BMP_AGE_EXCEL_COLUMNS,
  buildBmpAgeExcelMatrix,
  buildBmpAgeProductivityWorkbook,
} from "@/lib/bmp-age-productivity-xlsx";
import {
  bmpAgeSeries,
  buildBmpSnapshotData,
  sumBmpGroups,
  type BmpRawProduction,
} from "@/lib/bmp-dashboard-aggregation";

// Kampar: Alpha (Swadaya, lahan 2 ha umur 9 pada 2024) + Beta (Ex-Plasma, 1 ha umur 2);
// Siak: Gamma (Swadaya, 4 ha tanpa tahun tanam, hanya Jan–Jun 2025 → disetahunkan ×2).
const monthly = (farmerId: string, parcelId: string, year: number, months: number, kg: number): BmpRawProduction[] =>
  Array.from({ length: months }, (_, i) => ({ farmerId, parcelId, period: `${year}-${String(i + 1).padStart(2, "0")}`, kg }));

const snapshot = buildBmpSnapshotData(
  [
    { id: "g1", name: "Alpha", code: null, category: "SWADAYA", districtId: "d1", districtName: "Kampar" },
    { id: "g2", name: "Beta", code: null, category: "EX_PLASMA", districtId: "d1", districtName: "Kampar" },
    { id: "g3", name: "Gamma", code: null, category: "SWADAYA", districtId: "d2", districtName: "Siak" },
  ],
  [
    { id: "f1", farmerGroupId: "g1" },
    { id: "f2", farmerGroupId: "g2" },
    { id: "f3", farmerGroupId: "g3" },
  ],
  [
    { id: "p1", farmerId: "f1", area: 2, plantingYear: 2015 },
    { id: "p2", farmerId: "f2", area: 1, plantingYear: 2022 },
    { id: "p3", farmerId: "f3", area: 4, plantingYear: null },
  ],
  [
    ...monthly("f1", "p1", 2024, 12, 1000), // 12 t / 2 ha = 6
    ...monthly("f2", "p2", 2024, 12, 250), // 3 t / 1 ha = 3
    ...monthly("f3", "p3", 2025, 6, 2000), // 12 t × 12/6 / 4 ha = 6
  ]
).groups;

const matrix = buildBmpAgeExcelMatrix(snapshot);
const rowOf = (farmerGroup: string, district = "") =>
  matrix.rows.find((r) => r.farmerGroup === farmerGroup && (!district || r.district === district))!;

describe("buildBmpAgeExcelMatrix (#426)", () => {
  it("periode = Rataan lalu tiap tahun naik; baris Lembaga urut Distrik → nama, lalu subtotal & Total", () => {
    expect(matrix.periods).toEqual(["average", 2024, 2025]);
    expect(matrix.rows.map((r) => [r.kind, r.district, r.farmerGroup, r.category])).toEqual([
      ["group", "Kampar", "Alpha", "Swadaya"],
      ["group", "Kampar", "Beta", "Ex-Plasma"],
      ["group", "Siak", "Gamma", "Swadaya"],
      ["district", "Kampar", "Subtotal Distrik", ""],
      ["district", "Siak", "Subtotal Distrik", ""],
      ["category", "", "Subtotal Kategori", "Ex-Plasma"],
      ["category", "", "Subtotal Kategori", "Swadaya"],
      ["total", "", "Total", ""],
    ]);
  });

  it("angka = fungsi dashboard: Semua umur = sumBmpGroups, kolom umur = bmpAgeSeries", () => {
    for (const g of snapshot) {
      const row = rowOf(g.name);
      for (const p of matrix.periods) {
        const cells = row.cells[String(p)];
        const all = sumBmpGroups([g], p);
        expect(cells.all.productivityTonHa).toBe(all.totals.luasMelaporHa > 0 ? all.produktivitasTonHa : null);
        for (const a of bmpAgeSeries([g], p)) {
          const cell = cells[a.key as (typeof BMP_AGE_EXCEL_COLUMNS)[number]["key"]];
          expect(cell.productivityTonHa).toBe(a.luasMelaporHa > 0 ? a.produktivitasTonHa : null);
        }
      }
    }
  });

  it("bucket umur dan Tanpa thn tanam terisi; tanpa luas terdata = null (kosong), bukan 0", () => {
    const alpha = rowOf("Alpha").cells["2024"];
    expect(alpha["9-15"]).toEqual({ productivityTonHa: 6, reportedAreaHa: 2 });
    expect(alpha.lt3).toEqual({ productivityTonHa: null, reportedAreaHa: null });
    expect(rowOf("Alpha").cells["2025"].all).toEqual({ productivityTonHa: null, reportedAreaHa: null });

    const gamma = rowOf("Gamma").cells["2025"];
    expect(gamma.unknown).toEqual({ productivityTonHa: 6, reportedAreaHa: 4 }); // disetahunkan ×2
    expect(gamma.all.productivityTonHa).toBe(6);
  });

  it("subtotal tertimbang luas (Σ produksi ÷ Σ luas), bukan rata-rata baris", () => {
    // Kampar 2024: (12 + 3) ÷ (2 + 1) = 5 — rata-rata baris akan 4,5.
    expect(rowOf("Subtotal Distrik", "Kampar").cells["2024"].all).toEqual({ productivityTonHa: 5, reportedAreaHa: 3 });
    // Total Rataan: (12 + 3 + 24) ÷ (2 + 1 + 4) = 5,57; luas = 7 ha ÷ 2 tahun ber-data.
    expect(rowOf("Total").cells.average.all).toEqual({ productivityTonHa: 5.57, reportedAreaHa: 3.5 });
    expect(rowOf("Total").cells.average.all.productivityTonHa).toBe(sumBmpGroups(snapshot, "average").produktivitasTonHa);
  });

  it("tanpa Lembaga → hanya periode Rataan, tanpa baris", () => {
    expect(buildBmpAgeExcelMatrix([])).toEqual({ periods: ["average"], rows: [] });
  });
});

describe("buildBmpAgeProductivityWorkbook (#426)", () => {
  const wb = buildBmpAgeProductivityWorkbook(snapshot, { snapshotLabel: "12-Okt-26 10:00", createdByName: "Admin" });
  const ws = wb.getWorksheet("Produktivitas")!;
  // Kolom: A–C identitas, lalu 7 kolom per periode → Rataan D–J, 2024 K–Q, 2025 R–X.
  const col = (period: number, key: (typeof BMP_AGE_EXCEL_COLUMNS)[number]["key"]) =>
    4 + period * BMP_AGE_EXCEL_COLUMNS.length + BMP_AGE_EXCEL_COLUMNS.findIndex((c) => c.key === key);

  it("tiga sheet; header 3 baris ber-merge sesuai format owner", () => {
    expect(wb.worksheets.map((w) => w.name)).toEqual(["Produktivitas", "Luas terdata", "Keterangan"]);
    expect(ws.model.merges).toEqual(expect.arrayContaining(["A1:A3", "B1:B3", "C1:C3", "D1:X1", "D2:J2", "K2:Q2", "R2:X2"]));
    expect([ws.getCell("A1").value, ws.getCell("B1").value, ws.getCell("C1").value]).toEqual(["Distrik", "Lembaga", "Kategori Lembaga"]);
    expect([ws.getCell("D2").value, ws.getCell("K2").value, ws.getCell("R2").value]).toEqual(["Rataan", "2024", "2025"]);
    expect([4, 5, 6, 7, 8, 9, 10].map((c) => ws.getCell(3, c).value)).toEqual(BMP_AGE_EXCEL_COLUMNS.map((c) => c.label));
  });

  it("nilai angka di sel yang benar; kosong = tanpa nilai; subtotal setelah satu baris kosong di luar AutoFilter", () => {
    expect(ws.getCell(4, 2).value).toBe("Alpha");
    expect(ws.getCell(4, col(1, "all")).value).toBe(6);
    expect(ws.getCell(4, col(1, "9-15")).value).toBe(6);
    expect(ws.getCell(4, col(1, "lt3")).value).toBeNull();
    expect(ws.getCell(6, col(2, "unknown")).value).toBe(6); // Gamma 2025
    expect(ws.getRow(7).getCell(2).value).toBeNull(); // pemisah
    expect(ws.getCell(8, 2).value).toBe("Subtotal Distrik");
    expect(ws.getCell(8, col(1, "all")).value).toBe(5);
    expect(ws.getCell(12, 2).value).toBe("Total");
    expect(ws.autoFilter).toEqual({ from: { row: 3, column: 1 }, to: { row: 6, column: 24 } });
  });

  it("sheet Luas terdata = susunan sama, isi luas (Ha)", () => {
    const luas = wb.getWorksheet("Luas terdata")!;
    expect(luas.getCell("D1").value).toBe("Luas terdata (Ha)");
    expect(luas.getCell(4, col(1, "all")).value).toBe(2);
    expect(luas.getCell(8, col(1, "all")).value).toBe(3);
    expect(luas.getCell(12, col(0, "all")).value).toBe(3.5);
  });
});
