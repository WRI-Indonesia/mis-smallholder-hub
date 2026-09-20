import { describe, it, expect } from "vitest";
import {
  bmpMonevAvailableYears,
  bmpMonevGroupRows,
  bmpMonevScoreHistogram,
  bmpMonevTotals,
  bmpMonevTrend,
  filterBmpMonevGroups,
  BMP_MONEV_STACK_ORDER,
  type BmpMonevGroupEntry,
} from "@/lib/bmp-monev-dashboard-aggregation";

/** Agregasi murni Dashboard Monev BMP (#344) — grain petani per tahun. */

const group = (id: string, totalFarmers: number, assessments: [string, number, number][], districtId = "d1"): BmpMonevGroupEntry => ({
  id,
  name: `Lembaga ${id}`,
  code: id.toUpperCase(),
  districtId,
  districtName: `Distrik ${districtId}`,
  totalFarmers,
  assessments: assessments.map(([farmerId, surveyYear, score]) => ({ farmerId, surveyYear, score })),
});

const GROUPS = [
  // A: 3 dari 10 petani dinilai 2026 (Teladan 2,6 · Praktisi 1,8 · Perintis 1,2); 2025 satu petani 0,9
  group("a", 10, [["f1", 2026, 2.6], ["f2", 2026, 1.8], ["f3", 2026, 1.2], ["f1", 2025, 0.9]]),
  // B: 2 dari 4 dinilai 2026, keduanya Praktisi 2,0 & 2,5 (2,5 = Praktisi, batas ketat)
  group("b", 4, [["g1", 2026, 2.0], ["g2", 2026, 2.5]], "d2"),
  // C: belum dinilai
  group("c", 6, []),
];

describe("tahun & filter", () => {
  it("tahun ber-data urut turun; filter distrik/lembaga mengiris payload", () => {
    expect(bmpMonevAvailableYears(GROUPS)).toEqual([2026, 2025]);
    expect(filterBmpMonevGroups(GROUPS, { districtId: "d2", groupId: null }).map((g) => g.id)).toEqual(["b"]);
    expect(filterBmpMonevGroups(GROUPS, { districtId: null, groupId: "c" }).map((g) => g.id)).toEqual(["c"]);
    expect(bmpMonevAvailableYears([GROUPS[2]])).toEqual([]);
  });
});

describe("bmpMonevTotals", () => {
  it("cakupan atas seluruh petani aktif (termasuk Lembaga tanpa data), rerata & adopter atas petani dinilai", () => {
    const t = bmpMonevTotals(GROUPS, 2026);
    expect(t.assessedFarmers).toBe(5);
    expect(t.totalFarmers).toBe(20);
    expect(t.avgScore).toBe(2.02); // (2.6+1.8+1.2+2.0+2.5)/5
    expect(t.byCategory).toEqual({ TELADAN: 1, PRAKTISI: 3, PERINTIS: 1, BELUM: 0 });
    expect(t.adopters).toBe(4);
    expect(t.groupsCovered).toBe(2);
    expect(t.groupsTotal).toBe(3);
  });

  it("tahun tanpa data → nol & rerata null; duplikat petani-tahun tidak dihitung dua kali (skor tertinggi)", () => {
    expect(bmpMonevTotals(GROUPS, 2024)).toMatchObject({ assessedFarmers: 0, avgScore: null, adopters: 0, groupsCovered: 0 });
    const dup = [group("x", 1, [["f1", 2026, 1.0], ["f1", 2026, 2.0]])];
    const t = bmpMonevTotals(dup, 2026);
    expect(t.assessedFarmers).toBe(1);
    expect(t.avgScore).toBe(2);
  });
});

describe("bmpMonevGroupRows", () => {
  it("urut rerata menurun, Lembaga tanpa data di bawah urut nama, hitungan per kategori", () => {
    const rows = bmpMonevGroupRows(GROUPS, 2026);
    expect(rows.map((r) => [r.id, r.assessedFarmers, r.avgScore])).toEqual([
      ["b", 2, 2.25],
      ["a", 3, 1.87],
      ["c", 0, null],
    ]);
    expect(rows[1].byCategory).toEqual({ TELADAN: 1, PRAKTISI: 1, PERINTIS: 1, BELUM: 0 });
    expect(rows[2].byCategory).toEqual({ TELADAN: 0, PRAKTISI: 0, PERINTIS: 0, BELUM: 0 });
  });
});

describe("bmpMonevTrend", () => {
  it("bucket per tahun urut naik atas Lembaga terpilih", () => {
    const trend = bmpMonevTrend(GROUPS);
    expect(trend.map((b) => [b.year, b.assessedFarmers, b.avgScore])).toEqual([
      [2025, 1, 0.9],
      [2026, 5, 2.02],
    ]);
    expect(trend[0].byCategory).toEqual({ TELADAN: 0, PRAKTISI: 0, PERINTIS: 0, BELUM: 1 });
  });

  it("urutan stack: terendah → tertinggi (Belum, Perintis, Praktisi, Teladan)", () => {
    expect(BMP_MONEV_STACK_ORDER.map((c) => c.key)).toEqual(["BELUM", "PERINTIS", "PRAKTISI", "TELADAN"]);
  });
});

describe("bmpMonevScoreHistogram", () => {
  it("12 bin 0,25 dari 0–3; skor jatuh ke bin [from, to); 3,00 masuk bin terakhir; warna bin mengikuti kategori titik tengah", () => {
    const bins = bmpMonevScoreHistogram([group("x", 9, [["a", 2026, 0], ["b", 2026, 1.0], ["c", 2026, 1.24], ["d", 2026, 1.25], ["e", 2026, 2.5], ["f", 2026, 3.0]])], 2026);
    expect(bins).toHaveLength(12);
    expect(bins.map((b) => b.count)).toEqual([1, 0, 0, 0, 2, 1, 0, 0, 0, 0, 1, 1]);
    expect(bins[0]).toMatchObject({ from: 0, to: 0.25, categoryKey: "BELUM" });
    expect(bins[4]).toMatchObject({ from: 1, to: 1.25, categoryKey: "PERINTIS" });
    expect(bins[6]).toMatchObject({ from: 1.5, to: 1.75, categoryKey: "PRAKTISI" });
    expect(bins[10]).toMatchObject({ from: 2.5, to: 2.75, categoryKey: "TELADAN" });
    expect(bins[11]).toMatchObject({ from: 2.75, to: 3, categoryKey: "TELADAN" });
  });

  it("tahun lain / tanpa data → semua bin nol; duplikat petani-tahun dihitung sekali", () => {
    expect(bmpMonevScoreHistogram(GROUPS, 2024).every((b) => b.count === 0)).toBe(true);
    const bins = bmpMonevScoreHistogram([group("x", 1, [["a", 2026, 1.0], ["a", 2026, 2.0]])], 2026);
    expect(bins.reduce((s, b) => s + b.count, 0)).toBe(1);
  });
});
