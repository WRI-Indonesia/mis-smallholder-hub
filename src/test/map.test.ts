import { describe, it, expect } from "vitest";
import {
  buildMapData,
  monthlyAverageYield,
  summarizeProduction,
  longestConsecutiveMonths,
  productionAvailabilityCategory,
  buildBmpMapData,
  productivityClass,
  parcelProductivity,
  bmpProductionYears,
  buildBmpProductivityView,
  buildBmpProductivityMatrix,
  type RawGroup,
  type RawParcel,
} from "@/lib/map-data";
import type { BmpParcelFeature } from "@/types/map";

const group = (over: Partial<RawGroup> = {}): RawGroup => ({
  id: "g1",
  name: "KT Maju",
  code: "KT-01",
  locationLat: 0.5,
  locationLong: 101.4,
  district: { name: "Kampar" },
  ...over,
});

// A simple square polygon centered at (100, 0).
const square: RawParcel["geometry"] = {
  type: "Polygon",
  coordinates: [
    [
      [99.5, -0.5],
      [100.5, -0.5],
      [100.5, 0.5],
      [99.5, 0.5],
      [99.5, -0.5],
    ],
  ],
};

const parcel = (over: Partial<RawParcel> = {}): RawParcel => ({
  id: "p1",
  parcelId: "PCL-01",
  farmerId: "f1",
  geometry: square,
  area: 2.5,
  plantingYear: 2020,
  cropType: "Kelapa Sawit",
  landStatus: "Milik",
  farmer: { name: "Budi", farmerId: "FMR-01", farmerGroup: { name: "KT Maju" } },
  ...over,
});

describe("buildMapData", () => {
  it("builds KT points and parcel features with derived centroid", () => {
    const result = buildMapData([group()], [parcel()]);

    expect(result.kelompokTani).toHaveLength(1);
    expect(result.kelompokTani[0]).toMatchObject({
      id: "g1",
      name: "KT Maju",
      districtName: "Kampar",
      lat: 0.5,
      long: 101.4,
    });

    expect(result.parcels).toHaveLength(1);
    const [long, lat] = result.parcels[0].centroid;
    expect(long).toBeCloseTo(100, 5);
    expect(lat).toBeCloseTo(0, 5);
    expect(result.parcels[0]).toMatchObject({
      parcelId: "PCL-01",
      farmerName: "Budi",
      farmerGroupName: "KT Maju",
      area: 2.5,
    });
  });

  it("excludes KT without coordinates from the kt layer", () => {
    const result = buildMapData(
      [group(), group({ id: "g2", locationLat: null }), group({ id: "g3", locationLong: null })],
      []
    );
    expect(result.kelompokTani.map((k) => k.id)).toEqual(["g1"]);
    expect(result.counts.kt).toBe(1);
  });

  it("skips parcels with null geometry", () => {
    const result = buildMapData([], [parcel(), parcel({ id: "p2", geometry: null })]);
    expect(result.parcels.map((p) => p.id)).toEqual(["p1"]);
    expect(result.counts.parcelPoints).toBe(1);
  });

  it("skips parcels with invalid geometry without failing the batch", () => {
    const result = buildMapData(
      [],
      [parcel(), parcel({ id: "p2", geometry: { type: "Polygon", coordinates: "broken" } as never })]
    );
    expect(result.parcels.map((p) => p.id)).toEqual(["p1"]);
  });

  it("falls back to em dash for missing farmer / group / district", () => {
    const result = buildMapData(
      [group({ district: null })],
      [parcel({ farmer: null })]
    );
    expect(result.kelompokTani[0].districtName).toBe("—");
    expect(result.parcels[0].farmerName).toBe("—");
    expect(result.parcels[0].farmerGroupName).toBe("—");
  });

  it("reports counts consistent with produced features", () => {
    const result = buildMapData(
      [group(), group({ id: "g2" })],
      [parcel(), parcel({ id: "p2" }), parcel({ id: "p3" })]
    );
    expect(result.counts).toEqual({ kt: 2, parcelPoints: 3, parcelAreas: 3 });
  });

  it("returns empty payload for empty input", () => {
    const result = buildMapData([], []);
    expect(result.kelompokTani).toEqual([]);
    expect(result.parcels).toEqual([]);
    expect(result.counts).toEqual({ kt: 0, parcelPoints: 0, parcelAreas: 0 });
  });
});

