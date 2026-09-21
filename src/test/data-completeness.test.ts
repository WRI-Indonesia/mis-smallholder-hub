import { describe, it, expect } from "vitest";
import {
  birthDateParts,
  computeByKelompokTani,
  computeCompleteness,
  computeModuleCoverage,
  computePetaniDomain,
  computeLahanDomain,
  computePelatihanDomain,
  computePriorities,
  computeProduksiDomain,
  computeProfileChecks,
  monthsBetween,
  nikBirthParts,
  NIK_REGEX,
} from "@/lib/data-completeness";
import {
  ANOMALY_CATALOG,
  anomalyDef,
  CORE_WEIGHT,
  FIELD_TIER_WEIGHT,
  MODULE_CATALOG,
  PARCEL_CHECKS,
  PARCEL_CHECK_WEIGHT_TOTAL,
  PRODUCTION_STALE_MONTHS,
  SYSTEMIC_MIN_ENTITIES,
  SYSTEMIC_THRESHOLD,
} from "@/lib/data-completeness-registry";
import type {
  CompletenessFarmerInput,
  CompletenessGroupInput,
  CompletenessParcelInput,
  GroupModuleFlags,
  ParcelModuleFlags,
} from "@/types/data-completeness";

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

const validParcel: CompletenessParcelInput = {
  id: "lp-1",
  parcelId: "P-1",
  geometry: { type: "Polygon" },
  area: 1.5,
  plantingYear: 2018,
  cropType: "Palm Oil",
  landStatus: "Owned",
  subGroupLv2: "KT Mawar",
  blok: "A1",
  isPsr: false,
};

// Periode acuan tetap agar check kebaruan produksi deterministik.
const REF = "2026-09";
const freshRecord = (id = "pr-1", parcelId: string | null = "lp-1") => ({
  id,
  parcelId,
  period: REF,
  yieldKg: 100,
  isEstimate: false,
});

const P1 = { code: "PAKET_1_BMP_PC_RSPO_NKT", name: "Paket 1 - BMP" };
const P2 = { code: "PAKET_2_MK", name: "Paket 2 - MK" };

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

const ALL_PARCEL_MODULES: ParcelModuleFlags = {
  document: true,
  stdbIssued: true,
  externalId: true,
  nkt: true,
  border: true,
  marker: true,
  tree: true,
  program: true,
};
const NO_PARCEL_MODULES: ParcelModuleFlags = {
  document: false,
  stdbIssued: false,
  externalId: false,
  nkt: false,
  border: false,
  marker: false,
  tree: false,
  program: false,
};
const GROUP_MODULES: GroupModuleFlags = {
  boundary: true,
  benchmark: false,
  bmpGroupAssessment: true,
};

describe("NIK_REGEX", () => {
  it("accepts exactly 16 digits", () => {
    expect(NIK_REGEX.test("1234567890123456")).toBe(true);
  });
  it("rejects non-16-digit / non-numeric", () => {
    expect(NIK_REGEX.test("123")).toBe(false);
    expect(NIK_REGEX.test("12345678901234567")).toBe(false);
    expect(NIK_REGEX.test("12345678901234ab")).toBe(false);
  });
});

describe("computeProfileChecks", () => {
  it("marks all complete for a fully filled group", () => {
    const checks = computeProfileChecks(group());
    expect(checks.every((c) => c.complete)).toBe(true);
    expect(checks.filter((c) => c.kind === "inti").map((c) => c.key)).toEqual([
      "code",
      "coordinates",
      "join-year",
      "abrv",
      "group-type",
      "established-year",
    ]);
    // Check kualitas profil ikut (yang bisa dinilai); koordinat-di-luar-distrik butuh flag boundary.
    expect(checks.filter((c) => c.kind === "kualitas").map((c) => c.key)).toEqual([
      "sertifikasi-tidak-konsisten",
      "tahun-bergabung-sebelum-berdiri",
    ]);
  });
  it("#352 putaran 2: kualitas profil — sertifikasi tak konsisten, bergabung sebelum berdiri, koordinat di luar kabupaten", () => {
    const g = group({
      rspoCertYear: 2024,
      rspoCertStatus: null,
      joinYear: 2005,
      establishedYear: 2010,
      modules: { boundary: true, benchmark: true, bmpGroupAssessment: false, coordinateOutsideDistrict: true },
    });
    const checks = computeProfileChecks(g);
    expect(checks.find((c) => c.key === "sertifikasi-tidak-konsisten")).toMatchObject({ complete: false, value: "RSPO: tahun 2024, status kosong" });
    // Status TANPA tahun sah (#160/#169) — bukan anomali.
    expect(computeProfileChecks(group({ ispoCertStatus: "CERTIFIED", ispoCertYear: null })).find((c) => c.key === "sertifikasi-tidak-konsisten")!.complete).toBe(true);
    expect(checks.find((c) => c.key === "tahun-bergabung-sebelum-berdiri")!.complete).toBe(false);
    expect(checks.find((c) => c.key === "koordinat-di-luar-distrik")!.complete).toBe(false);
    // Skor profil hanya dari check inti — tetap 100 walau 3 check kualitas gagal; temuan +3.
    const r = computeCompleteness(g, { referencePeriod: REF });
    expect(r.profileScore).toBe(100);
    expect(r.totalAnomalies).toBe(3);
  });
  it("flags missing coordinates and code", () => {
    const checks = computeProfileChecks(group({ code: null, locationLat: null }));
    expect(checks.find((c) => c.key === "code")!.complete).toBe(false);
    expect(checks.find((c) => c.key === "coordinates")!.complete).toBe(false);
  });
  it("#352: tipe grup & tahun berdiri ikut dinilai, tiap check membawa rute perbaikan", () => {
    const checks = computeProfileChecks(group({ groupType: null, establishedYear: null }));
    expect(checks.find((c) => c.key === "group-type")!.complete).toBe(false);
    expect(checks.find((c) => c.key === "established-year")!.complete).toBe(false);
    for (const c of checks) expect(c.fix.menu).toContain("Lembaga Petani");
  });
});

