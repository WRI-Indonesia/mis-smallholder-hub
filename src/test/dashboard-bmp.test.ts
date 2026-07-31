import { describe, it, expect } from "vitest";
import {
  buildBmpSnapshotData,
  filterBmpGroups,
  sumBmpGroups,
  bmpProductivity,
  bmpStatsForYear,
  bmpAvailableYears,
  bmpChartSeries,
  bmpDefaultYear,
  bmpYearOptions,
  bmpAgeBucketKey,
  bmpAgeSeries,
  bmpGroupRanking,
  normalizeBmpSnapshotData,
  type BmpRawFarmer,
  type BmpRawGroup,
  type BmpRawParcel,
  type BmpRawProduction,
} from "@/lib/bmp-dashboard-aggregation";
import type { BmpGroupEntry, BmpSnapshotData } from "@/types/dashboard";

const groups: BmpRawGroup[] = [
  { id: "g1", name: "Lembaga Alpha", code: "A1", category: "SWADAYA", districtId: "d1", districtName: "Distrik 1" },
  { id: "g2", name: "Lembaga Beta", code: "B1", category: "EX_PLASMA", districtId: "d2", districtName: "Distrik 2" },
];

const farmers: BmpRawFarmer[] = [
  { id: "f1", farmerGroupId: "g1" },
  { id: "f2", farmerGroupId: "g1" },
  { id: "f3", farmerGroupId: "g2" },
];

const parcels: BmpRawParcel[] = [
  { id: "p1", farmerId: "f1", area: 2, plantingYear: 2015 },
  { id: "p2", farmerId: "f1", area: 1.5, plantingYear: 2022 },
  { id: "p3", farmerId: "f2", area: null, plantingYear: null },
  { id: "p4", farmerId: "f3", area: 3, plantingYear: 2000 },
];

/** Record produksi p1: 30 bulan berturut (2023-01 … 2025-06) @1000kg → BAIK. */
const p1Consecutive: BmpRawProduction[] = Array.from({ length: 30 }, (_, i) => {
  const year = 2023 + Math.floor(i / 12);
  const month = (i % 12) + 1;
  return { farmerId: "f1", parcelId: "p1", period: `${year}-${String(month).padStart(2, "0")}`, kg: 1000 };
});