describe("monthlyAverageYield", () => {
  it("returns 12 zeros for no records", () => {
    const result = monthlyAverageYield([]);
    expect(result).toHaveLength(12);
    expect(result.every((v) => v === 0)).toBe(true);
  });

  it("sums records within the same period, then places them by calendar month", () => {
    const result = monthlyAverageYield([
      { period: "2025-03", yieldKg: 100 },
      { period: "2025-03", yieldKg: 50 },
    ]);
    expect(result[2]).toBe(150); // March index 2
    expect(result[0]).toBe(0);
  });

  it("averages the same calendar month across multiple years", () => {
    const result = monthlyAverageYield([
      { period: "2024-06", yieldKg: 200 },
      { period: "2025-06", yieldKg: 100 },
    ]);
    expect(result[5]).toBe(150); // (200 + 100) / 2 years
  });

  it("ignores malformed periods gracefully", () => {
    const result = monthlyAverageYield([{ period: "bad", yieldKg: 999 }]);
    expect(result.every((v) => v === 0)).toBe(true);
  });
});

describe("summarizeProduction", () => {
  it("returns empty breakdown for no records", () => {
    const result = summarizeProduction([]);
    expect(result.byYear).toEqual([]);
    expect(result.monthly).toHaveLength(12);
    expect(result.totalKg).toBe(0);
    expect(result.recordCount).toBe(0);
  });

  it("groups yield per year and month, sorts years descending, and totals each year", () => {
    const result = summarizeProduction([
      { period: "2024-06", yieldKg: 200 },
      { period: "2025-06", yieldKg: 100 },
      { period: "2025-06", yieldKg: 50 }, // same period → summed
      { period: "2025-01", yieldKg: 30 },
    ]);
    expect(result.byYear.map((y) => y.year)).toEqual([2025, 2024]);
    const y2025 = result.byYear[0];
    expect(y2025.monthly[5]).toBe(150); // June 2025 = 100 + 50
    expect(y2025.monthly[0]).toBe(30); // January 2025
    expect(y2025.total).toBe(180);
    expect(result.byYear[1].monthly[5]).toBe(200); // June 2024
    expect(result.totalKg).toBe(380);
    expect(result.recordCount).toBe(4);
  });

  it("keeps monthly as the cross-year average (same as monthlyAverageYield)", () => {
    const records = [
      { period: "2024-06", yieldKg: 200 },
      { period: "2025-06", yieldKg: 100 },
    ];
    expect(summarizeProduction(records).monthly).toEqual(monthlyAverageYield(records));
  });

  it("ignores malformed periods but still counts them in recordCount/totalKg", () => {
    const result = summarizeProduction([{ period: "bad", yieldKg: 999 }]);
    expect(result.byYear).toEqual([]);
    expect(result.recordCount).toBe(1);
    expect(result.totalKg).toBe(999);
  });
});

// Generate `count` consecutive monthly periods starting at "startYear-startMonth".
function months(startYear: number, startMonth: number, count: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const idx = startYear * 12 + (startMonth - 1) + i;
    const y = Math.floor(idx / 12);
    const m = (idx % 12) + 1;
    out.push(`${y}-${String(m).padStart(2, "0")}`);
  }
  return out;
}

