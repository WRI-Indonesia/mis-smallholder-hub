import { describe, it, expect } from "vitest";
import {
  buildAvailabilityEntry,
  filterAvailabilityGroups,
  availabilityTotals,
  availabilityScoreRows,
  topAnomalies,
  scoreBand,
} from "@/lib/data-availability-aggregation";
import { computeCompleteness, DOMAIN_WEIGHTS } from "@/lib/data-completeness";
import type { CompletenessFarmerInput, CompletenessGroupInput } from "@/types/data-completeness";
import type { AvailabilityGroupEntry } from "@/types/dashboard";

// ── Fixtures input DA-02 (mengikuti data-completeness.test.ts) ──────────────

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

const P1 = { code: "PAKET_1_BMP_PC_RSPO_NKT", name: "Paket 1 - BMP" };

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
    activities: [{ packageCode: P1.code }],
    trainingPackages: [P1],
    farmers: [],
    ...overrides,
  };
}

const META = { category: "SWADAYA" as const, districtId: "d-1" };

// ── Fixture entri dashboard (untuk fungsi slicing client-side) ──────────────

function entry(overrides: Partial<AvailabilityGroupEntry> = {}): AvailabilityGroupEntry {
  return {
    id: "g1",
    name: "Lembaga Alpha",
    code: "A1",
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
    anomalies: [{ key: "no-nik", label: "Petani tanpa NIK", count: 3 }],
    ...overrides,
  };
}

describe("scoreBand", () => {
  it("batas band: 100 full, 80–99.9 good, 50–79.9 warn, <50 bad", () => {
    expect(scoreBand(100)).toBe("full");
    expect(scoreBand(99.9)).toBe("good");
    expect(scoreBand(80)).toBe("good");
    expect(scoreBand(79.9)).toBe("warn");
    expect(scoreBand(50)).toBe("warn");
    expect(scoreBand(49.9)).toBe("bad");
    expect(scoreBand(0)).toBe("bad");
  });
});

describe("buildAvailabilityEntry", () => {
  it("healthScore identik dengan computeCompleteness DA-02", () => {
    const input = group({
      farmers: [farmer({ nik: null }), farmer({ id: "db-2", farmerId: "F-002" })],
    });
    const e = buildAvailabilityEntry(input, META);
    expect(e.healthScore).toBe(computeCompleteness(input).healthScore);
    expect(e.profileScore).toBe(computeCompleteness(input).profileScore);
  });

  it("anomali dirampingkan — tanpa daftar petani (items)", () => {
    const e = buildAvailabilityEntry(group({ farmers: [farmer({ nik: null })] }), META);
    expect(e.anomalies.length).toBeGreaterThan(0);
    for (const a of e.anomalies) {
      expect(a).not.toHaveProperty("items");
      expect(Object.keys(a).sort()).toEqual(["count", "key", "label"]);
    }
  });

  it("Σ count anomali == totalAnomalies (profil gagal ikut disintesis)", () => {
    // code null → 1 check profil gagal; petani tanpa NIK, tanpa lahan, belum
    // ikut paket, dan tanpa produksi → masing-masing 1.
    const e = buildAvailabilityEntry(
      group({ code: null, farmers: [farmer({ nik: null })] }),
      META,
    );
    const sum = e.anomalies.reduce((s, a) => s + a.count, 0);
    expect(sum).toBe(e.totalAnomalies);
    expect(e.anomalies.find((a) => a.key === "profil-tidak-lengkap")!.count).toBe(1);
  });

  it("profil lengkap → tidak ada anomali profil-tidak-lengkap", () => {
    const e = buildAvailabilityEntry(group(), META);
    expect(e.anomalies.find((a) => a.key === "profil-tidak-lengkap")).toBeUndefined();
  });

  it("menghitung extras: persil, kegiatan, petani ber-produksi", () => {
    const parcel = {
      parcelId: "P-1",
      geometry: {},
      area: 1.5,
      plantingYear: 2018,
      cropType: "Palm Oil",
      landStatus: "Owned",
    };
    const e = buildAvailabilityEntry(
      group({
        activities: [{ packageCode: P1.code }, { packageCode: P1.code }],
        farmers: [
          farmer({ landParcels: [parcel, { ...parcel, parcelId: "P-2" }], productionRecords: [{ id: "r1", parcelId: null }] }),
          farmer({ id: "db-2", farmerId: "F-002", nik: "2222222222222222" }),
        ],
      }),
      META,
    );
    expect(e.totalParcels).toBe(2);
    expect(e.activityCount).toBe(2);
    expect(e.farmersWithProduction).toBe(1);
    expect(e.totalFarmers).toBe(2);
  });

  it("meneruskan kategori & distrik dari meta", () => {
    const e = buildAvailabilityEntry(group(), { category: "EX_PLASMA", districtId: "d-9" });
    expect(e.category).toBe("EX_PLASMA");
    expect(e.districtId).toBe("d-9");
  });

  it("Lembaga tanpa petani → skor terdefinisi, tanpa NaN", () => {
    const e = buildAvailabilityEntry(group({ farmers: [] }), META);
    expect(Number.isFinite(e.healthScore)).toBe(true);
    for (const v of Object.values(e.domainScores)) expect(Number.isFinite(v)).toBe(true);
  });
});