describe("buildBmpSnapshotData", () => {
  it("agregasi per Lembaga: ton, distinct lahan/petani melapor, total petani/lahan", () => {
    const production: BmpRawProduction[] = [
      { farmerId: "f1", parcelId: "p1", period: "2025-01", kg: 1500 },
      { farmerId: "f1", parcelId: "p2", period: "2025-01", kg: 500 },
      { farmerId: "f1", parcelId: "p1", period: "2025-02", kg: 1000 },
    ];
    const { groups: entries } = buildBmpSnapshotData(groups, farmers, parcels, production);
    const g1 = entries.find((e) => e.id === "g1")!;

    expect(g1.totals.produksiTon).toBe(3);
    expect(g1.totals.totalPetani).toBe(2);
    expect(g1.totals.petaniMelapor).toBe(1); // hanya f1
    expect(g1.totals.totalLahan).toBe(3); // p1 p2 p3
    expect(g1.totals.lahanBerData).toBe(2); // p1 p2
    expect(g1.totals.luasMelaporHa).toBe(3.5); // 2 + 1.5
    expect(g1.monthly["2025-01"]).toEqual({ produksiTon: 2, lahanMelapor: 2, luasMelaporHa: 3.5 });
    expect(g1.monthly["2025-02"]).toEqual({ produksiTon: 1, lahanMelapor: 1, luasMelaporHa: 2 });
    // Breakdown per tahun (distinct dihitung per tahun, bukan dijumlah antarbulan)
    expect(g1.byYear["2025"]).toEqual({
      produksiTon: 3,
      luasMelaporHa: 3.5,
      lahanBerData: 2,
      petaniMelapor: 1,
    });
  });

  it("lembaga tanpa data → entri kosong (bukan hilang)", () => {
    const { groups: entries } = buildBmpSnapshotData(groups, farmers, parcels, []);
    const g2 = entries.find((e) => e.id === "g2")!;
    expect(g2.totals).toEqual({
      produksiTon: 0,
      luasMelaporHa: 0,
      lahanBerData: 0,
      totalLahan: 1,
      totalLuasHa: 3, // p4
      petaniMelapor: 0,
      totalPetani: 1,
    });
    expect(g2.availability).toEqual({ baik: 0, cukup: 0, kurang: 0, tidakAda: 1 });
    expect(g2.monthly).toEqual({});
    expect(g2.byYear).toEqual({});
  });

  it("record tanpa parcelId ikut produksi & petani melapor, tapi tidak memengaruhi lahan/availability", () => {
    const production: BmpRawProduction[] = [
      { farmerId: "f3", parcelId: null, period: "2025-03", kg: 2000 },
    ];
    const { groups: entries } = buildBmpSnapshotData(groups, farmers, parcels, production);
    const g2 = entries.find((e) => e.id === "g2")!;

    expect(g2.totals.produksiTon).toBe(2);
    expect(g2.totals.petaniMelapor).toBe(1);
    expect(g2.totals.lahanBerData).toBe(0);
    expect(g2.monthly["2025-03"]).toEqual({ produksiTon: 2, lahanMelapor: 0, luasMelaporHa: 0 });
    expect(g2.byYear["2025"]).toEqual({ produksiTon: 2, luasMelaporHa: 0, lahanBerData: 0, petaniMelapor: 1 });
    expect(g2.availability.tidakAda).toBe(1); // p4 tetap tanpa data
  });

  it("kategori ketersediaan reuse ambang MAP-02 (>24 BAIK, 12–24 CUKUP, 1–11 KURANG, 0 NONE)", () => {
    const production: BmpRawProduction[] = [
      ...p1Consecutive, // p1 → 30 bulan → BAIK
      // p2 → 12 bulan berturut (2025-01..2025-12) → CUKUP
      ...Array.from({ length: 12 }, (_, i) => ({
        farmerId: "f1",
        parcelId: "p2",
        period: `2025-${String(i + 1).padStart(2, "0")}`,
        kg: 100,
      })),
      // p4 → 2 bulan → KURANG
      { farmerId: "f3", parcelId: "p4", period: "2025-01", kg: 100 },
      { farmerId: "f3", parcelId: "p4", period: "2025-02", kg: 100 },
    ];
    const { groups: entries } = buildBmpSnapshotData(groups, farmers, parcels, production);
    const g1 = entries.find((e) => e.id === "g1")!;
    const g2 = entries.find((e) => e.id === "g2")!;

    expect(g1.availability).toEqual({ baik: 1, cukup: 1, kurang: 0, tidakAda: 1 }); // p3 tanpa data
    expect(g2.availability).toEqual({ baik: 0, cukup: 0, kurang: 1, tidakAda: 0 });
  });

  it("record milik petani di luar scope / period tak valid diabaikan", () => {
    const production: BmpRawProduction[] = [
      { farmerId: "f-unknown", parcelId: "p1", period: "2025-01", kg: 999999 },
      { farmerId: "f1", parcelId: "p1", period: "bukan-period", kg: 500 },
      { farmerId: "f1", parcelId: "p1", period: "2025-13", kg: 500 },
    ];
    const { groups: entries } = buildBmpSnapshotData(groups, farmers, parcels, production);
    const g1 = entries.find((e) => e.id === "g1")!;
    expect(g1.totals.produksiTon).toBe(0);
    expect(g1.monthly).toEqual({});
  });
});