describe("computePetaniDomain", () => {
  it("flags missing NIK", () => {
    const d = computePetaniDomain([farmer({ nik: null })]);
    expect(d.anomalies.find((a) => a.key === "no-nik")!.count).toBe(1);
  });
  it("flags invalid NIK", () => {
    const d = computePetaniDomain([farmer({ nik: "123" })]);
    expect(d.anomalies.find((a) => a.key === "invalid-nik")!.count).toBe(1);
  });
  it("flags duplicate NIK within the group", () => {
    const d = computePetaniDomain([
      farmer({ id: "a", farmerId: "F-001", nik: "1111111111111111" }),
      farmer({ id: "b", farmerId: "F-002", nik: "1111111111111111" }),
    ]);
    expect(d.anomalies.find((a) => a.key === "dup-nik")!.count).toBe(2);
  });
  it("flags duplicate farmerId within the group", () => {
    const d = computePetaniDomain([
      farmer({ id: "a", farmerId: "F-DUP", nik: "1111111111111111" }),
      farmer({ id: "b", farmerId: "F-DUP", nik: "2222222222222222" }),
    ]);
    expect(d.anomalies.find((a) => a.key === "dup-farmer-id")!.count).toBe(2);
  });
  it("flags missing address / birthDate / joinedYear", () => {
    const d = computePetaniDomain([farmer({ address: null, birthDate: null, joinedYear: null })]);
    expect(d.anomalies.find((a) => a.key === "no-address")!.count).toBe(1);
    expect(d.anomalies.find((a) => a.key === "no-birth-date")!.count).toBe(1);
    expect(d.anomalies.find((a) => a.key === "no-joined-year")!.count).toBe(1);
  });
  it("scores 100 when all farmers are complete", () => {
    const d = computePetaniDomain([farmer(), farmer({ id: "db-2", farmerId: "F-002", name: "Petani B", nik: "2222222222222222" })]);
    expect(d.score).toBe(100);
    expect(d.anomalies).toHaveLength(0);
  });
  it("skor graded: field yang terisi tetap dihargai (#193)", () => {
    // NIK & alamat kosong, tapi 4 check lain lolos (ID unik, tgl lahir, tempat
    // lahir, tahun bergabung) → 4/6, bukan 0% (formula lama all-or-nothing).
    const d = computePetaniDomain([farmer({ nik: null, address: null })]);
    expect(d.score).toBeCloseTo((4 / 6) * 100, 6);
    expect(d.cards.find((c) => c.label === "Petani dengan Anomali")!.value).toBe(1);
  });
  it("skor graded: NIK duplikat menggagalkan check NIK kedua petani", () => {
    const d = computePetaniDomain([
      farmer({ id: "a", farmerId: "F-001", nik: "1111111111111111" }),
      farmer({ id: "b", farmerId: "F-002", nik: "1111111111111111" }),
    ]);
    // 5/6 check lolos per petani (NIK gagal karena duplikat).
    expect(d.score).toBeCloseTo((5 / 6) * 100, 6);
  });
  it("#352: tempat lahir kosong → anomali no-birth-place + check ke-6", () => {
    const d = computePetaniDomain([farmer({ birthPlace: "  " })]);
    expect(d.anomalies.find((a) => a.key === "no-birth-place")!.count).toBe(1);
    expect(d.score).toBeCloseTo((5 / 6) * 100, 6);
  });
});

describe("computeLahanDomain", () => {
  it("flags farmers with zero active parcels", () => {
    const d = computeLahanDomain([farmer({ landParcels: [] })]);
    expect(d.anomalies.find((a) => a.key === "petani-tanpa-lahan")!.count).toBe(1);
  });
  it("flags parcel-level missing fields", () => {
    const d = computeLahanDomain([
      farmer({
        landParcels: [
          { ...validParcel, geometry: null, area: 0, plantingYear: null, cropType: null, landStatus: null, subGroupLv2: null, blok: null },
        ],
      }),
    ]);
    expect(d.anomalies.find((a) => a.key === "persil-tanpa-geometry")!.count).toBe(1);
    expect(d.anomalies.find((a) => a.key === "persil-tanpa-luas")!.count).toBe(1);
    expect(d.anomalies.find((a) => a.key === "persil-tanpa-tahun-tanam")!.count).toBe(1);
    expect(d.anomalies.find((a) => a.key === "persil-tanpa-jenis-tanaman")!.count).toBe(1);
    expect(d.anomalies.find((a) => a.key === "persil-tanpa-kelompok-tani")!.count).toBe(1);
    expect(d.anomalies.find((a) => a.key === "persil-tanpa-blok")!.count).toBe(1);
    expect(d.score).toBe(0);
  });
  it("scores 100 for a fully valid parcel", () => {
    const d = computeLahanDomain([farmer({ landParcels: [validParcel] })]);
    expect(d.score).toBe(100);
  });
  it("skor graded: atribut persil yang terisi tetap dihargai (#193)", () => {
    // Geometry & luas kosong (bobot 3 masing-masing) dari total bobot 15 → 60%, bukan 0%.
    const d = computeLahanDomain([
      farmer({ landParcels: [{ ...validParcel, geometry: null, area: null }] }),
    ]);
    expect(PARCEL_CHECK_WEIGHT_TOTAL).toBe(15);
    expect(d.score).toBe(60);
    // Rata-rata lintas persil: persil lengkap (100%) + persil 60% → 80%.
    const d2 = computeLahanDomain([
      farmer({
        landParcels: [validParcel, { ...validParcel, id: "lp-2", parcelId: "P-2", geometry: null, area: null }],
      }),
    ]);
    expect(d2.score).toBe(80);
  });
  it("#352 P2: tahun tanam, status lahan, blok berbobot 1/3 — persil tanpa ketiganya tetap 80%", () => {
    expect(FIELD_TIER_WEIGHT * 3).toBe(CORE_WEIGHT);
    const tier = PARCEL_CHECKS.filter((c) => c.weight === FIELD_TIER_WEIGHT).map((c) => c.anomalyKey);
    expect(tier).toEqual(["persil-tanpa-tahun-tanam", "persil-tanpa-status", "persil-tanpa-blok"]);
    const d = computeLahanDomain([
      farmer({ landParcels: [{ ...validParcel, plantingYear: null, landStatus: null, blok: null }] }),
    ]);
    expect(d.score).toBe(80);
    // Kelompok Tani berbobot penuh: tanpa KT saja → 80% juga.
    const d2 = computeLahanDomain([farmer({ landParcels: [{ ...validParcel, subGroupLv2: null }] })]);
    expect(d2.score).toBe(80);
  });
  it("#352: item anomali persil membawa parcelDbId untuk tautan Detail Lahan", () => {
    const d = computeLahanDomain([farmer({ landParcels: [{ ...validParcel, geometry: null }] })]);
    const a = d.anomalies.find((x) => x.key === "persil-tanpa-geometry")!;
    expect(a.items[0].parcelDbId).toBe("lp-1");
    expect(a.items[0].detail).toBe("P-1");
    expect(a.grain).toBe("persil");
    expect(a.fix.href).toBe("/admin/bulk-upload/parcels");
  });
});

