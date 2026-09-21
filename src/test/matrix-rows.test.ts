import { describe, expect, it } from "vitest";
import { filterMatrixRows, LOWEST_N, sortKeyLabel, sortMatrixRows } from "@/app/(admin)/admin/data-analyst/data-availability/matrix-rows";
import { BAND_LABEL, bandLabel } from "@/lib/score-band-styles";
import { BAND_THRESHOLDS, scoreBand, shortDomainLabel } from "@/lib/data-availability-aggregation";
import type { AvailabilityGroupEntry } from "@/types/dashboard";

/** Urut & cari baris DA-03 — satu sumber untuk heatmap dan radar (#352 putaran 4). */
function entry(overrides: Partial<AvailabilityGroupEntry> = {}): AvailabilityGroupEntry {
  return {
    id: "g1",
    name: "Lembaga Alpha",
    code: "ISH-1408-01",
    category: "SWADAYA",
    districtId: "d1",
    districtName: "Siak",
    totalFarmers: 10,
    totalParcels: 5,
    activityCount: 2,
    farmersWithProduction: 4,
    healthScore: 70,
    profileScore: 75,
    domainScores: { petani: 80, lahan: 60, pelatihan: 50, produksi: 40 },
    totalAnomalies: 3,
    anomalies: [],
    moduleCoverage: [],
    ...overrides,
  };
}

const rows = [
  entry({ id: "a", name: "Beta", code: "ISH-1401-02", districtName: "Kampar", totalFarmers: 300, healthScore: 51, domainScores: { petani: 62, lahan: 60, pelatihan: 54, produksi: 0 } }),
  entry({ id: "b", name: "alpha", code: "ISH-1408-07", districtName: "Siak", totalFarmers: 20, healthScore: 88, profileScore: 100, domainScores: { petani: 90, lahan: 80, pelatihan: 85, produksi: 90 } }),
  entry({ id: "c", name: "Gamma", code: "ISH-1406-10", districtName: "Rokan Hulu", totalFarmers: 0, healthScore: 8, profileScore: 83, domainScores: { petani: 0, lahan: 0, pelatihan: 0, produksi: 0 } }),
];

describe("filterMatrixRows", () => {
  it("kosong/spasi → semua baris; cocok nama, kode, distrik tanpa peduli huruf besar", () => {
    expect(filterMatrixRows(rows, "  ")).toHaveLength(3);
    expect(filterMatrixRows(rows, "ALPHA").map((r) => r.id)).toEqual(["b"]);
    expect(filterMatrixRows(rows, "1401").map((r) => r.id)).toEqual(["a"]);
    expect(filterMatrixRows(rows, "rokan").map((r) => r.id)).toEqual(["c"]);
    expect(filterMatrixRows(rows, "zzz")).toHaveLength(0);
  });
});

describe("sortMatrixRows", () => {
  it("Skor Total menaik = yang paling tertinggal dulu; menurun = kebalikannya; tidak memutasi input", () => {
    const asc = sortMatrixRows(rows, "health", true).map((r) => r.id);
    expect(asc).toEqual(["c", "a", "b"]);
    expect(sortMatrixRows(rows, "health", false).map((r) => r.id)).toEqual(["b", "a", "c"]);
    expect(rows.map((r) => r.id)).toEqual(["a", "b", "c"]);
  });

  it("nama tanpa peduli huruf besar (localeCompare)", () => {
    expect(sortMatrixRows(rows, "name", true).map((r) => r.name)).toEqual(["alpha", "Beta", "Gamma"]);
  });

  it("jumlah petani & domain (profil memakai profileScore)", () => {
    expect(sortMatrixRows(rows, "totalFarmers", true).map((r) => r.id)).toEqual(["c", "b", "a"]);
    expect(sortMatrixRows(rows, "profil", true).map((r) => r.id)).toEqual(["a", "c", "b"]);
    expect(sortMatrixRows(rows, "produksi", false).map((r) => r.id)).toEqual(["b", "a", "c"]);
  });
});

describe("sortKeyLabel & shortDomainLabel", () => {
  it("label urut untuk teks Ringkas; label domain pendek satu sumber", () => {
    expect(sortKeyLabel("health")).toBe("skor total");
    expect(sortKeyLabel("name")).toBe("nama");
    expect(sortKeyLabel("totalFarmers")).toBe("jumlah petani");
    expect(sortKeyLabel("profil")).toBe("profil lembaga");
    expect(shortDomainLabel("profil")).toBe("Profil");
    expect(shortDomainLabel("pelatihan")).toBe("Pelatihan");
    expect(LOWEST_N).toBe(10);
  });
});

describe("band: ambang & label satu sumber", () => {
  it("BAND_THRESHOLDS = batas scoreBand; bandLabel(score) = BAND_LABEL[scoreBand]", () => {
    expect(scoreBand(BAND_THRESHOLDS.warn)).toBe("warn");
    expect(scoreBand(BAND_THRESHOLDS.warn - 0.1)).toBe("bad");
    expect(scoreBand(BAND_THRESHOLDS.good)).toBe("good");
    expect(scoreBand(BAND_THRESHOLDS.full)).toBe("full");
    expect(bandLabel(51)).toBe(BAND_LABEL.warn);
    expect(bandLabel(100)).toBe("100 — lengkap penuh");
    expect(bandLabel(8)).toBe("<50 — kritis");
  });
});