describe("filterBmpGroups & sumBmpGroups (slicing client-side)", () => {
  const data = (): BmpSnapshotData =>
    buildBmpSnapshotData(groups, farmers, parcels, [
      { farmerId: "f1", parcelId: "p1", period: "2025-01", kg: 1000 },
      { farmerId: "f3", parcelId: "p4", period: "2025-01", kg: 3000 },
    ]);

  it("filter distrik / kategori / lembaga", () => {
    const d = data();
    expect(filterBmpGroups(d, { districtId: "d1" }).map((g) => g.id)).toEqual(["g1"]);
    expect(filterBmpGroups(d, { category: "EX_PLASMA" }).map((g) => g.id)).toEqual(["g2"]);
    expect(filterBmpGroups(d, { groupId: "g2" }).map((g) => g.id)).toEqual(["g2"]);
    expect(filterBmpGroups(d, { districtId: "d1", category: "EX_PLASMA" })).toEqual([]);
  });

  it("scope viewer (districtIds/groupIds) membatasi entri — RBAC at read time", () => {
    const d = data();
    expect(filterBmpGroups(d, { districtIds: ["d2"] }).map((g) => g.id)).toEqual(["g2"]);
    expect(filterBmpGroups(d, { groupIds: ["g1"] }).map((g) => g.id)).toEqual(["g1"]);
    expect(filterBmpGroups(d, { districtIds: [] })).toEqual([]);
  });

  it("sum slice: totals, availability, monthly digabung lalu dibulatkan", () => {
    const d = data();
    const all = sumBmpGroups(d.groups);
    expect(all.totals.produksiTon).toBe(4);
    expect(all.totals.totalLahan).toBe(4);
    expect(all.totals.lahanBerData).toBe(2);
    expect(all.totals.petaniMelapor).toBe(2);
    expect(all.totals.totalPetani).toBe(3);
    expect(all.monthly["2025-01"]).toEqual({ produksiTon: 4, lahanMelapor: 2, luasMelaporHa: 5 });
    expect(all.availability).toEqual({ baik: 0, cukup: 0, kurang: 2, tidakAda: 2 });
    expect(all.produktivitasTonHa).toBe(0.8); // 4 ton ÷ 5 ha (per tahun 2025)

    const onlyG1 = sumBmpGroups(filterBmpGroups(d, { districtId: "d1" }));
    expect(onlyG1.totals.produksiTon).toBe(1);
    expect(onlyG1.totals.totalPetani).toBe(2);
  });

  it("filter Tahun global: cards mengikuti tahun terpilih; master data year-independent", () => {
    // g1: 2024 → p1 (2 ha) 1 ton; 2025 → p1+p2 (3.5 ha) 3 ton
    const d = buildBmpSnapshotData(groups, farmers, parcels, [
      { farmerId: "f1", parcelId: "p1", period: "2024-06", kg: 1000 },
      { farmerId: "f1", parcelId: "p1", period: "2025-01", kg: 2000 },
      { farmerId: "f2", parcelId: "p3", period: "2025-02", kg: 1000 },
    ]);
    const g1 = d.groups.find((g) => g.id === "g1")!;

    const y2024 = bmpStatsForYear(g1, 2024);
    expect(y2024.produksiTon).toBe(1);
    expect(y2024.lahanBerData).toBe(1);
    expect(y2024.petaniMelapor).toBe(1);
    expect(y2024.totalLahan).toBe(3); // year-independent
    expect(y2024.totalPetani).toBe(2);

    const s2025 = sumBmpGroups([g1], 2025);
    expect(s2025.totals.produksiTon).toBe(3);
    expect(s2025.totals.lahanBerData).toBe(2); // p1 + p3
    expect(s2025.totals.petaniMelapor).toBe(2);
    expect(s2025.produktivitasTonHa).toBe(1.5); // 3 ton ÷ 2 ha (p3 area null → 0)

    // Tahun tanpa data → nol, tapi master data tetap
    const s2023 = sumBmpGroups([g1], 2023);
    expect(s2023.totals.produksiTon).toBe(0);
    expect(s2023.totals.totalLahan).toBe(3);
    expect(s2023.produktivitasTonHa).toBe(0);
  });

  it("mode 'average' (default dashboard): rataan per tahun dari Σ nilai tahunan", () => {
    // g1: 2024 → 1 ton, 1 lahan (p1, 2 ha), 1 petani; 2025 → 3 ton, 2 lahan (p1+p3), 2 petani
    const d = buildBmpSnapshotData(groups, farmers, parcels, [
      { farmerId: "f1", parcelId: "p1", period: "2024-06", kg: 1000 },
      { farmerId: "f1", parcelId: "p1", period: "2025-01", kg: 2000 },
      { farmerId: "f2", parcelId: "p3", period: "2025-02", kg: 1000 },
    ]);
    const g1 = d.groups.find((g) => g.id === "g1")!;

    const avg = sumBmpGroups([g1], "average");
    expect(avg.totals.produksiTon).toBe(2); // (1+3)/2 tahun
    // Lahan p1 melapor di 2 tahun → dihitung per tahun (1+2)/2 = 1,5 → 2 (round)
    expect(avg.totals.lahanBerData).toBe(2);
    expect(avg.totals.petaniMelapor).toBe(2); // (1+2)/2 = 1,5 → 2
    expect(avg.totals.totalLahan).toBe(3); // master data tetap
    expect(avg.totals.totalPetani).toBe(2);
    expect(avg.produktivitasTonHa).toBe(1); // Σ4 ton ÷ Σ(2+2) ha — sama dgn mode kumulatif

    // Tanpa data sama sekali → tetap nol tanpa NaN
    const g2 = d.groups.find((g) => g.id === "g2")!;
    const avgEmpty = sumBmpGroups([g2], "average");
    expect(avgEmpty.totals.produksiTon).toBe(0);
    expect(avgEmpty.produktivitasTonHa).toBe(0);
  });
});

