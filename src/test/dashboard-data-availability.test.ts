import { describe, it, expect } from "vitest";
import {
  buildAvailabilityEntry,
  filterAvailabilityGroups,
  availabilityTotals,
  availabilityScoreRows,
  topAnomalies,
  topSystemicAnomalies,
  moduleCoverageTotals,
  scoreBand,
} from "@/lib/data-availability-aggregation";
import { computeCompleteness, DOMAIN_WEIGHTS } from "@/lib/data-completeness";
import { anomalyDef, SYSTEMIC_MIN_ENTITIES } from "@/lib/data-completeness-registry";
import type { CompletenessFarmerInput, CompletenessGroupInput } from "@/types/data-completeness";
import type { AvailabilityAnomalyCount, AvailabilityGroupEntry } from "@/types/dashboard";

// ── Fixtures input DA-02 (mengikuti data-completeness.test.ts) ──────────────

function farmer(overrides: Partial<CompletenessFarmerInput> = {}): CompletenessFarmerInput {
  return {
    id: "db-1",
    farmerId: "F-001",
    name: "Petani A",
    gender: "M",
    nik: "1234567890123456",
    address: "Jl. Mawar",
    birthPlace: "Pekanbaru",
    birthDate: new Date("1990-01-01"),
    joinedYear: 2020,
    landParcels: [],
    trainingParticipants: [],
    productionRecords: [],
    ...overrides,
  };
}

const P1 = { code: "PAKET_1_BMP_PC_RSPO_NKT", name: "Paket 1 - BMP" };
const REF = { referencePeriod: "2026-09" };

function group(overrides: Partial<CompletenessGroupInput> = {}): CompletenessGroupInput {
  return {
    id: "kt-1",
    name: "KT Sukamaju",
    code: "KT001",
    abrv: "SKM",
    joinYear: 2015,
    groupType: "KOPERASI",
    establishedYear: 2010,
    rspoCertYear: null,
    rspoCertStatus: null,
    ispoCertYear: null,
    ispoCertStatus: null,
    sapMapAssuranceYear: null,
    sapMapAssuranceStatus: null,
    locationLat: 1.23,
    locationLong: 103.4,
    district: { id: "d-1", name: "Distrik A" },
    activities: [{ packageCode: P1.code, hasEvidence: true }],
    trainingPackages: [P1],
    farmers: [],
    ...overrides,
  };
}

const META = { category: "SWADAYA" as const, districtId: "d-1" };

// ── Fixture entri dashboard (untuk fungsi slicing client-side) ──────────────