describe("longestConsecutiveMonths", () => {
  it("returns 0 for an empty list", () => {
    expect(longestConsecutiveMonths([])).toBe(0);
  });

  it("returns 1 for a single period", () => {
    expect(longestConsecutiveMonths(["2025-05"])).toBe(1);
  });

  it("counts a straight run", () => {
    expect(longestConsecutiveMonths(months(2025, 1, 11))).toBe(11);
    expect(longestConsecutiveMonths(months(2025, 1, 12))).toBe(12);
  });

  it("counts only the longest run when there is a gap", () => {
    // 6 consecutive, gap, then 13 consecutive → 13
    const periods = [...months(2023, 1, 6), ...months(2024, 6, 13)];
    expect(longestConsecutiveMonths(periods)).toBe(13);
  });

  it("treats a year boundary as consecutive", () => {
    expect(longestConsecutiveMonths(["2025-12", "2026-01"])).toBe(2);
  });

  it("de-duplicates repeated periods", () => {
    expect(longestConsecutiveMonths(["2025-01", "2025-01", "2025-02"])).toBe(2);
  });

  it("is order-independent (sorts first)", () => {
    expect(longestConsecutiveMonths(["2025-03", "2025-01", "2025-02"])).toBe(3);
  });

  it("ignores unparseable periods", () => {
    expect(longestConsecutiveMonths(["bad", "2025-01", "2025-02"])).toBe(2);
  });
});

describe("productionAvailabilityCategory", () => {
  it("returns NONE for no data", () => {
    expect(productionAvailabilityCategory([])).toBe("NONE");
  });

  it("returns KURANG for 1–11 consecutive months", () => {
    expect(productionAvailabilityCategory(months(2025, 1, 1))).toBe("KURANG");
    expect(productionAvailabilityCategory(months(2025, 1, 11))).toBe("KURANG");
  });

  it("returns CUKUP for 12–24 consecutive months", () => {
    expect(productionAvailabilityCategory(months(2025, 1, 12))).toBe("CUKUP");
    expect(productionAvailabilityCategory(months(2024, 1, 24))).toBe("CUKUP");
  });

  it("returns BAIK above 24 consecutive months", () => {
    expect(productionAvailabilityCategory(months(2023, 1, 25))).toBe("BAIK");
  });
});

// BUG-007 / #127: the FarmerGroup scope `where` built by getMapData and
// getBmpMapData (map.ts) must put the access filter in `AND`, so a required
// literal `districtId` or a literal `id` can't overwrite the scope's
// `{ ...: { in } }` and leak groups outside the user's assignment. Mirror of the
// builder (real module pulls next-auth/prisma that don't resolve in vitest).
type AccessContext =
  | { mode: "ALL" }
  | { mode: "BY_FARMER_GROUP"; ids: string[] }
  | { mode: "BY_DISTRICT"; ids: string[] };

function farmerGroupAccessFilter(access: AccessContext) {
  return access.mode === "BY_FARMER_GROUP"
    ? { id: { in: access.ids } }
    : access.mode === "BY_DISTRICT"
      ? { districtId: { in: access.ids } }
      : {};
}

function mapGroupWhere(
  filters: { provinceId?: string | null; districtId?: string | null; farmerGroupId?: string | null },
  access: AccessContext
) {
  const { provinceId, districtId, farmerGroupId } = filters;
  return {
    isActive: true,
    ...(districtId ? { districtId } : {}),
    ...(farmerGroupId ? { id: farmerGroupId } : {}),
    ...(provinceId ? { district: { provinceId } } : {}),
    AND: farmerGroupAccessFilter(access),
  };
}