function participant(packageCode: string, pre: number | null = 80, post: number | null = 90) {
  return { id: `tp-${packageCode}`, preTestScore: pre, postTestScore: post, packageCode };
}

describe("computePelatihanDomain (cakupan per paket)", () => {
  it("flags farmers who have not attended a required package", () => {
    const d = computePelatihanDomain([farmer({ trainingParticipants: [] })], [P1], [{ packageCode: P1.code, hasEvidence: true }]);
    expect(d.anomalies.find((a) => a.key === `belum-paket-${P1.code}`)!.count).toBe(1);
    expect(d.score).toBe(0);
  });

  it("marks a farmer covered when active participation for the package exists", () => {
    const d = computePelatihanDomain([farmer({ trainingParticipants: [participant(P1.code)] })], [P1], [{ packageCode: P1.code, hasEvidence: true }]);
    expect(d.training!.completeFarmers).toBe(1);
    expect(d.training!.incompleteCount).toBe(0);
    expect(d.score).toBe(100);
  });

  it("ignores participation for a package outside the required set (e.g. OTHER)", () => {
    const d = computePelatihanDomain([farmer({ trainingParticipants: [participant("OTHER")] })], [P1], [{ packageCode: P1.code, hasEvidence: true }]);
    expect(d.training!.incompleteCount).toBe(1);
    expect(d.training!.incompleteFarmers[0].missing).toEqual([P1.name]);
    expect(d.score).toBe(0);
  });

  it("computes per-farmer coverage across multiple packages (partial = belum lengkap)", () => {
    const d = computePelatihanDomain(
      [farmer({ trainingParticipants: [participant(P1.code)] })],
      [P1, P2],
      [{ packageCode: P1.code, hasEvidence: true }, { packageCode: P2.code, hasEvidence: true }]
    );
    const inc = d.training!.incompleteFarmers[0];
    expect(inc.doneCount).toBe(1);
    expect(inc.total).toBe(2);
    expect(inc.coveragePct).toBe(50);
    expect(inc.missing).toEqual([P2.name]);
    expect(d.score).toBe(50);
  });

  it("computes package coverage covered/notCovered + notCoveredFarmers", () => {
    const d = computePelatihanDomain(
      [
        farmer({ id: "a", farmerId: "F-A", trainingParticipants: [participant(P1.code)] }),
        farmer({ id: "b", farmerId: "F-B", trainingParticipants: [] }),
      ],
      [P1],
      [{ packageCode: P1.code, hasEvidence: true }]
    );
    const p1 = d.training!.packageCoverage.find((p) => p.code === P1.code)!;
    expect(p1.covered).toBe(1);
    expect(p1.notCovered).toBe(1);
    expect(p1.coveragePct).toBe(50);
    expect(p1.notCoveredFarmers.map((f) => f.farmerId)).toEqual(["F-B"]);
  });

  it("computes coverageScore as the average of per-farmer coverage", () => {
    const d = computePelatihanDomain(
      [
        farmer({ id: "a", farmerId: "F-A", trainingParticipants: [participant(P1.code), participant(P2.code)] }), // 100%
        farmer({ id: "b", farmerId: "F-B", trainingParticipants: [] }), // 0%
      ],
      [P1, P2],
      [{ packageCode: P1.code, hasEvidence: true }, { packageCode: P2.code, hasEvidence: true }]
    );
    expect(d.training!.coverageScore).toBe(50);
  });

  it("sorts incompleteFarmers by coverage ascending", () => {
    const d = computePelatihanDomain(
      [
        farmer({ id: "a", farmerId: "F-A", trainingParticipants: [participant(P1.code)] }), // 50%
        farmer({ id: "b", farmerId: "F-B", trainingParticipants: [] }), // 0%
      ],
      [P1, P2],
      [{ packageCode: P1.code, hasEvidence: true }, { packageCode: P2.code, hasEvidence: true }]
    );
    expect(d.training!.incompleteFarmers.map((f) => f.farmerId)).toEqual(["F-B", "F-A"]);
  });

  it("marks a package with no active activity in the KT (hasActivity=false)", () => {
    const d = computePelatihanDomain([farmer({ trainingParticipants: [] })], [P1, P2], [{ packageCode: P1.code, hasEvidence: true }]);
    const p2 = d.training!.packageCoverage.find((p) => p.code === P2.code)!;
    expect(p2.hasActivity).toBe(false);
    expect(p2.activityCount).toBe(0);
    expect(d.training!.packageCoverage.find((p) => p.code === P1.code)!.hasActivity).toBe(true);
  });

  it("builds a coverage matrix cell per required package", () => {
    const d = computePelatihanDomain(
      [farmer({ trainingParticipants: [participant(P1.code)] })],
      [P1, P2],
      [{ packageCode: P1.code, hasEvidence: true }, { packageCode: P2.code, hasEvidence: true }]
    );
    const cells = d.training!.matrix[0].cells;
    expect(cells).toEqual([
      { code: P1.code, done: true },
      { code: P2.code, done: false },
    ]);
  });

  it("still flags participants missing pre/post test scores (data completeness)", () => {
    const d = computePelatihanDomain(
      [farmer({ trainingParticipants: [participant(P1.code, null, null)] })],
      [P1],
      [{ packageCode: P1.code, hasEvidence: true }]
    );
    expect(d.anomalies.find((a) => a.key === "peserta-tanpa-pretest")!.count).toBe(1);
    expect(d.anomalies.find((a) => a.key === "peserta-tanpa-posttest")!.count).toBe(1);
    expect(d.score).toBe(100); // hadir → covered, nilai tidak memengaruhi cakupan
  });

  it("flags a group with no training activity at all", () => {
    const d = computePelatihanDomain([farmer({ trainingParticipants: [participant(P1.code)] })], [P1], []);
    expect(d.anomalies.find((a) => a.key === "kt-tanpa-aktivitas")!.count).toBe(1);
  });
});

