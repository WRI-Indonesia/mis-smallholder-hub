import { describe, it, expect } from "vitest";
import {
  bmpMonevActivityProfile,
  bmpMonevAvailableYears,
  bmpMonevGroupProfiles,
  bmpMonevGroupRows,
  bmpMonevScoreHistogram,
  bmpMonevTotals,
  bmpMonevTrend,
  bmpMonevWeakestIndicators,
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

describe("rincian indikator (#346): profil kegiatan, indikator terlemah, profil kelembagaan", () => {
  const activities = [
    { code: "1.1", name: "Training", weight: 0.1 },
    { code: "1.2", name: "Pemupukan", weight: 0.35 },
  ];
  const indicators = [
    { id: "i1", code: "1.1.1.1", criteriaCode: "1.1.1", level: "INDIVIDU" as const, name: "Pelatihan", activityCode: "1.1", activityName: "Training", weight: 0.3, inFinalScore: true, sortOrder: 1 },
    { id: "l1", code: "1.1.1.2", criteriaCode: "1.1.1", level: "LEMBAGA" as const, name: "Standar teknis", activityCode: "1.1", activityName: "Training", weight: 0.7, inFinalScore: true, sortOrder: 2 },
    { id: "i2", code: "1.2.3.1", criteriaCode: "1.2.3", level: "INDIVIDU" as const, name: "5 T", activityCode: "1.2", activityName: "Pemupukan", weight: 0.35, inFinalScore: true, sortOrder: 3 },
    { id: "l2", code: "1.2.1.1", criteriaCode: "1.2.1", level: "LEMBAGA" as const, name: "Unit manajemen", activityCode: "1.2", activityName: "Pemupukan", weight: null, inFinalScore: false, sortOrder: 4 },
  ];
  const g = (id: string, entries: { farmerId: string; year: number; score: number; act: number[] | null }[], profiles: BmpMonevGroupEntry["groupProfiles"] = []): BmpMonevGroupEntry => ({
    ...group(id, 5, []),
    assessments: entries.map((e) => ({ farmerId: e.farmerId, surveyYear: e.year, score: e.score, activityScores: e.act })),
    groupProfiles: profiles,
  });

  it("profil kegiatan: rerata skor kegiatan atas petani ber-rincian saja; maks = Σ bobot × 3; duplikat petani-tahun sekali", () => {
    const groups = [
      g("a", [{ farmerId: "f1", year: 2026, score: 2, act: [2, 1] }, { farmerId: "f1", year: 2026, score: 2, act: [2, 1] }, { farmerId: "f2", year: 2026, score: 1, act: [1, 0.35] }, { farmerId: "f3", year: 2026, score: 1, act: null }]),
    ];
    const rows = bmpMonevActivityProfile(groups, 2026, activities, indicators);
    expect(rows.map((r) => [r.code, r.avg, r.max, r.n])).toEqual([["1.1", 1.5, 3, 2], ["1.2", 0.68, 1.05, 2]]);
    expect(bmpMonevActivityProfile(groups, 2025, activities, indicators)[0]).toMatchObject({ avg: null, n: 0 });
  });

  it("indikator terlemah: hanya individu berbobot, rerata atas ber-skor, tak-dinilai dihitung terpisah, urut naik", () => {
    const groups = [g("a", []), g("b", [])];
    const stats = [
      { groupId: "a", surveyYear: 2026, indicatorId: "i1", sum: 6, n: 3, nullCount: 1 },
      { groupId: "b", surveyYear: 2026, indicatorId: "i1", sum: 3, n: 3, nullCount: 0 },
      { groupId: "a", surveyYear: 2026, indicatorId: "i2", sum: 1, n: 2, nullCount: 4 },
      { groupId: "a", surveyYear: 2026, indicatorId: "l1", sum: 0, n: 2, nullCount: 0 }, // lembaga → diabaikan
      { groupId: "c", surveyYear: 2026, indicatorId: "i2", sum: 0, n: 5, nullCount: 0 }, // di luar filter
      { groupId: "a", surveyYear: 2025, indicatorId: "i2", sum: 0, n: 5, nullCount: 0 }, // tahun lain
    ];
    const rows = bmpMonevWeakestIndicators(groups, 2026, indicators, stats);
    expect(rows.map((r) => [r.code, r.avg, r.n, r.nullCount])).toEqual([["1.2.3.1", 0.5, 2, 4], ["1.1.1.1", 1.5, 6, 1]]);
  });

  it("profil kelembagaan: Lembaga ber-profil dulu (urut rerata turun / abjad), tanpa profil tetap ada bertanda; rerata sederhana abaikan sel kosong", () => {
    const groups = [g("z", [], []), g("a", [], [{ surveyYear: 2026, scores: { l1: 2, l2: null } }, { surveyYear: 2025, scores: { l1: 1, l2: 0 } }]), g("b", [], [{ surveyYear: 2026, scores: { l1: 3, l2: 3 } }])];
    const rows = bmpMonevGroupProfiles(groups, 2026);
    expect(rows.map((r) => [r.id, r.hasProfile, r.avg, r.filled])).toEqual([["b", true, 3, 2], ["a", true, 2, 1], ["z", false, null, 0]]);
    expect(rows[1].scores.l2).toBeNull();
    expect(bmpMonevGroupProfiles(groups, 2026, "name").map((r) => r.id)).toEqual(["a", "b", "z"]);
  });
});