describe("map groupWhere scope (BUG-007)", () => {
  it("BY_DISTRICT: literal districtId dipertahankan; scope masuk AND (tak menimpa)", () => {
    const where = mapGroupWhere({ districtId: "d-outside" }, { mode: "BY_DISTRICT", ids: ["d1"] });
    expect(where.districtId).toBe("d-outside");
    expect(where.AND).toEqual({ districtId: { in: ["d1"] } });
  });

  it("BY_FARMER_GROUP: literal id dipertahankan; scope masuk AND (tak menimpa)", () => {
    const where = mapGroupWhere({ farmerGroupId: "kt-outside" }, { mode: "BY_FARMER_GROUP", ids: ["kt-1"] });
    expect(where.id).toBe("kt-outside");
    expect(where.AND).toEqual({ id: { in: ["kt-1"] } });
  });

  it("ALL: AND no-op, tanpa batasan tambahan", () => {
    const where = mapGroupWhere({ districtId: "d-x", farmerGroupId: "kt-x" }, { mode: "ALL" });
    expect(where.AND).toEqual({});
    expect(where.districtId).toBe("d-x");
    expect(where.id).toBe("kt-x");
  });
});

describe("buildBmpMapData", () => {
  // Build the productionByParcel map (period → 100 kg each) from period lists.
  const production = (parcelPeriods: Record<string, string[]>) =>
    new Map(
      Object.entries(parcelPeriods).map(([id, ps]) => [id, ps.map((period) => ({ period, kg: 100 }))])
    );

  it("categorizes each parcel and tallies counts", () => {
    const parcels = [
      parcel({ id: "pBaik" }),
      parcel({ id: "pCukup" }),
      parcel({ id: "pKurang" }),
      parcel({ id: "pNone" }),
    ];
    const result = buildBmpMapData(
      [group()],
      parcels,
      production({
        pBaik: months(2022, 1, 30),
        pCukup: months(2024, 1, 12),
        pKurang: months(2025, 1, 3),
        // pNone has no entry
      })
    );

    const byId = Object.fromEntries(result.parcels.map((p) => [p.id, p]));
    expect(byId.pBaik.category).toBe("BAIK");
    expect(byId.pCukup.category).toBe("CUKUP");
    expect(byId.pKurang.category).toBe("KURANG");
    expect(byId.pNone.category).toBe("NONE");
    expect(result.counts).toEqual({ baik: 1, cukup: 1, kurang: 1, none: 1 });
    expect(result.kt).toHaveLength(1);
  });

  it("reports streak and first/last period from the parcel's data", () => {
    const result = buildBmpMapData(
      [],
      [parcel({ id: "p1" })],
      production({ p1: ["2025-03", "2025-01", "2025-02", "2025-01"] })
    );
    const f = result.parcels[0];
    expect(f.streakMonths).toBe(3);
    expect(f.firstPeriod).toBe("2025-01");
    expect(f.lastPeriod).toBe("2025-03");
    // periods are de-duplicated and sorted (drives the availability grid).
    expect(f.periods).toEqual(["2025-01", "2025-02", "2025-03"]);
    expect(f.farmerCode).toBe("FMR-01");
    // kg summed per period — the duplicate 2025-01 (100 + 100) becomes 200.
    expect(f.production).toEqual({ "2025-01": 200, "2025-02": 100, "2025-03": 100 });
  });

  it("parcels with no attributed production fall to NONE", () => {
    const result = buildBmpMapData([], [parcel({ id: "p1" })], production({}));
    expect(result.parcels[0].category).toBe("NONE");
    expect(result.parcels[0].streakMonths).toBe(0);
    expect(result.parcels[0].firstPeriod).toBeNull();
    expect(result.counts.none).toBe(1);
  });

  it("skips parcels with null geometry without affecting counts", () => {
    const result = buildBmpMapData(
      [],
      [parcel({ id: "p1" }), parcel({ id: "p2", geometry: null })],
      production({ p1: months(2024, 1, 12) })
    );
    expect(result.parcels.map((p) => p.id)).toEqual(["p1"]);
    expect(result.counts).toEqual({ baik: 0, cukup: 1, kurang: 0, none: 0 });
    const [long, lat] = result.parcels[0].centroid;
    expect(long).toBeCloseTo(100, 5);
    expect(lat).toBeCloseTo(0, 5);
  });
});