const anom = (key: string, label: string, count: number, systemic = false): AvailabilityAnomalyCount => ({
  key,
  label,
  count: systemic ? 1 : count,
  entityCount: count,
  total: 10,
  systemic,
});

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
    anomalies: [anom("no-nik", "Petani tanpa NIK", 3)],
    moduleCoverage: [],
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
    const e = buildAvailabilityEntry(input, META, REF);
    expect(e.healthScore).toBe(computeCompleteness(input, REF).healthScore);
    expect(e.profileScore).toBe(computeCompleteness(input, REF).profileScore);
  });

  it("anomali dirampingkan — tanpa daftar petani (items)", () => {
    const e = buildAvailabilityEntry(group({ farmers: [farmer({ nik: null })] }), META, REF);
    expect(e.anomalies.length).toBeGreaterThan(0);
    for (const a of e.anomalies) {
      expect(a).not.toHaveProperty("items");
      expect(Object.keys(a).sort()).toEqual(["count", "entityCount", "key", "label", "systemic", "total"]);
    }
  });

  it("Σ count anomali == totalAnomalies (profil gagal ikut disintesis)", () => {
    // code null → 1 check profil gagal; petani tanpa NIK, tanpa lahan, belum
    // ikut paket, dan tanpa produksi → masing-masing 1.
    const e = buildAvailabilityEntry(
      group({ code: null, farmers: [farmer({ nik: null })] }),
      META,
      REF,
    );
    const sum = e.anomalies.reduce((s, a) => s + a.count, 0);
    expect(sum).toBe(e.totalAnomalies);
    expect(e.anomalies.find((a) => a.key === "profil-tidak-lengkap")!.count).toBe(1);
    // Terdaftar di registri (label & rute perbaikan), bukan disintesis di luar katalog (review #352).
    expect(e.anomalies.find((a) => a.key === "profil-tidak-lengkap")!.label).toBe(anomalyDef("profil-tidak-lengkap").label);
    expect(anomalyDef("profil-tidak-lengkap").fix.href).toBe("/admin/master-data/groups");
  });

  it("check kualitas profil gagal → satu anomali per check di payload; Σ count == totalAnomalies", () => {
    const e = buildAvailabilityEntry(group({ rspoCertYear: 2024, joinYear: 2005, establishedYear: 2010 }), META, REF);
    expect(e.anomalies.map((a) => a.key)).toEqual(
      expect.arrayContaining(["sertifikasi-tidak-konsisten", "tahun-bergabung-sebelum-berdiri"]),
    );
    expect(e.anomalies.find((a) => a.key === "profil-tidak-lengkap")).toBeUndefined();
    expect(e.profileScore).toBe(100);
    expect(e.anomalies.reduce((s, a) => s + a.count, 0)).toBe(e.totalAnomalies);
  });

  it("Σ count tetap == totalAnomalies saat ada anomali sistemik (#352 A3)", () => {
    const farmers = Array.from({ length: SYSTEMIC_MIN_ENTITIES }, (_, i) =>
      farmer({ id: `f${i}`, farmerId: `F-${i}`, nik: null }),
    );
    const e = buildAvailabilityEntry(group({ farmers }), META, REF);
    const noNik = e.anomalies.find((a) => a.key === "no-nik")!;
    expect(noNik.systemic).toBe(true);
    expect(noNik.count).toBe(1);
    expect(noNik.entityCount).toBe(SYSTEMIC_MIN_ENTITIES);
    expect(e.anomalies.reduce((s, a) => s + a.count, 0)).toBe(e.totalAnomalies);
  });

  it("profil lengkap → tidak ada anomali profil-tidak-lengkap", () => {
    const e = buildAvailabilityEntry(group(), META, REF);
    expect(e.anomalies.find((a) => a.key === "profil-tidak-lengkap")).toBeUndefined();
  });

  it("menghitung extras: persil, kegiatan, petani ber-produksi", () => {
    const parcel = {
      id: "lp-1",
      parcelId: "P-1",
      geometry: {},
      area: 1.5,
      plantingYear: 2018,
      cropType: "Palm Oil",
      landStatus: "Owned",
      subGroupLv2: "KT A",
      blok: "A",
      isPsr: false,
    };
    const e = buildAvailabilityEntry(
      group({
        activities: [{ packageCode: P1.code, hasEvidence: true }, { packageCode: P1.code, hasEvidence: false }],
        farmers: [
          farmer({
            landParcels: [parcel, { ...parcel, id: "lp-2", parcelId: "P-2" }],
            productionRecords: [{ id: "r1", parcelId: null, period: "2026-09", yieldKg: 10, isEstimate: false }],
          }),
          farmer({ id: "db-2", farmerId: "F-002", nik: "2222222222222222" }),
        ],
      }),
      META,
      REF,
    );
    expect(e.totalParcels).toBe(2);
    expect(e.activityCount).toBe(2);
    expect(e.farmersWithProduction).toBe(1);
    expect(e.totalFarmers).toBe(2);
  });

  it("meneruskan kategori & distrik dari meta", () => {
    const e = buildAvailabilityEntry(group(), { category: "EX_PLASMA", districtId: "d-9" }, REF);
    expect(e.category).toBe("EX_PLASMA");
    expect(e.districtId).toBe("d-9");
  });

  it("Lembaga tanpa petani → skor terdefinisi, tanpa NaN", () => {
    const e = buildAvailabilityEntry(group({ farmers: [] }), META, REF);
    expect(Number.isFinite(e.healthScore)).toBe(true);
    for (const v of Object.values(e.domainScores)) expect(Number.isFinite(v)).toBe(true);
  });

  it("cakupan modul dirampingkan ke {key, covered, total, pct} (#352 A1)", () => {
    const modules = { boundary: true, benchmark: false, bmpGroupAssessment: false };
    const e = buildAvailabilityEntry(group({ modules }), META, REF);
    expect(e.moduleCoverage.length).toBeGreaterThan(0);
    for (const m of e.moduleCoverage) expect(Object.keys(m).sort()).toEqual(["covered", "key", "pct", "total"]);
    expect(e.moduleCoverage.find((m) => m.key === "boundary-ics")!.pct).toBe(100);
    // Tanpa flag modul → kosong (kartu KPI Detail Lembaga tak memuat satelit).
    expect(buildAvailabilityEntry(group(), META, REF).moduleCoverage).toEqual([]);
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
  it("filter Lembaga (#352 B3) mempersempit ke satu entri", () => {
    expect(filterAvailabilityGroups(data, { groupId: "g2" }).map((g) => g.id)).toEqual(["g2"]);
    expect(filterAvailabilityGroups(data, { groupId: "g2", districtId: "d1" })).toHaveLength(0);
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
  it("merge count per key lintas Lembaga + hitung Lembaga terdampak, urut Lembaga terbanyak dulu", () => {
    const r = topAnomalies([
      entry({ name: "Alpha", anomalies: [anom("no-nik", "Petani tanpa NIK", 3)] }),
      entry({ id: "g2", name: "Beta", anomalies: [anom("no-nik", "Petani tanpa NIK", 2)] }),
      entry({ id: "g3", anomalies: [anom("persil-tanpa-geometry", "Persil tanpa geometry", 4)] }),
    ]);
    const noNik = r.find((a) => a.key === "no-nik")!;
    expect(noNik.count).toBe(5);
    expect(noNik.groupsAffected).toBe(2);
    expect(noNik.groups.map((g) => g.id)).toEqual(["g1", "g2"]); // 3 > 2 → deep link ke Alpha
    expect(r[0].key).toBe("no-nik"); // 5 > 4
  });

  it("key dinamis belum-paket-* ikut ter-merge", () => {
    const a = anom(`belum-paket-${P1.code}`, "Belum ikut Paket 1 - BMP", 1);
    const r = topAnomalies([entry({ anomalies: [a] }), entry({ id: "g2", anomalies: [a] })]);
    expect(r[0].count).toBe(2);
    expect(r[0].groupsAffected).toBe(2);
  });

  it("dibatasi n teratas", () => {
    const many = entry({
      anomalies: Array.from({ length: 15 }, (_, i) => anom(`k${i}`, `Anomali ${i}`, i + 1)),
    });
    const r = topAnomalies([many], 10);
    expect(r).toHaveLength(10);
    expect(r[0].count).toBe(15);
  });

  it("#352 A3: sistemik dipisah — per entitas vs kolom belum pernah diisi; Σ keduanya = Σ totalAnomalies", () => {
    const entries = [
      entry({
        totalAnomalies: 1 + 3,
        anomalies: [anom("persil-tanpa-status", "Persil tanpa status lahan", 2192, true), anom("no-nik", "Petani tanpa NIK", 3)],
      }),
      entry({
        id: "g2",
        name: "Beta",
        totalAnomalies: 1 + 2,
        anomalies: [anom("persil-tanpa-status", "Persil tanpa status lahan", 500, true), anom("no-nik", "Petani tanpa NIK", 2)],
      }),
    ];
    const perEntity = topAnomalies(entries);
    const systemic = topSystemicAnomalies(entries);
    expect(perEntity.map((a) => a.key)).toEqual(["no-nik"]);
    expect(systemic.map((a) => a.key)).toEqual(["persil-tanpa-status"]);
    expect(systemic[0].count).toBe(2692); // Σ entitas, bukan Σ temuan
    expect(systemic[0].groupsAffected).toBe(2);
    expect(systemic[0].groups[0].id).toBe("g1"); // 2192 > 500
    const sumFindings =
      perEntity.reduce((s, a) => s + a.count, 0) + systemic.reduce((s, a) => s + a.groupsAffected, 0);
    expect(sumFindings).toBe(entries.reduce((s, e) => s + e.totalAnomalies, 0));
  });
});

describe("moduleCoverageTotals (#352 A1)", () => {
  it("hanya Lembaga yang modulnya berlaku masuk penyebut; semua tak berlaku → null", () => {
    const r = moduleCoverageTotals([
      entry({ moduleCoverage: [{ key: "surat-tanah", covered: 5, total: 10, pct: 50 }, { key: "nkt", covered: 0, total: 10, pct: null }] }),
      entry({ id: "g2", moduleCoverage: [{ key: "surat-tanah", covered: 0, total: 30, pct: null }, { key: "nkt", covered: 0, total: 5, pct: null }] }),
    ]);
    const surat = r.find((m) => m.key === "surat-tanah")!;
    expect(surat).toMatchObject({ covered: 5, total: 10, pct: 50, groupsApplicable: 1 });
    expect(r.find((m) => m.key === "nkt")!.pct).toBeNull();
  });
});