describe("computeProduksiDomain", () => {
  it("flags farmers without any production record", () => {
    const d = computeProduksiDomain([farmer({ productionRecords: [] })], REF);
    expect(d.anomalies.find((a) => a.key === "petani-tanpa-produksi")!.count).toBe(1);
  });
  it("flags farmers with land but no production (strong anomaly)", () => {
    const d = computeProduksiDomain([farmer({ landParcels: [validParcel], productionRecords: [] })], REF);
    expect(d.anomalies.find((a) => a.key === "berlahan-tanpa-produksi")!.count).toBe(1);
  });
  it("flags production records without a linked parcel", () => {
    const d = computeProduksiDomain([farmer({ productionRecords: [freshRecord("pr-1", null)] })], REF);
    expect(d.anomalies.find((a) => a.key === "produksi-tanpa-persil")!.count).toBe(1);
  });
  it("#352: isPsr dikecualikan dari 'berlahan tanpa produksi' dan dari grain lahan", () => {
    const psr = { ...validParcel, isPsr: true };
    const d = computeProduksiDomain([farmer({ landParcels: [psr], productionRecords: [] })], REF);
    expect(d.anomalies.find((a) => a.key === "berlahan-tanpa-produksi")).toBeUndefined();
    expect(d.anomalies.find((a) => a.key === "lahan-tanpa-produksi")).toBeUndefined();
    expect(d.cards.find((c) => c.label === "Lahan Berproduksi (non-PSR)")!.value).toBe("0 / 0");
    // Campur: satu PSR + satu non-PSR tanpa produksi → tetap anomali (lahan non-PSR-nya).
    const d2 = computeProduksiDomain(
      [farmer({ landParcels: [psr, { ...validParcel, id: "lp-2", parcelId: "P-2" }], productionRecords: [] })],
      REF
    );
    expect(d2.anomalies.find((a) => a.key === "berlahan-tanpa-produksi")!.count).toBe(1);
    expect(d2.anomalies.find((a) => a.key === "lahan-tanpa-produksi")!.items.map((i) => i.parcelDbId)).toEqual(["lp-2"]);
  });
  it("#352: grain lahan — lahan non-PSR tanpa record tertaut walau petaninya ber-produksi", () => {
    const d = computeProduksiDomain(
      [
        farmer({
          landParcels: [validParcel, { ...validParcel, id: "lp-2", parcelId: "P-2" }],
          productionRecords: [freshRecord("pr-1", "lp-1")],
        }),
      ],
      REF
    );
    expect(d.score).toBe(100); // skor tetap % petani ber-produksi (P1)
    const a = d.anomalies.find((x) => x.key === "lahan-tanpa-produksi")!;
    expect(a.items.map((i) => i.parcelDbId)).toEqual(["lp-2"]);
    expect(a.total).toBe(2);
    expect(d.cards.find((c) => c.label === "Lahan Berproduksi (non-PSR)")!.value).toBe("1 / 2");
  });
  it("#352 P7: kebaruan — basi tepat di batas N bulan, segar di bawahnya", () => {
    expect(PRODUCTION_STALE_MONTHS).toBe(3);
    expect(monthsBetween("2026-06", "2026-09")).toBe(3);
    expect(monthsBetween("2025-11", "2026-02")).toBe(3);
    expect(Number.isNaN(monthsBetween("2026-6", "2026-09"))).toBe(true);
    const at = (period: string) =>
      computeProduksiDomain(
        [farmer({ productionRecords: [{ id: "a", parcelId: "lp-1", period: "2024-01", yieldKg: 1, isEstimate: false }, { id: "b", parcelId: "lp-1", period, yieldKg: 1, isEstimate: false }] })],
        REF
      ).anomalies.find((x) => x.key === "produksi-basi");
    expect(at("2026-06")).toBeDefined(); // selisih 3 → basi
    expect(at("2026-06")!.items[0].detail).toBe("terakhir 2026-06");
    expect(at("2026-07")).toBeUndefined(); // selisih 2 → masih segar
    // Petani tanpa produksi sama sekali TIDAK dobel dihitung basi.
    const none = computeProduksiDomain([farmer({ productionRecords: [] })], REF);
    expect(none.anomalies.find((x) => x.key === "produksi-basi")).toBeUndefined();
  });
  it("#352: record 'Estimasi' tampil di kartu, tidak menambah anomali", () => {
    const d = computeProduksiDomain(
      [
        farmer({
          landParcels: [validParcel],
          productionRecords: [freshRecord("a"), { ...freshRecord("b"), isEstimate: true }],
        }),
      ],
      REF
    );
    expect(d.cards.find((c) => c.label === "Record Estimasi")!.value).toBe("1 (50.0%)");
    expect(d.anomalies).toHaveLength(0);
  });
});

describe("registri check (#352)", () => {
  it("setiap anomali yang dihasilkan lib terdaftar di katalog dengan rute perbaikan", () => {
    for (const [key, def] of Object.entries(ANOMALY_CATALOG)) {
      expect(def.label, key).toBeTruthy();
      expect(def.fix.menu, key).toBeTruthy();
      expect(["lembaga", "petani", "persil", "aktivitas"]).toContain(def.grain);
    }
    expect(() => anomalyDef("tidak-ada")).toThrow(/belum terdaftar/);
    expect(anomalyDef("belum-paket-X").domain).toBe("pelatihan");
  });

  it("modul: tiga keadaan — terisi, kosong, tidak berlaku — keluar-masuk penyebut", () => {
    const g = group({
      modules: GROUP_MODULES,
      rspoCertStatus: "CERTIFIED",
      farmers: [
        farmer({
          modules: { stdb: true, bmpAssessment: false },
          landParcels: [
            { ...validParcel, modules: ALL_PARCEL_MODULES },
            { ...validParcel, id: "lp-2", parcelId: "P-2", modules: NO_PARCEL_MODULES },
          ],
        }),
        farmer({ id: "db-2", farmerId: "F-002", nik: "2222222222222222", modules: { stdb: false, bmpAssessment: false } }),
      ],
    });
    const cov = computeModuleCoverage(g);
    expect(cov.map((m) => m.key)).toEqual(MODULE_CATALOG.map((m) => m.key));
    const by = (k: string) => cov.find((m) => m.key === k)!;
    // Terisi sebagian: 1/2 persil ber-surat → 50 %.
    expect(by("surat-tanah")).toMatchObject({ covered: 1, total: 2, pct: 50, applicable: true });
    // Tidak berlaku: Monev petani belum dimulai (0/2) → pct null, keluar dari penyebut.
    expect(by("monev-petani")).toMatchObject({ covered: 0, total: 2, pct: null, applicable: false });
    // Tingkat Lembaga selalu berlaku: acuan MD tidak ada → 0 %, boundary ada → 100 %.
    expect(by("acuan-md")).toMatchObject({ covered: 0, total: 1, pct: 0, applicable: true });
    expect(by("boundary-ics").pct).toBe(100);
    // Sertifikasi: hanya RSPO terisi dari 3 → belum "lengkap" (P3: informatif).
    expect(by("sertifikasi").pct).toBe(0);
    // Bukti aktivitas: 1/1 aktivitas ber-bukti.
    expect(by("bukti-aktivitas").pct).toBe(100);
  });

  it("tanpa flag modul → moduleCoverage kosong dan skor inti tak berubah", () => {
    const base = group({ farmers: [farmer({ landParcels: [validParcel] })] });
    const withModules = group({
      modules: GROUP_MODULES,
      farmers: [farmer({ landParcels: [{ ...validParcel, modules: NO_PARCEL_MODULES }], modules: { stdb: false, bmpAssessment: false } })],
    });
    const a = computeCompleteness(base, { referencePeriod: REF });
    const b = computeCompleteness(withModules, { referencePeriod: REF });
    expect(a.moduleCoverage).toEqual([]);
    expect(b.moduleCoverage.length).toBe(MODULE_CATALOG.length);
    expect(a.healthScore).toBe(b.healthScore);
    expect(a.domains.map((d) => d.score)).toEqual(b.domains.map((d) => d.score));
    expect(a.totalAnomalies).toBe(b.totalAnomalies);
  });
});