describe("filterAvailabilityGroups", () => {
  const data = {
    groups: [
      entry({ id: "g1", districtId: "d1", category: "SWADAYA" }),
      entry({ id: "g2", districtId: "d2", category: "EX_PLASMA" }),
      entry({ id: "g3", districtId: "d1", category: "EX_PLASMA" }),
    ],
  };

  it("tanpa filter mengembalikan semua", () => {
    expect(filterAvailabilityGroups(data, {})).toHaveLength(3);
  });
  it("filter distrik + kategori digabung AND", () => {
    const r = filterAvailabilityGroups(data, { districtId: "d1", category: "EX_PLASMA" });
    expect(r.map((g) => g.id)).toEqual(["g3"]);
  });
});

describe("availabilityTotals", () => {
  it("skor domain tertimbang jumlah petani, bukan rata-rata Lembaga", () => {
    const totals = availabilityTotals([
      entry({ totalFarmers: 10, domainScores: { petani: 100, lahan: 100, pelatihan: 100, produksi: 100 } }),
      entry({ id: "g2", totalFarmers: 90, domainScores: { petani: 0, lahan: 0, pelatihan: 0, produksi: 0 } }),
    ]);
    // 10 petani skor 100 + 90 petani skor 0 → 10, bukan 50 (rata-rata sederhana).
    expect(totals.domainScores.petani).toBe(10);
    expect(totals.domainScores.produksi).toBe(10);
  });

  it("profil rata-rata sederhana per Lembaga (tak tergantung ukuran)", () => {
    const totals = availabilityTotals([
      entry({ totalFarmers: 1, profileScore: 100 }),
      entry({ id: "g2", totalFarmers: 999, profileScore: 0 }),
    ]);
    expect(totals.domainScores.profil).toBe(50);
  });

  it("overallScore = DOMAIN_WEIGHTS atas skor portfolio", () => {
    const totals = availabilityTotals([entry()]);
    const expected = Math.round(
      DOMAIN_WEIGHTS.profil * 75 +
        DOMAIN_WEIGHTS.petani * 80 +
        DOMAIN_WEIGHTS.lahan * 60 +
        DOMAIN_WEIGHTS.pelatihan * 50 +
        DOMAIN_WEIGHTS.produksi * 40,
    );
    expect(totals.overallScore).toBe(expected);
  });

  it("Σ petani = 0 → jatuh ke rata-rata sederhana, tanpa NaN", () => {
    const totals = availabilityTotals([
      entry({ totalFarmers: 0, domainScores: { petani: 100, lahan: 100, pelatihan: 100, produksi: 100 } }),
      entry({ id: "g2", totalFarmers: 0, domainScores: { petani: 50, lahan: 50, pelatihan: 50, produksi: 50 } }),
    ]);
    expect(totals.domainScores.petani).toBe(75);
    expect(Number.isFinite(totals.overallScore)).toBe(true);
  });

  it("irisan kosong → semua nol", () => {
    const totals = availabilityTotals([]);
    expect(totals.totalGroups).toBe(0);
    expect(totals.overallScore).toBe(0);
    for (const v of Object.values(totals.domainScores)) expect(v).toBe(0);
  });

  it("menjumlah entitas lintas Lembaga", () => {
    const totals = availabilityTotals([entry(), entry({ id: "g2" })]);
    expect(totals.totalGroups).toBe(2);
    expect(totals.totalFarmers).toBe(20);
    expect(totals.totalParcels).toBe(10);
    expect(totals.totalActivities).toBe(4);
    expect(totals.farmersWithProduction).toBe(8);
    expect(totals.totalAnomalies).toBe(6);
  });
});

describe("availabilityScoreRows", () => {
  it("urut skor terendah dulu, seri diurut nama", () => {
    const rows = availabilityScoreRows([
      entry({ id: "a", name: "Zebra", healthScore: 40 }),
      entry({ id: "b", name: "Alpha", healthScore: 90 }),
      entry({ id: "c", name: "Beta", healthScore: 40 }),
    ]);
    expect(rows.map((r) => r.id)).toEqual(["c", "a", "b"]);
  });

  it("tidak memutasi array asal", () => {
    const src = [entry({ healthScore: 90 }), entry({ id: "g2", healthScore: 10 })];
    availabilityScoreRows(src);
    expect(src[0].healthScore).toBe(90);
  });
});

describe("topAnomalies", () => {
  it("merge count per key lintas Lembaga + hitung Lembaga terdampak", () => {
    const r = topAnomalies([
      entry({ anomalies: [{ key: "no-nik", label: "Petani tanpa NIK", count: 3 }] }),
      entry({ id: "g2", anomalies: [{ key: "no-nik", label: "Petani tanpa NIK", count: 2 }] }),
      entry({ id: "g3", anomalies: [{ key: "persil-tanpa-geometry", label: "Persil tanpa geometry", count: 4 }] }),
    ]);
    const noNik = r.find((a) => a.key === "no-nik")!;
    expect(noNik.count).toBe(5);
    expect(noNik.groupsAffected).toBe(2);
    expect(r[0].key).toBe("no-nik"); // 5 > 4
  });

  it("key dinamis belum-paket-* ikut ter-merge", () => {
    const a = { key: `belum-paket-${P1.code}`, label: "Belum ikut Paket 1 - BMP", count: 1 };
    const r = topAnomalies([entry({ anomalies: [a] }), entry({ id: "g2", anomalies: [a] })]);
    expect(r[0].count).toBe(2);
    expect(r[0].groupsAffected).toBe(2);
  });

  it("dibatasi n teratas", () => {
    const many = entry({
      anomalies: Array.from({ length: 15 }, (_, i) => ({
        key: `k${i}`,
        label: `Anomali ${i}`,
        count: i + 1,
      })),
    });
    const r = topAnomalies([many], 10);
    expect(r).toHaveLength(10);
    expect(r[0].count).toBe(15);
  });
});