describe("mode 'full' — hanya LAHAN dengan data lengkap 12 bulan (Jan–Des)", () => {
  const allMonths = (farmerId: string, parcelId: string, year: number, kgPerMonth: number): BmpRawProduction[] =>
    Array.from({ length: 12 }, (_, i) => ({
      farmerId,
      parcelId,
      period: `${year}-${String(i + 1).padStart(2, "0")}`,
      kg: kgPerMonth,
    }));

  // p1 lapor 12 bulan penuh 2025 → full; p3 hanya Jan–Feb → tidak full;
  // p4 (g2) 12 bulan penuh → full.
  const production: BmpRawProduction[] = [
    ...allMonths("f1", "p1", 2025, 1000), // 12 ton
    { farmerId: "f2", parcelId: "p3", period: "2025-01", kg: 5000 },
    { farmerId: "f2", parcelId: "p3", period: "2025-02", kg: 5000 },
    ...allMonths("f3", "p4", 2025, 100), // 1,2 ton
  ];

  it("byYearFull/monthlyFull hanya berisi record lahan full 12 bulan; byYear tetap semua", () => {
    const d = buildBmpSnapshotData(groups, farmers, parcels, production);
    const g1 = d.groups.find((g) => g.id === "g1")!;

    expect(g1.byYear["2025"].petaniMelapor).toBe(2); // f1 + f2
    expect(g1.byYear["2025"].produksiTon).toBe(22);
    expect(g1.byYearFull["2025"]).toEqual({
      produksiTon: 12, // hanya p1
      luasMelaporHa: 2, // p1
      lahanBerData: 1,
      petaniMelapor: 1,
    });
    // Jan: tanpa p3 (p3 tidak full)
    expect(g1.monthlyFull["2025-01"]).toEqual({ produksiTon: 1, lahanMelapor: 1, luasMelaporHa: 2 });

    const g2 = d.groups.find((g) => g.id === "g2")!;
    expect(g2.byYearFull["2025"].petaniMelapor).toBe(1); // p4 full
  });

  it("lahan dengan 11 bulan (bolong 1) tidak full — meski tahun berjalan/parsial", () => {
    const elevenMonths = allMonths("f1", "p1", 2026, 500).slice(0, 11); // Jan–Nov
    const d = buildBmpSnapshotData(groups, farmers, parcels, elevenMonths);
    const g1 = d.groups.find((g) => g.id === "g1")!;
    expect(g1.byYear["2026"].produksiTon).toBe(5.5);
    expect(g1.byYearFull["2026"]).toBeUndefined(); // 11 < 12 bulan → bukan full
  });

  it("kelengkapan dihitung per LAHAN: petani lengkap via 2 lahan bergantian ≠ full", () => {
    // f1 lapor 12 bulan tapi berganti lahan (Jan–Jun p1, Jul–Des p2) → tak ada lahan full.
    const split = allMonths("f1", "p1", 2025, 1000).map((r, i) =>
      i >= 6 ? { ...r, parcelId: "p2" } : r
    );
    const d = buildBmpSnapshotData(groups, farmers, parcels, split);
    const g1 = d.groups.find((g) => g.id === "g1")!;
    expect(g1.byYear["2025"].produksiTon).toBe(12);
    expect(g1.byYearFull["2025"]).toBeUndefined();
  });

  it("record tanpa parcelId tidak pernah masuk subset full", () => {
    const d = buildBmpSnapshotData(groups, farmers, parcels, [
      { farmerId: "f3", parcelId: null, period: "2025-01", kg: 9000 },
    ]);
    const g2 = d.groups.find((g) => g.id === "g2")!;
    expect(g2.byYear["2025"].produksiTon).toBe(9);
    expect(g2.byYearFull).toEqual({});
  });

  it("sumBmpGroups mode full: cards & produktivitas dari subset; denominator master tetap", () => {
    const d = buildBmpSnapshotData(groups, farmers, parcels, production);
    const s = sumBmpGroups(d.groups, 2025, "full");
    expect(s.totals.produksiTon).toBe(13.2); // p1 12 + p4 1,2
    expect(s.totals.petaniMelapor).toBe(2); // f1 + f3
    expect(s.totals.totalPetani).toBe(3); // master data tak berubah
    expect(s.totals.totalLahan).toBe(4);
    expect(s.produktivitasTonHa).toBe(2.64); // 13,2 ÷ (2 + 3) ha
    expect(s.monthly["2025-01"].produksiTon).toBe(1.1); // tanpa p3

    const sAll = sumBmpGroups(d.groups, 2025, "all");
    expect(sAll.totals.produksiTon).toBe(23.2); // p1 12 + p3 10 + p4 1,2 (semua record)
  });
});