describe("anomali sistemik (#352 A3)", () => {
  const many = (n: number, blankFrom: number) =>
    Array.from({ length: n }, (_, i) =>
      farmer({ id: `f${i}`, farmerId: `F-${i}`, name: `Petani ${i}`, nik: null, address: i >= blankFrom ? null : "Jl. X" })
    );

  it("dilipat tepat di ambang 95 % (20 petani: 19 kosong → sistemik, 18 → per entitas)", () => {
    expect(SYSTEMIC_THRESHOLD).toBe(0.95);
    const folded = computePetaniDomain(many(20, 1)).anomalies.find((a) => a.key === "no-address")!;
    expect(folded.systemic).toBe(true);
    expect(folded.count).toBe(1);
    expect(folded.entityCount).toBe(19);
    expect(folded.total).toBe(20);
    expect(folded.items).toHaveLength(19); // daftar tetap dibawa untuk Excel
    const open = computePetaniDomain(many(20, 2)).anomalies.find((a) => a.key === "no-address")!;
    expect(open.systemic).toBe(false);
    expect(open.count).toBe(18);
  });

  it("Lembaga kecil (< SYSTEMIC_MIN_ENTITIES) tidak pernah dilipat", () => {
    const d = computePetaniDomain(many(SYSTEMIC_MIN_ENTITIES - 1, 0));
    const a = d.anomalies.find((x) => x.key === "no-address")!;
    expect(a.systemic).toBe(false);
    expect(a.count).toBe(SYSTEMIC_MIN_ENTITIES - 1);
  });

  it("badge domain menghitung temuan: sistemik = 1, sisanya per entitas; skor tidak berubah", () => {
    const farmers = many(20, 0); // NIK kosong 20/20 (sistemik) + alamat kosong 20/20 (sistemik)
    const d = computePetaniDomain(farmers);
    expect(d.totalAnomalies).toBe(2);
    expect(d.score).toBeCloseTo((4 / 6) * 100, 6); // NIK & alamat gagal, 4 check lolos
  });

  it("hanya check 'kolom kosong' yang dilipat — validitas/kebaruan/paket tetap per entitas walau 100 %", () => {
    const foldable = Object.entries(ANOMALY_CATALOG).filter(([, d]) => d.foldable).map(([k]) => k);
    expect(foldable).not.toContain("invalid-nik");
    expect(foldable).not.toContain("dup-nik");
    expect(foldable).not.toContain("produksi-basi");
    expect(foldable).toContain("persil-tanpa-status");
    expect(anomalyDef("belum-paket-X").foldable).toBe(false);

    // 20 petani semua ber-NIK 15 digit → tetap 20 temuan, bukan 1 "kolom belum diisi".
    const invalid = computePetaniDomain(
      Array.from({ length: 20 }, (_, i) => farmer({ id: `f${i}`, farmerId: `F-${i}`, nik: "123456789012345" }))
    ).anomalies.find((a) => a.key === "invalid-nik")!;
    expect(invalid.systemic).toBe(false);
    expect(invalid.count).toBe(20);

    // 20 petani ber-produksi semua basi → 20 temuan (sinyal "seluruh Lembaga tertinggal" tetap terlihat).
    const stale = computeProduksiDomain(
      Array.from({ length: 20 }, (_, i) =>
        farmer({ id: `f${i}`, farmerId: `F-${i}`, productionRecords: [{ id: `r${i}`, parcelId: null, period: "2026-01", yieldKg: 1, isEstimate: false }] })
      ),
      REF
    ).anomalies.find((a) => a.key === "produksi-basi")!;
    expect(stale.systemic).toBe(false);
    expect(stale.count).toBe(20);
  });

  it("penyebut pre/post-test = petani yang punya partisipasi, bukan seluruh petani", () => {
    const withPart = farmer({ id: "a", farmerId: "F-A", trainingParticipants: [participant(P1.code, null, null)] });
    const without = farmer({ id: "b", farmerId: "F-B" });
    const d = computePelatihanDomain([withPart, without], [P1], [{ packageCode: P1.code, hasEvidence: true }]);
    const pre = d.anomalies.find((a) => a.key === "peserta-tanpa-pretest")!;
    expect(pre.entityCount).toBe(1);
    expect(pre.total).toBe(1);
  });
});