// ── MAP-03 — produktivitas per persil ────────────────────────────────────────

describe("productivityClass", () => {
  it("null (tak terhitung) → NO_DATA", () => {
    expect(productivityClass(null)).toBe("NO_DATA");
  });

  it("batas kelas 10/15/20 Ton/Ha (batas bawah inklusif)", () => {
    expect(productivityClass(20)).toBe("TINGGI");
    expect(productivityClass(25.5)).toBe("TINGGI");
    expect(productivityClass(19.99)).toBe("SEDANG");
    expect(productivityClass(15)).toBe("SEDANG");
    expect(productivityClass(14.9)).toBe("RENDAH");
    expect(productivityClass(10)).toBe("RENDAH");
    expect(productivityClass(9.99)).toBe("SANGAT_RENDAH");
    expect(productivityClass(0)).toBe("SANGAT_RENDAH");
  });
});

describe("parcelProductivity", () => {
  const production = { "2024-01": 6_000, "2024-02": 6_000, "2025-01": 10_000, "2025-02": 14_000 };

  it("tahun terpilih: Σ kg tahun itu ÷ 1000 ÷ luas", () => {
    const r = parcelProductivity(production, 2, 2025);
    expect(r.tonHa).toBeCloseTo(12, 5); // 24.000 kg → 24 ton ÷ 2 ha
    expect(r.monthsReported).toBe(2);
    expect(r.yearsReported).toBe(1);
  });

  it("Rata-rata: rata-rata Ton/Ha tahunan antar tahun melapor", () => {
    const r = parcelProductivity(production, 2, "AVG");
    // (12.000 + 24.000) kg → 36 ton ÷ 2 tahun ÷ 2 ha = 9 Ton/Ha
    expect(r.tonHa).toBeCloseTo(9, 5);
    expect(r.yearsReported).toBe(2);
    expect(r.monthsReported).toBe(4);
  });

  it("luas null/0 → tonHa null (bulan melapor tetap dihitung)", () => {
    expect(parcelProductivity(production, null, 2025)).toEqual({
      tonHa: null,
      monthsReported: 2,
      yearsReported: 1,
    });
    expect(parcelProductivity(production, 0, "AVG").tonHa).toBeNull();
  });

  it("tahun tanpa data → tonHa null, 0 bulan melapor", () => {
    expect(parcelProductivity(production, 2, 2023)).toEqual({
      tonHa: null,
      monthsReported: 0,
      yearsReported: 0,
    });
  });

  it("tanpa produksi sama sekali → null (tahun maupun AVG)", () => {
    expect(parcelProductivity({}, 2, 2025).tonHa).toBeNull();
    expect(parcelProductivity({}, 2, "AVG").tonHa).toBeNull();
  });

  it("entri tahun typo diabaikan — AVG tak terdilusi tahun bogus", () => {
    const withTypo = { "2025-01": 24_000, "2924-05": 24_000 };
    const r = parcelProductivity(withTypo, 2, "AVG");
    expect(r.tonHa).toBeCloseTo(12, 5); // hanya 2025 dihitung: 24 ton ÷ 1 tahun ÷ 2 ha
    expect(r.yearsReported).toBe(1);
  });
});

describe("bmpProductionYears", () => {
  it("distinct tahun lintas persil, urut menurun", () => {
    const years = bmpProductionYears([
      { production: { "2023-05": 1, "2025-01": 1 } },
      { production: { "2024-12": 1, "2025-03": 1 } },
    ]);
    expect(years).toEqual([2025, 2024, 2023]);
  });

  it("tanpa produksi → []", () => {
    expect(bmpProductionYears([{ production: {} }])).toEqual([]);
  });

  it("tahun typo di luar rentang waras dibuang (tak jadi view default)", () => {
    const years = bmpProductionYears([
      { production: { "2924-05": 1, "1899-01": 1, "2025-01": 1 } },
    ]);
    expect(years).toEqual([2025]);
  });
});