describe("bmpProductivity (Ton/Ha per tahun)", () => {
  const entry = (byYear: BmpGroupEntry["byYear"]): BmpGroupEntry => ({
    id: "g",
    name: "G",
    code: null,
    category: "SWADAYA",
    districtId: null,
    districtName: null,
    monthly: {},
    byYear,
    monthlyFull: {},
    byYearFull: {},
    availability: { baik: 0, cukup: 0, kurang: 0, tidakAda: 0 },
    totals: { produksiTon: 0, luasMelaporHa: 0, lahanBerData: 0, totalLahan: 0, totalLuasHa: 0, petaniMelapor: 0, totalPetani: 0 },
  });

  it("Semua Tahun = Σ produksi per tahun ÷ Σ luas melapor per tahun (rata-rata tahunan tertimbang)", () => {
    const g = entry({
      "2024": { produksiTon: 10, luasMelaporHa: 5, lahanBerData: 3, petaniMelapor: 2 },
      "2025": { produksiTon: 20, luasMelaporHa: 5, lahanBerData: 3, petaniMelapor: 2 },
    });
    expect(bmpProductivity(g)).toBe(3); // (10+20) ÷ (5+5) — bukan 30 ÷ 5 kumulatif
    expect(bmpProductivity(g, 2024)).toBe(2);
    expect(bmpProductivity(g, 2025)).toBe(4);
  });

  it("tanpa luas melapor → 0 (hindari division by zero)", () => {
    expect(bmpProductivity(entry({}))).toBe(0);
    expect(
      bmpProductivity(entry({ "2025": { produksiTon: 5, luasMelaporHa: 0, lahanBerData: 0, petaniMelapor: 1 } }), 2025)
    ).toBe(0);
  });
});

describe("bmpChartSeries & bmpAvailableYears", () => {
  const monthly = {
    "2024-01": { produksiTon: 10, lahanMelapor: 4, luasMelaporHa: 8 },
    "2025-01": { produksiTon: 20, lahanMelapor: 6, luasMelaporHa: 12 },
    "2025-02": { produksiTon: 30, lahanMelapor: 8, luasMelaporHa: 16 },
  };

  it("daftar tahun tersedia (desc) dari period keys", () => {
    expect(bmpAvailableYears(monthly)).toEqual([2025, 2024]);
    expect(bmpAvailableYears({})).toEqual([]);
  });

  it("mode satu tahun: 12 titik, bulan tanpa data = 0", () => {
    const s = bmpChartSeries(monthly, 2025, 10);
    expect(s).toHaveLength(12);
    expect(s[0]).toEqual({ monthIndex: 0, produksiTon: 20, lahanMelapor: 6, coveragePct: 60 });
    expect(s[1].produksiTon).toBe(30);
    expect(s[2]).toEqual({ monthIndex: 2, produksiTon: 0, lahanMelapor: 0, coveragePct: 0 });
  });

  it("mode Average: rata-rata per bulan lintas tahun BER-DATA (pola monthlyAverageYield)", () => {
    const s = bmpChartSeries(monthly, null, 10);
    expect(s[0].produksiTon).toBe(15); // (10+20)/2 tahun ber-data
    expect(s[0].lahanMelapor).toBe(5); // (4+6)/2
    expect(s[0].coveragePct).toBe(50);
    expect(s[1].produksiTon).toBe(30); // hanya 2025 punya Feb
  });

  it("totalLahan 0 → coverage 0 (bukan NaN)", () => {
    const s = bmpChartSeries(monthly, 2025, 0);
    expect(s[0].coveragePct).toBe(0);
  });
});