describe("check kualitas (#352 putaran 2)", () => {
  // NIK 1471 01 | 15 08 90 | 0001 → lahir 15-08-1990, laki-laki.
  const NIK_M = "1471011508900001";
  // Hari +40 → perempuan: 55 08 90 → 15-08-1990.
  const NIK_F = "1471015508900002";

  it("nikBirthParts & birthDateParts: hari +40 = perempuan; timestamp 17:00 UTC = tanggal WIB berikutnya", () => {
    expect(nikBirthParts(NIK_M)).toEqual({ day: 15, month: 8, yy: 90, female: false });
    expect(nikBirthParts(NIK_F)).toEqual({ day: 15, month: 8, yy: 90, female: true });
    expect(nikBirthParts("1471019908900001")).toBeNull(); // hari 99 → bukan tanggal
    expect(birthDateParts(new Date("1990-08-15T00:00:00Z"))).toEqual({ day: 15, month: 8, year: 1990 });
    expect(birthDateParts(new Date("1990-08-14T17:00:00Z"))).toEqual({ day: 15, month: 8, year: 1990 });
    // Bentuk simpanan lain di prod (review #352): WIB historis +7:30, WITA, WIT → tetap hari yang dimaksud.
    expect(birthDateParts(new Date("1958-11-18T16:30:00Z"))).toEqual({ day: 19, month: 11, year: 1958 });
    expect(birthDateParts(new Date("1990-08-14T16:00:00Z"))).toEqual({ day: 15, month: 8, year: 1990 });
    expect(birthDateParts(new Date("1990-08-14T15:00:00Z"))).toEqual({ day: 15, month: 8, year: 1990 });
  });

  it("dup-nik hanya untuk NIK sahih — baris invalid & duplikat saling lepas", () => {
    const d = computePetaniDomain([
      farmer({ id: "a", farmerId: "A", name: "A", nik: "123" }),
      farmer({ id: "b", farmerId: "B", name: "B", nik: "123" }),
    ]);
    expect(d.anomalies.find((x) => x.key === "invalid-nik")!.entityCount).toBe(2);
    expect(d.anomalies.find((x) => x.key === "dup-nik")).toBeUndefined();
  });

  it("kt-tanpa-aktivitas ikut checklist (baris Lembaga 0/1 atau 1/1) dan temuan", () => {
    const withAct = computePelatihanDomain([farmer()], [P1], [{ packageCode: P1.code, hasEvidence: true }]);
    expect(withAct.checks.find((c) => c.key === "kt-tanpa-aktivitas")).toMatchObject({ flagged: 0, total: 1, kind: "inti" });
    const noAct = computePelatihanDomain([farmer()], [P1], []);
    expect(noAct.checks.find((c) => c.key === "kt-tanpa-aktivitas")).toMatchObject({ flagged: 1, total: 1 });
    expect(noAct.anomalies.find((a) => a.key === "kt-tanpa-aktivitas")!.count).toBe(1);
  });

  it("jenis 'relasi' (petani tanpa lahan, lahan tanpa produksi, …) informatif tapi boleh dilipat; 'kualitas' tidak", () => {
    const relasi = Object.entries(ANOMALY_CATALOG).filter(([, d]) => d.kind === "relasi").map(([k]) => k);
    expect(relasi.sort()).toEqual(["berlahan-tanpa-produksi", "lahan-tanpa-produksi", "petani-tanpa-lahan", "produksi-tanpa-persil"]);
    for (const [, d] of Object.entries(ANOMALY_CATALOG)) {
      if (d.kind === "kualitas") expect(d.foldable).toBe(false);
      if (d.kind === "relasi") expect(d.foldable).toBe(true);
    }
    // 20 petani tanpa lahan → satu temuan sistemik, baris checklist tanpa bobot.
    const d = computeLahanDomain(Array.from({ length: 20 }, (_, i) => farmer({ id: `f${i}`, farmerId: `F-${i}`, name: `P${i}` })));
    const a = d.anomalies.find((x) => x.key === "petani-tanpa-lahan")!;
    expect(a.systemic).toBe(true);
    expect(d.checks.find((c) => c.key === "petani-tanpa-lahan")!.weight).toBeUndefined();
  });

  it("NIK ↔ tanggal lahir: cocok lolos; tertukar hari/bulan diberi petunjuk; NIK tak valid tidak dicek", () => {
    const ok = farmer({ id: "a", farmerId: "A", name: "A", nik: NIK_M, birthDate: new Date("1990-08-15T00:00:00Z") });
    // NIK 03-12-71 vs tersimpan 12-03-1971 → hari/bulan tertukar (pola impor lama di prod).
    const swapNik = "1471010312710003";
    const swapped = farmer({ id: "c", farmerId: "C", name: "C", nik: swapNik, birthDate: new Date("1971-03-12T00:00:00Z") });
    const invalid = farmer({ id: "d", farmerId: "D", name: "D", nik: "123", birthDate: new Date("1990-08-15T00:00:00Z") });
    const d = computePetaniDomain([ok, swapped, invalid], 2026);
    const a = d.anomalies.find((x) => x.key === "nik-tanggal-lahir")!;
    expect(a.total).toBe(2); // invalid NIK tidak dicek
    expect(a.items.map((i) => i.farmerId)).toEqual(["C"]);
    expect(a.items[0].detail).toContain("hari/bulan tertukar?");
    expect(a.kind).toBe("kualitas");
    // Kualitas tidak mengubah skor petani (semua field terisi → 100, kecuali NIK "123" tak sahih).
    expect(d.score).toBeCloseTo(((6 + 6 + 5) / 6 / 3) * 100, 6);
  });

  it("NIK ↔ jenis kelamin, umur tidak wajar, kemungkinan ganda, Monev tanpa rincian", () => {
    const farmers = [
      farmer({ id: "a", farmerId: "A", name: "Siti", gender: "M", nik: NIK_F, birthDate: new Date("1990-08-15T00:00:00Z") }),
      farmer({ id: "b", farmerId: "B", name: "Budi", gender: "M", nik: null, birthDate: new Date("2015-01-01T00:00:00Z") }),
      farmer({ id: "c", farmerId: "C", name: "Andi  Wijaya", nik: null, birthDate: new Date("1980-05-05T00:00:00Z") }),
      farmer({ id: "d", farmerId: "D", name: "andi wijaya", nik: null, birthDate: new Date("1980-05-05T00:00:00Z") }),
      farmer({ id: "e", farmerId: "E", name: "Eko", nik: null, modules: { stdb: false, bmpAssessment: true, bmpAssessmentNoDetails: true } }),
      farmer({ id: "f", farmerId: "F", name: "Fani", nik: null, modules: { stdb: false, bmpAssessment: true, bmpAssessmentNoDetails: false } }),
    ];
    const d = computePetaniDomain(farmers, 2026);
    expect(d.anomalies.find((x) => x.key === "nik-jenis-kelamin")!.items.map((i) => i.farmerId)).toEqual(["A"]);
    expect(d.anomalies.find((x) => x.key === "umur-tidak-wajar")!.items[0]).toMatchObject({ farmerId: "B", detail: "11 tahun" });
    expect(d.anomalies.find((x) => x.key === "petani-kemungkinan-ganda")!.items.map((i) => i.farmerId)).toEqual(["C", "D"]);
    const monev = d.anomalies.find((x) => x.key === "monev-tanpa-rincian")!;
    expect(monev.items.map((i) => i.farmerId)).toEqual(["E"]);
    expect(monev.total).toBe(2); // hanya petani ber-penilaian yang dicek
  });

  it("Lahan: di luar boundary (hanya yang bisa dicek), luas ≠ poligon > 20 %, luas & tahun tanam tidak wajar", () => {
    const base = { ...validParcel, modules: { ...NO_PARCEL_MODULES } };
    const d = computeLahanDomain(
      [
        farmer({
          landParcels: [
            { ...base, id: "p1", parcelId: "P1", geometryAreaHa: 1.5, modules: { ...NO_PARCEL_MODULES, outsideBoundary: false } },
            { ...base, id: "p2", parcelId: "P2", geometryAreaHa: 2.5, modules: { ...NO_PARCEL_MODULES, outsideBoundary: true } }, // 1.5 vs 2.5 → 40 %
            { ...base, id: "p3", parcelId: "P3", area: 0.01, plantingYear: 1950, modules: { ...NO_PARCEL_MODULES, outsideBoundary: null } },
            { ...base, id: "p4", parcelId: "P4", area: 30, plantingYear: 2030 },
          ],
        }),
      ],
      2026
    );
    const by = (k: string) => d.anomalies.find((x) => x.key === k)!;
    expect(by("persil-di-luar-boundary")).toMatchObject({ total: 2, entityCount: 1 });
    expect(by("persil-di-luar-boundary").items[0].parcelDbId).toBe("p2");
    expect(by("luas-beda-geometri")).toMatchObject({ total: 2, entityCount: 1 });
    expect(by("luas-beda-geometri").items[0].detail).toContain("kolom 1.50 ha vs poligon 2.50 ha");
    expect(by("luas-tidak-wajar").items.map((i) => i.parcelDbId)).toEqual(["p3", "p4"]);
    expect(by("tahun-tanam-tidak-wajar").items.map((i) => i.parcelDbId)).toEqual(["p3", "p4"]);
    // Kualitas tidak masuk skor: keempat persil lengkap secara atribut → 100.
    expect(d.score).toBe(100);
    expect(d.cards.find((c) => c.label === "Di Luar Boundary ICS")!.value).toBe(1);
  });

  it("Lahan: kartu \"Persil kena NKT\" menghitung INCLUDED (legacy) + AFFECTED — satu definisi dengan KPI/peta/laporan", () => {
    const base = { ...validParcel, modules: { ...NO_PARCEL_MODULES, nkt: true } };
    const d = computeLahanDomain(
      [
        farmer({
          landParcels: [
            { ...base, id: "p1", parcelId: "P1", modules: { ...base.modules, nktStatus: "AFFECTED" } },
            { ...base, id: "p2", parcelId: "P2", modules: { ...base.modules, nktStatus: "INCLUDED" } },
            { ...base, id: "p3", parcelId: "P3", modules: { ...base.modules, nktStatus: "NOT_AFFECTED" } },
            { ...base, id: "p4", parcelId: "P4", modules: { ...base.modules, nkt: false, nktStatus: null } },
          ],
        }),
      ],
      2026
    );
    expect(d.cards.find((c) => c.label === "Persil kena NKT")!.value).toBe(2);
  });

  it("Pelatihan: nilai turun & di luar rentang; Produksi: 0 kg & bulan bolong", () => {
    const t = computePelatihanDomain(
      [
        farmer({ id: "a", farmerId: "A", name: "A", trainingParticipants: [participant(P1.code, 80, 60)] }),
        farmer({ id: "b", farmerId: "B", name: "B", trainingParticipants: [participant(P1.code, 50, 120)] }),
        farmer({ id: "c", farmerId: "C", name: "C", trainingParticipants: [] }),
      ],
      [P1],
      [{ packageCode: P1.code, hasEvidence: true }]
    );
    expect(t.anomalies.find((x) => x.key === "nilai-turun")).toMatchObject({ total: 2, entityCount: 1 });
    expect(t.anomalies.find((x) => x.key === "nilai-turun")!.items[0].detail).toBe("pre 80 → post 60");
    expect(t.anomalies.find((x) => x.key === "nilai-di-luar-rentang")!.items.map((i) => i.farmerId)).toEqual(["B"]);

    const p = computeProduksiDomain(
      [
        farmer({
          landParcels: [validParcel],
          productionRecords: [
            { id: "r1", parcelId: "lp-1", period: "2026-05", yieldKg: 0, isEstimate: false },
            { id: "r2", parcelId: "lp-1", period: "2026-07", yieldKg: 50, isEstimate: false },
            { id: "r3", parcelId: "lp-1", period: "2026-09", yieldKg: 50, isEstimate: false },
          ],
        }),
      ],
      REF
    );
    expect(p.anomalies.find((x) => x.key === "produksi-nol")!.items[0].detail).toBe("1 record 0 kg");
    expect(p.anomalies.find((x) => x.key === "produksi-bulan-bolong")!.items[0].detail).toBe("2 bulan bolong (2026-05 … 2026-09)");
    expect(p.score).toBe(100);
  });

  it("checklist domain memuat SEMUA check (termasuk lolos) + baris modul; bobot hanya untuk check berskor", () => {
    const r = computeCompleteness(
      group({
        modules: GROUP_MODULES,
        farmers: [farmer({ landParcels: [{ ...validParcel, modules: { ...NO_PARCEL_MODULES, document: true } }], modules: { stdb: true, bmpAssessment: false } })],
      }),
      { referencePeriod: REF }
    );
    const lahan = r.domains.find((d) => d.domain === "lahan")!;
    const keys = lahan.checks.map((c) => c.key);
    expect(keys).toContain("persil-tanpa-geometry"); // lolos (0 temuan) tetap tampil
    expect(keys).toContain("surat-tanah"); // modul menempel ke domain Lahan
    expect(keys).toContain("nkt");
    expect(lahan.checks.find((c) => c.key === "persil-tanpa-geometry")).toMatchObject({ kind: "inti", flagged: 0, total: 1, weight: 3 / 15 });
    expect(lahan.checks.find((c) => c.key === "persil-tanpa-blok")).toMatchObject({ kind: "lapangan", weight: 1 / 15 });
    expect(lahan.checks.find((c) => c.key === "luas-tidak-wajar")).toMatchObject({ kind: "kualitas", weight: undefined });
    expect(lahan.checks.find((c) => c.key === "surat-tanah")).toMatchObject({ kind: "modul", flagged: 0, total: 1, applicable: true });
    expect(lahan.checks.find((c) => c.key === "nkt")).toMatchObject({ kind: "modul", applicable: false });
    const petani = r.domains.find((d) => d.domain === "petani")!;
    expect(petani.checks.find((c) => c.key === "monev-petani")).toMatchObject({ kind: "modul", applicable: false });
    // Modul yang berlaku membawa daftar kerja `missing`.
    expect(r.moduleCoverage.find((m) => m.key === "surat-tanah")!.missing).toEqual([]);
    expect(r.moduleCoverage.find((m) => m.key === "nkt")!.missing).toEqual([]); // tidak berlaku → tanpa daftar
  });

  it("prioritas perbaikan: Δ Index = bobot domain × pangsa × bobot check, urut terbesar", () => {
    // 10 petani: 5 tanpa alamat (petani 25 % × 0,5 × 1/6 = 2,08), semua tanpa produksi (20 % × 1 = 20),
    // 10 persil tanpa KT (lahan 25 % × 1 × 3/15 = 5), profil kode kosong (10 % × 1/6 = 1,67).
    const farmers = Array.from({ length: 10 }, (_, i) =>
      farmer({
        id: `f${i}`,
        farmerId: `F-${i}`,
        name: `Petani ${i}`,
        nik: `14710115089000${String(i).padStart(2, "0")}`,
        address: i < 5 ? null : "Jl",
        landParcels: [{ ...validParcel, id: `lp${i}`, parcelId: `P${i}`, subGroupLv2: null }],
        trainingParticipants: [participant(P1.code)],
      })
    );
    const r = computeCompleteness(group({ code: null, farmers }), { referencePeriod: REF });
    expect(r.priorities.slice(0, 4).map((p) => [p.key, p.indexGain])).toEqual([
      ["produksi:petani-tanpa-produksi", 20],
      ["lahan:persil-tanpa-kelompok-tani", 5],
      ["petani:no-address", 2.1],
      ["profil:code", 1.7],
    ]);
    // Konsistensi: Index + Σ gain semua prioritas ≈ 100 (semua check berskor dilengkapi).
    const totalGain = computePriorities(r.profileChecks, r.domains, 100).reduce((s, p) => s + p.indexGain, 0);
    expect(Math.round(r.healthScore + totalGain)).toBe(100);
  });

  it("rincian per Kelompok Tani: skor lahan/petani per KT, lahan berproduksi, urut terendah dulu", () => {
    const farmers = [
      farmer({
        id: "a",
        farmerId: "A",
        name: "A",
        landParcels: [
          { ...validParcel, id: "p1", parcelId: "P1", subGroupLv2: "KT Mawar" },
          { ...validParcel, id: "p2", parcelId: "P2", subGroupLv2: "KT Melati", landStatus: null, plantingYear: null, blok: null },
        ],
        productionRecords: [freshRecord("r1", "p1")],
      }),
      farmer({ id: "b", farmerId: "B", name: "B", nik: null, landParcels: [{ ...validParcel, id: "p3", parcelId: "P3", subGroupLv2: null }] }),
    ];
    const rows = computeByKelompokTani(farmers);
    // Dua KT seri 80 (KT Melati: 3 atribut lapangan kosong = 3/15; tanpa KT: bobot 3 hilang) → urut nama.
    expect(rows.map((r) => r.name)).toEqual(["(tanpa Kelompok Tani)", "KT Melati", "KT Mawar"]);
    expect(rows[0]).toMatchObject({ lahanScore: 80, petaniScore: 83.3 }); // petani B tanpa NIK
    expect(rows[1]).toMatchObject({ farmers: 1, parcels: 1, lahanScore: 80, parcelsProducing: 0, parcelsProducingPct: 0 });
    expect(rows[2]).toMatchObject({ lahanScore: 100, parcelsProducing: 1, parcelsProducingPct: 100, areaHa: 1.5 });
    // Persil PSR ber-produksi tetap dihitung berproduksi; penyebut = semua persil KT (review #352).
    const psr = computeByKelompokTani([
      farmer({ landParcels: [{ ...validParcel, id: "p9", parcelId: "P9", isPsr: true, subGroupLv2: "KT PSR" }], productionRecords: [freshRecord("r9", "p9")] }),
    ]);
    expect(psr[0]).toMatchObject({ name: "KT PSR", parcelsProducing: 1, parcelsProducingPct: 100 });
  });
});