describe("buildBmpProductivityView", () => {
  const parcels: Pick<BmpParcelFeature, "id" | "area" | "production">[] = [
    { id: "pTinggi", area: 1, production: { "2025-01": 25_000 } },
    { id: "pRendah", area: 1, production: { "2025-01": 12_000, "2024-06": 40_000 } },
    { id: "pNoArea", area: null, production: { "2025-01": 9_000 } },
    { id: "pNoData", area: 3, production: {} },
  ];

  it("mengklasifikasi per persil untuk tahun terpilih + tally counts + daftar tahun", () => {
    const view = buildBmpProductivityView(parcels, 2025);
    expect(view.byParcel.pTinggi.cls).toBe("TINGGI");
    expect(view.byParcel.pTinggi.tonHa).toBeCloseTo(25, 5);
    expect(view.byParcel.pRendah.cls).toBe("RENDAH"); // 12 Ton/Ha (2024 tak ikut)
    expect(view.byParcel.pNoArea.cls).toBe("NO_DATA");
    expect(view.byParcel.pNoData.cls).toBe("NO_DATA");
    expect(view.counts).toEqual({ TINGGI: 1, SEDANG: 0, RENDAH: 1, SANGAT_RENDAH: 0, NO_DATA: 2 });
    expect(view.years).toEqual([2025, 2024]);
    expect(view.view).toBe(2025);
  });

  it("mode AVG merata-rata antar tahun melapor per persil", () => {
    const view = buildBmpProductivityView(parcels, "AVG");
    // pRendah: 52.000 kg ÷ 2 tahun ÷ 1 ha = 26 Ton/Ha → TINGGI
    expect(view.byParcel.pRendah.tonHa).toBeCloseTo(26, 5);
    expect(view.byParcel.pRendah.cls).toBe("TINGGI");
    expect(view.counts.TINGGI).toBe(2);
  });
});

describe("buildBmpProductivityMatrix", () => {
  const parcels: Pick<
    BmpParcelFeature,
    "id" | "parcelId" | "farmerCode" | "farmerName" | "area" | "production"
  >[] = [
    {
      id: "p2",
      parcelId: "PCL-02",
      farmerCode: "FMR-02",
      farmerName: "Citra",
      area: 2,
      production: { "2025-01": 24_000 },
    },
    {
      id: "p1",
      parcelId: "PCL-01",
      farmerCode: "FMR-01",
      farmerName: "Budi",
      area: 1,
      production: { "2024-03": 10_000, "2025-06": 30_000 },
    },
  ];

  it("kolom tahun menaik, baris urut nama petani, nilai per tahun + rata-rata", () => {
    const m = buildBmpProductivityMatrix(parcels);
    expect(m.years).toEqual([2024, 2025]);
    expect(m.rows.map((r) => r.name)).toEqual(["Budi", "Citra"]);
    const budi = m.rows[0];
    expect(budi.tonHaByYear["2024"]).toBeCloseTo(10, 5);
    expect(budi.tonHaByYear["2025"]).toBeCloseTo(30, 5);
    expect(budi.avg).toBeCloseTo(20, 5); // 40 ton ÷ 2 tahun ÷ 1 ha
    const citra = m.rows[1];
    expect(citra.tonHaByYear["2024"]).toBeNull(); // tak melapor 2024
    expect(citra.tonHaByYear["2025"]).toBeCloseTo(12, 5);
    expect(citra.avg).toBeCloseTo(12, 5);
  });

  it("luas null → semua nilai null (baris tetap tampil)", () => {
    const m = buildBmpProductivityMatrix([{ ...parcels[0], area: null }]);
    expect(m.rows[0].tonHaByYear["2025"]).toBeNull();
    expect(m.rows[0].avg).toBeNull();
  });
});