describe("normalizeBmpSnapshotData", () => {
  it("payload valid dipertahankan; rusak/null → kosong dengan default aman", () => {
    const entry: BmpGroupEntry = {
      id: "g1",
      name: "Alpha",
      code: null,
      category: "SWADAYA",
      districtId: "d1",
      districtName: "Distrik 1",
      monthly: { "2025-01": { produksiTon: 1, lahanMelapor: 1, luasMelaporHa: 2 } },
      byYear: { "2025": { produksiTon: 1, luasMelaporHa: 2, lahanBerData: 1, petaniMelapor: 1 } },
      monthlyFull: { "2025-01": { produksiTon: 1, lahanMelapor: 1, luasMelaporHa: 2 } },
      byYearFull: { "2025": { produksiTon: 1, luasMelaporHa: 2, lahanBerData: 1, petaniMelapor: 1 } },
      byYearAge: { "2025": { "9-15": { produksiTon: 1, luasMelaporHa: 2 } } },
      byYearAgeFull: {},
      availability: { baik: 1, cukup: 0, kurang: 0, tidakAda: 0 },
      totals: { produksiTon: 1, luasMelaporHa: 2, lahanBerData: 1, totalLahan: 1, totalLuasHa: 2, petaniMelapor: 1, totalPetani: 1 },
    };
    expect(normalizeBmpSnapshotData({ groups: [entry] }).groups[0]).toEqual(entry);
    expect(normalizeBmpSnapshotData(null)).toEqual({ groups: [] });
    expect(normalizeBmpSnapshotData({ foo: 1 })).toEqual({ groups: [] });

    const partial = normalizeBmpSnapshotData({ groups: [{ id: "x", name: "X" }] }).groups[0];
    expect(partial.monthly).toEqual({});
    expect(partial.byYear).toEqual({});
    expect(partial.monthlyFull).toEqual({});
    expect(partial.byYearFull).toEqual({});
    expect(partial.byYearAge).toEqual({});
    expect(partial.byYearAgeFull).toEqual({});
    expect(partial.availability).toEqual({ baik: 0, cukup: 0, kurang: 0, tidakAda: 0 });
    expect(partial.totals.totalLahan).toBe(0);
    expect(partial.totals.totalLuasHa).toBe(0); // snapshot lama → tanpa pembanding luas
  });
});

describe("bmpYearOptions & bmpDefaultYear (#191)", () => {
  it("default = tahun berjalan bila ber-data; fallback tahun terbaru; tanpa tahun → average", () => {
    expect(bmpDefaultYear([2026, 2025], 2026)).toBe(2026);
    expect(bmpDefaultYear([2025, 2024], 2026)).toBe(2025);
    expect(bmpDefaultYear([], 2026)).toBe("average");
  });

  it("bmpYearOptions: gabungan tahun byYear seluruh group, desc", () => {
    const d = buildBmpSnapshotData(groups, farmers, parcels, [
      { farmerId: "f1", parcelId: "p1", period: "2024-05", kg: 1000 },
      { farmerId: "f3", parcelId: "p4", period: "2025-01", kg: 1000 },
    ]);
    expect(bmpYearOptions(d.groups)).toEqual([2025, 2024]);
    expect(bmpYearOptions([])).toEqual([]);
  });
});