describe("computeCompleteness (orchestrator)", () => {
  it("returns a perfect clean result for fully complete data", () => {
    const clean = farmer({
      landParcels: [validParcel],
      trainingParticipants: [{ id: "tp-1", preTestScore: 80, postTestScore: 90, packageCode: P1.code }],
      productionRecords: [freshRecord()],
    });
    const result = computeCompleteness(group({ farmers: [clean] }), { referencePeriod: REF });
    expect(result.healthScore).toBe(100);
    expect(result.totalAnomalies).toBe(0);
    expect(result.domains.every((d) => d.score === 100)).toBe(true);
    expect(result.referencePeriod).toBe(REF);
  });

  it("regresi #193: fixture Lembaga sebagian lengkap mereproduksi skor inti yang diharapkan", () => {
    // Petani: NIK kosong → 5/6. Lahan: tahun tanam & status kosong → 13/15 (4×3 + 1×1).
    // Pelatihan: 1/1 paket. Produksi: 1/1 petani ber-produksi. Profil: 6/6.
    const f = farmer({
      nik: null,
      landParcels: [{ ...validParcel, plantingYear: null, landStatus: null }],
      trainingParticipants: [{ id: "tp-1", preTestScore: 80, postTestScore: 90, packageCode: P1.code }],
      productionRecords: [freshRecord()],
    });
    const r = computeCompleteness(group({ farmers: [f] }), { referencePeriod: REF });
    const petani = (5 / 6) * 100;
    const lahan = (13 / 15) * 100;
    expect(r.domains.find((d) => d.domain === "petani")!.score).toBe(Math.round(petani * 10) / 10);
    expect(r.domains.find((d) => d.domain === "lahan")!.score).toBe(Math.round(lahan * 10) / 10);
    expect(r.healthScore).toBe(Math.round(0.1 * 100 + 0.25 * petani + 0.25 * lahan + 0.2 * 100 + 0.2 * 100));
    // Σ count anomali domain + profil gagal == totalAnomalies.
    const sum = r.domains.reduce((s, d) => s + d.anomalies.reduce((t, a) => t + a.count, 0), 0);
    expect(sum).toBe(r.totalAnomalies);
  });

  it("aggregates total anomalies across domains and profile", () => {
    const bad = farmer({
      nik: null,
      landParcels: [],
      trainingParticipants: [],
      productionRecords: [],
    });
    const result = computeCompleteness(group({ code: null, farmers: [bad], activities: [] }), { referencePeriod: REF });
    expect(result.totalAnomalies).toBeGreaterThan(0);
    expect(result.healthScore).toBeLessThan(100);
    // profile failed check (code) counted
    expect(result.profileChecks.find((c) => c.key === "code")!.complete).toBe(false);
  });

  it("handles an empty group (no farmers) without dividing by zero", () => {
    const result = computeCompleteness(group({ farmers: [] }));
    expect(result.totalFarmers).toBe(0);
    expect(Number.isNaN(result.healthScore)).toBe(false);
    expect(result.domains.find((d) => d.domain === "petani")!.score).toBe(0);
  });
});