describe("bucket umur tanaman (#191)", () => {
  it("bmpAgeBucketKey: umur dihitung pada tahun produksi", () => {
    expect(bmpAgeBucketKey(2022, 2025)).toBe("lt4"); // umur 3
    expect(bmpAgeBucketKey(2021, 2025)).toBe("4-8"); // umur 4
    expect(bmpAgeBucketKey(2015, 2025)).toBe("9-15"); // umur 10
    expect(bmpAgeBucketKey(2000, 2025)).toBe("gt15"); // umur 25
    expect(bmpAgeBucketKey(null, 2025)).toBe("unknown");
    expect(bmpAgeBucketKey(2030, 2025)).toBe("unknown"); // tahun tanam di masa depan
  });

  it("byYearAge terisi per tahun × bucket — hanya record ber-lahan", () => {
    const d = buildBmpSnapshotData(groups, farmers, parcels, [
      { farmerId: "f1", parcelId: "p1", period: "2025-01", kg: 1500 }, // p1 (2015) → 9-15
      { farmerId: "f1", parcelId: "p2", period: "2025-02", kg: 500 }, // p2 (2022) → lt4
      { farmerId: "f1", parcelId: null, period: "2025-03", kg: 999 }, // tanpa lahan → di luar analisa umur
    ]);
    const g1 = d.groups.find((g) => g.id === "g1")!;
    expect(g1.byYearAge["2025"]["9-15"]).toEqual({ produksiTon: 1.5, luasMelaporHa: 2 });
    expect(g1.byYearAge["2025"]["lt4"]).toEqual({ produksiTon: 0.5, luasMelaporHa: 1.5 });
    expect(g1.byYearAge["2025"]["unknown"]).toBeUndefined();
  });

  it("bmpAgeSeries: agregasi lintas group, produktivitas tertimbang Σton ÷ Σluas", () => {
    const d = buildBmpSnapshotData(groups, farmers, parcels, [
      { farmerId: "f1", parcelId: "p1", period: "2025-01", kg: 4000 }, // 4 ton ÷ 2 ha = 2 Ton/Ha
      { farmerId: "f3", parcelId: "p4", period: "2025-01", kg: 3000 }, // 3 ton ÷ 3 ha = 1 Ton/Ha
    ]);
    const series = bmpAgeSeries(d.groups, 2025);
    expect(series.find((s) => s.key === "9-15")).toMatchObject({
      produksiTon: 4,
      luasMelaporHa: 2,
      produktivitasTonHa: 2,
    });
    expect(series.find((s) => s.key === "gt15")!.produktivitasTonHa).toBe(1);
    // Bucket program tanpa data tetap tampil (0); "unknown" hanya bila ber-data.
    expect(series.find((s) => s.key === "4-8")!.produksiTon).toBe(0);
    expect(series.find((s) => s.key === "unknown")).toBeUndefined();
  });
});

describe("bmpGroupRanking (#191)", () => {
  it("urut produktivitas desc, hanya lembaga ber-luas, hormati limit & tahun", () => {
    const d = buildBmpSnapshotData(groups, farmers, parcels, [
      { farmerId: "f1", parcelId: "p1", period: "2025-01", kg: 2000 }, // g1: 2 ÷ 2 = 1 Ton/Ha
      { farmerId: "f3", parcelId: "p4", period: "2025-01", kg: 9000 }, // g2: 9 ÷ 3 = 3 Ton/Ha
    ]);
    const r = bmpGroupRanking(d.groups, 2025);
    expect(r.map((e) => e.id)).toEqual(["g2", "g1"]);
    expect(r[0]).toMatchObject({ produktivitasTonHa: 3, category: "EX_PLASMA" });
    expect(bmpGroupRanking(d.groups, 2025, "all", 1)).toHaveLength(1);
    expect(bmpGroupRanking(d.groups, 2024)).toEqual([]); // tahun tanpa data → tanpa luas
  });
});

describe("totalLuasHa (#191)", () => {
  it("Σ luas seluruh lahan aktif per group; year-independent; tidak dirata-rata pada mode average", () => {
    const d = buildBmpSnapshotData(groups, farmers, parcels, [
      { farmerId: "f1", parcelId: "p1", period: "2025-01", kg: 1000 },
    ]);
    const g1 = d.groups.find((g) => g.id === "g1")!;
    expect(g1.totals.totalLuasHa).toBe(3.5); // p1 2 + p2 1,5 (p3 area null)
    expect(sumBmpGroups(d.groups, 2025).totals.totalLuasHa).toBe(6.5); // + p4 3
    expect(sumBmpGroups(d.groups, "average").totals.totalLuasHa).toBe(6.5);
  });
});
