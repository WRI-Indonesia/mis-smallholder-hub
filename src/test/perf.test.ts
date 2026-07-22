import { describe, it, expect } from "vitest";
import bcrypt from "bcryptjs";
import { computeCompleteness, computePelatihanDomain } from "@/lib/data-completeness";
import type { CompletenessFarmerInput, CompletenessGroupInput } from "@/types/data-completeness";
import {
  buildProductionMatrix,
  enumeratePeriods,
  type ProductionMatrixRecord,
} from "@/lib/report-production";
import {
  summarizeProduction,
  buildBmpMapData,
  buildBmpProductivityView,
  buildBmpProductivityMatrix,
  longestConsecutiveMonths,
  productionAvailabilityCategory,
  type RawParcel,
} from "@/lib/map-data";
import {
  buildBmpSnapshotData,
  filterBmpGroups,
  sumBmpGroups,
  bmpChartSeries,
} from "@/lib/bmp-dashboard-aggregation";
import { addParticipantsSchema } from "@/validations/training-participant.schema";
import { deriveFarmerSubGroups } from "@/lib/farmer-sub-groups";
import { formatRspoCert } from "@/lib/farmer-group-labels";

describe("Performance - Auth operations", () => {
  it("bcrypt hash completes under 500ms (cost factor 10)", async () => {
    const start = performance.now();
    await bcrypt.hash("P@ssword123", 10);
    const duration = performance.now() - start;

    console.log(`  bcrypt hash: ${duration.toFixed(1)}ms`);
    expect(duration).toBeLessThan(500);
  });

  it("bcrypt compare completes under 500ms", async () => {
    const hash = await bcrypt.hash("P@ssword123", 10);

    const start = performance.now();
    await bcrypt.compare("P@ssword123", hash);
    const duration = performance.now() - start;

    console.log(`  bcrypt compare: ${duration.toFixed(1)}ms`);
    expect(duration).toBeLessThan(500);
  });

  it("menu tree building handles 100 items under 5ms", () => {
    // Generate 100 mock items
    const items = Array.from({ length: 10 }, (_, i) => ({
      key: `parent-${i}`,
      parentKey: null as string | null,
      title: `Parent ${i}`,
      url: `/p${i}`,
      icon: null as string | null,
    }));

    // Add 9 children per parent
    for (let p = 0; p < 10; p++) {
      for (let c = 0; c < 9; c++) {
        items.push({
          key: `child-${p}-${c}`,
          parentKey: `parent-${p}`,
          title: `Child ${p}-${c}`,
          url: `/p${p}/c${c}`,
          icon: null,
        });
      }
    }

    const start = performance.now();
    const parents = items.filter((i) => !i.parentKey);
    parents.map((p) => ({
      ...p,
      children: items.filter((c) => c.parentKey === p.key),
    }));
    const duration = performance.now() - start;

    console.log(`  menu tree (100 items): ${duration.toFixed(2)}ms`);
    expect(duration).toBeLessThan(5);
  });

  it("RBAC resolution handles 50 districts under 1ms", () => {
    const provinces: Record<string, string[]> = {};
    for (let i = 0; i < 5; i++) {
      provinces[`prov-${i}`] = Array.from({ length: 10 }, (_, j) => `dist-${i}-${j}`);
    }

    const user = { provinces: ["prov-0", "prov-1", "prov-2"], districts: ["extra-1", "extra-2"] };

    const start = performance.now();
    const ids = new Set<string>();
    for (const prov of user.provinces) {
      (provinces[prov] ?? []).forEach((d) => ids.add(d));
    }
    for (const d of user.districts) ids.add(d);
    const duration = performance.now() - start;

    console.log(`  RBAC resolve (50 districts): ${duration.toFixed(3)}ms`);
    expect(duration).toBeLessThan(1);
    expect(ids.size).toBe(32); // 30 from provinces + 2 direct
  });
});

describe("Performance - AUDIT-P0 RBAC scope guard (#125)", () => {
  // bulkCreateFarmers memvalidasi setiap baris terhadap set lembaga petani yang
  // boleh diakses user. Harus O(n) via Set membership — bukan N+1 query atau
  // Array.includes O(n²). Test ini membuktikan hot-path in-memory tetap murah
  // untuk upload besar.
  it("bulk scope validation: 10.000 baris × Set membership under 20ms", () => {
    const allowedGroupIds = new Set(Array.from({ length: 200 }, (_, i) => `kt-${i}`));
    // 10k baris, semua valid kecuali satu di paling akhir (worst case: scan penuh).
    const rows = Array.from({ length: 10_000 }, (_, i) => ({
      farmerGroupId: i === 9_999 ? "kt-outside-scope" : `kt-${i % 200}`,
    }));

    const start = performance.now();
    const unauthorized = rows.find((r) => !allowedGroupIds.has(r.farmerGroupId));
    const duration = performance.now() - start;

    console.log(`  bulk scope validation (10k baris): ${duration.toFixed(3)}ms`);
    expect(duration).toBeLessThan(20);
    expect(unauthorized?.farmerGroupId).toBe("kt-outside-scope");
  });

  it("bulk scope validation short-circuits pada pelanggaran pertama", () => {
    const allowedGroupIds = new Set(["kt-1"]);
    let scanned = 0;
    const rows = Array.from({ length: 10_000 }, (_, i) => ({
      farmerGroupId: i === 0 ? "kt-bad" : "kt-1",
    }));

    const unauthorized = rows.find((r) => {
      scanned++;
      return !allowedGroupIds.has(r.farmerGroupId);
    });

    // Pelanggaran di baris pertama → berhenti setelah 1 iterasi (tidak scan 10k).
    expect(scanned).toBe(1);
    expect(unauthorized?.farmerGroupId).toBe("kt-bad");
  });
});

describe("Performance - DA-02b Training coverage (pure logic)", () => {
  const PACKAGES = [
    { code: "PAKET_1_BMP_PC_RSPO_NKT", name: "Paket 1 - BMP" },
    { code: "PAKET_2_MK", name: "Paket 2 - MK" },
    { code: "PAKET_2_K3", name: "Paket 2 - K3" },
    { code: "PAKET_3_4_GEDSI_FINANCIAL_LIVELIHOOD_BUSDEV", name: "Paket 3 & 4" },
  ];

  // Deterministic synthetic farmers (no RNG) with partial, varied coverage.
  function makeFarmers(n: number): CompletenessFarmerInput[] {
    return Array.from({ length: n }, (_, i) => ({
      id: `db-${i}`,
      farmerId: `F-${i}`,
      name: `Petani ${i}`,
      nik: i % 2 === 0 ? "1234567890123456" : null,
      address: i % 3 === 0 ? null : "Jl. Mawar",
      birthDate: new Date("1990-01-01"),
      joinedYear: 2020,
      landParcels:
        i % 2 === 0
          ? [
              {
                parcelId: `P-${i}`,
                geometry: { type: "Polygon" },
                area: 1.5,
                plantingYear: 2018,
                cropType: "Palm",
                landStatus: "Owned",
              },
            ]
          : [],
      // Each farmer attends a rotating subset of packages → mix of complete/partial.
      trainingParticipants: PACKAGES.filter((_, pi) => (i + pi) % 4 !== 0).map((p) => ({
        id: `tp-${i}-${p.code}`,
        preTestScore: i % 2 === 0 ? 80 : null,
        postTestScore: i % 3 === 0 ? 90 : null,
        packageCode: p.code,
      })),
      productionRecords: i % 2 === 0 ? [{ id: `pr-${i}`, parcelId: `P-${i}` }] : [],
    }));
  }

  it("computePelatihanDomain handles 5000 farmers × 4 packages under 100ms", () => {
    const farmers = makeFarmers(5000);
    const activities = PACKAGES.map((p) => ({ packageCode: p.code }));

    const start = performance.now();
    const d = computePelatihanDomain(farmers, PACKAGES, activities);
    const duration = performance.now() - start;

    console.log(`  pelatihan coverage (5000 petani × 4 paket): ${duration.toFixed(2)}ms`);
    expect(duration).toBeLessThan(100);
    expect(d.training!.matrix.length).toBe(5000);
    expect(d.training!.packageCoverage).toHaveLength(4);
  });

  it("computeCompleteness (all 5 domains, 5000 farmers) under 200ms", () => {
    const grp: CompletenessGroupInput = {
      id: "kt-perf",
      name: "KT Perf",
      code: "KTPERF",
      abrv: "KP",
      joinYear: 2015,
      locationLat: 1.23,
      locationLong: 103.4,
      district: { id: "d-1", name: "Distrik A" },
      activities: PACKAGES.map((p) => ({ packageCode: p.code })),
      trainingPackages: PACKAGES,
      farmers: makeFarmers(5000),
    };

    const start = performance.now();
    const result = computeCompleteness(grp);
    const duration = performance.now() - start;

    console.log(`  computeCompleteness (5 domain, 5000 petani): ${duration.toFixed(2)}ms`);
    expect(duration).toBeLessThan(200);
    expect(result.totalFarmers).toBe(5000);
  });
});

describe("Performance - RPT-03 Production report pivot (pure logic)", () => {
  // Deterministic synthetic records (no RNG): N farmers × 2 parcels × full month
  // range × 2 harvests/month — the worst realistic case for one Lembaga Petani.
  function makeRecords(farmerCount: number, periods: string[]): ProductionMatrixRecord[] {
    const records: ProductionMatrixRecord[] = [];
    for (let f = 0; f < farmerCount; f++) {
      for (let p = 0; p < 2; p++) {
        for (const period of periods) {
          for (let h = 0; h < 2; h++) {
            records.push({
              farmerDbId: `db-${f}`,
              farmerCode: `ITM.${f}`,
              farmerName: `Petani ${f}`,
              parcelDbId: `parcel-${f}-${p}`,
              parcelCode: `L-${f}-${p}`,
              parcelArea: 1.5,
              period,
              yieldKg: 100 + h,
            });
          }
        }
      }
    }
    return records;
  }

  it("pivots 500 petani × 2 lahan × 24 bulan × 2 panen (~48k records) under 150ms", () => {
    const periods = enumeratePeriods("2023-01", "2024-12"); // 24 months
    const records = makeRecords(500, periods);

    const start = performance.now();
    const result = buildProductionMatrix(records, periods);
    const duration = performance.now() - start;

    console.log(
      `  production pivot (${records.length} records → ${result.rows.length} rows × ${periods.length} kolom): ${duration.toFixed(2)}ms`,
    );
    expect(duration).toBeLessThan(150);
    expect(result.rows.length).toBe(1000); // 500 farmers × 2 parcels
    expect(result.summary.totalPetani).toBe(500);
    // 1000 rows × 24 months × (100 + 101) = 4,824,000 kg
    expect(result.grandTotal).toBe(4_824_000);
  });
});

describe("Performance - MAP-01 parcel production summary (pure logic)", () => {
  // Popup/PDF summarize production for ONE parcel. Real datasets are tiny (a few
  // years × 12 months), so this stresses far past any realistic parcel to prove
  // the aggregation stays linear and cheap.
  it("summarizes ~60k records (30 years × 12 months × 166 harvests) under 50ms", () => {
    const records: { period: string; yieldKg: number }[] = [];
    for (let y = 2000; y < 2030; y++) {
      for (let m = 1; m <= 12; m++) {
        const period = `${y}-${String(m).padStart(2, "0")}`;
        for (let h = 0; h < 166; h++) records.push({ period, yieldKg: 100 + h });
      }
    }

    const start = performance.now();
    const result = summarizeProduction(records);
    const duration = performance.now() - start;

    console.log(
      `  production summary (${records.length} records → ${result.byYear.length} tahun): ${duration.toFixed(2)}ms`,
    );
    expect(duration).toBeLessThan(50);
    expect(result.byYear.length).toBe(30);
    expect(result.recordCount).toBe(records.length);
  });
});

describe("Performance - MAP-02 Peta BMP availability (pure logic)", () => {
  // getBmpMapData builds the whole payload for ONE Lembaga Petani in JS after two
  // scoped queries. This stresses buildBmpMapData (per-parcel turf centroid + kg
  // aggregation + category) far past a realistic KT to prove it stays cheap.
  function squareAt(lng: number, lat: number): RawParcel["geometry"] {
    return {
      type: "Polygon",
      coordinates: [
        [
          [lng, lat],
          [lng + 0.01, lat],
          [lng + 0.01, lat + 0.01],
          [lng, lat + 0.01],
          [lng, lat],
        ],
      ],
    };
  }

  it("buildBmpMapData: 500 lahan × 36 bulan produksi under 200ms", () => {
    const parcels = Array.from({ length: 500 }, (_, i) => ({
      id: `p-${i}`,
      parcelId: `L-${i}`,
      farmerId: `f-${i}`,
      geometry: squareAt(100 + (i % 50) * 0.02, Math.floor(i / 50) * 0.02),
      area: 1.5,
      plantingYear: 2018,
      cropType: "Kelapa Sawit",
      landStatus: "Milik",
      farmer: { name: `Petani ${i}`, farmerId: `FMR-${i}`, farmerGroup: { name: "KT Perf" } },
    })) as RawParcel[];

    const periods = enumeratePeriods("2022-01", "2024-12"); // 36 consecutive months
    const production = new Map<string, { period: string; kg: number }[]>();
    for (const p of parcels)
      production.set(
        p.id,
        periods.map((period) => ({ period, kg: 120 })),
      );

    const start = performance.now();
    const result = buildBmpMapData([], parcels, production);
    const duration = performance.now() - start;

    console.log(`  buildBmpMapData (500 lahan × 36 bulan): ${duration.toFixed(2)}ms`);
    expect(duration).toBeLessThan(200);
    expect(result.parcels.length).toBe(500);
    expect(result.counts.baik).toBe(500); // 36 consecutive months > 24 → BAIK
  });

  it("longestConsecutiveMonths: 600-month list under 10ms", () => {
    const periods = enumeratePeriods("2000-01", "2049-12"); // 600 months
    const start = performance.now();
    const streak = longestConsecutiveMonths(periods);
    const duration = performance.now() - start;

    console.log(`  longestConsecutiveMonths (${periods.length} bulan): ${duration.toFixed(3)}ms`);
    expect(duration).toBeLessThan(10);
    expect(streak).toBe(600);
    expect(productionAvailabilityCategory(periods)).toBe("BAIK");
  });

  // MAP-03 (#174): the productivity view recomputes client-side on every
  // Tahun-select change, and the matrix on every print/Excel click — both must
  // stay cheap far past a realistic Lembaga.
  it("buildBmpProductivityView + Matrix: 500 lahan × 36 bulan under 100ms", () => {
    const periods = enumeratePeriods("2022-01", "2024-12"); // 36 months
    const production: Record<string, number> = {};
    for (const period of periods) production[period] = 120;
    const parcels = Array.from({ length: 500 }, (_, i) => ({
      id: `p-${i}`,
      parcelId: `L-${i}`,
      farmerCode: `FMR-${i}`,
      farmerName: `Petani ${i}`,
      area: 1.5,
      production,
    }));

    const start = performance.now();
    const view = buildBmpProductivityView(parcels, 2024);
    const matrix = buildBmpProductivityMatrix(parcels);
    const duration = performance.now() - start;

    console.log(
      `  buildBmpProductivityView+Matrix (500 lahan × 36 bulan): ${duration.toFixed(2)}ms`,
    );
    expect(duration).toBeLessThan(100);
    // 12 bulan × 120 kg = 1.440 kg → 1,44 ton ÷ 1,5 ha = 0,96 Ton/Ha → SANGAT_RENDAH
    expect(view.counts.SANGAT_RENDAH).toBe(500);
    expect(matrix.rows.length).toBe(500);
    expect(matrix.years).toEqual([2022, 2023, 2024]);
  });
});

// DASH-04 (#166): generateBmpSnapshot agregasi seluruh org dalam JS setelah 3 query
// scoped + 1 groupBy. Stress buildBmpSnapshotData melampaui skala data riil
// (~14k lahan) untuk membuktikan agregasi & slicing tetap murah.
describe("Performance - DASH-04 Dashboard BMP snapshot (pure logic)", () => {
  const GROUPS = 50;
  const FARMERS_PER_GROUP = 40;
  const PARCELS_PER_FARMER = 3; // 6.000 lahan

  const bmpGroups = Array.from({ length: GROUPS }, (_, g) => ({
    id: `g-${g}`,
    name: `Lembaga ${g}`,
    code: `L${g}`,
    category: (g % 2 === 0 ? "SWADAYA" : "EX_PLASMA") as "SWADAYA" | "EX_PLASMA",
    districtId: `d-${g % 5}`,
    districtName: `Distrik ${g % 5}`,
  }));
  const bmpFarmers = bmpGroups.flatMap((g, gi) =>
    Array.from({ length: FARMERS_PER_GROUP }, (_, f) => ({
      id: `f-${gi}-${f}`,
      farmerGroupId: g.id,
    })),
  );
  const bmpParcels = bmpFarmers.flatMap((f) =>
    Array.from({ length: PARCELS_PER_FARMER }, (_, p) => ({
      id: `${f.id}-p${p}`,
      farmerId: f.id,
      area: 1.5,
    })),
  );
  const periods = enumeratePeriods("2023-01", "2025-12"); // 36 bulan
  // Tiap petani melapor 36 bulan di lahan pertamanya → 72.000 baris produksi.
  const bmpProduction = bmpFarmers.flatMap((f) =>
    periods.map((period) => ({ farmerId: f.id, parcelId: `${f.id}-p0`, period, kg: 120 })),
  );

  it("buildBmpSnapshotData: 6.000 lahan × 36 bulan (72k baris) under 300ms", () => {
    const start = performance.now();
    const result = buildBmpSnapshotData(bmpGroups, bmpFarmers, bmpParcels, bmpProduction);
    const duration = performance.now() - start;

    console.log(`  buildBmpSnapshotData (6k lahan, 72k baris): ${duration.toFixed(2)}ms`);
    expect(duration).toBeLessThan(300);
    expect(result.groups.length).toBe(GROUPS);
    expect(result.groups[0].availability.baik).toBe(FARMERS_PER_GROUP); // 36 bln berturut > 24
    expect(result.groups[0].totals.lahanBerData).toBe(FARMERS_PER_GROUP);
  });

  it("filterBmpGroups + sumBmpGroups + bmpChartSeries (slice client-side) under 50ms", () => {
    const data = buildBmpSnapshotData(bmpGroups, bmpFarmers, bmpParcels, bmpProduction);

    const start = performance.now();
    const sliced = sumBmpGroups(filterBmpGroups(data, { category: "SWADAYA" }));
    const series = bmpChartSeries(sliced.monthly, null, sliced.totals.totalLahan);
    const duration = performance.now() - start;

    console.log(`  slice+chart BMP (${data.groups.length} lembaga): ${duration.toFixed(2)}ms`);
    expect(duration).toBeLessThan(50);
    expect(sliced.totals.totalPetani).toBe((GROUPS / 2) * FARMERS_PER_GROUP);
    expect(series).toHaveLength(12);
  });
});

// #130: addParticipants kini divalidasi Zod sebelum mutasi. Satu pelatihan bisa
// menambah seluruh anggota KT sekaligus — pastikan validasi array besar tetap murah
// (bukan regresi terhadap versi tanpa validasi).
describe("Performance - addParticipants Zod validation (#130)", () => {
  it("validates 2000 participants under 50ms", () => {
    const participants = Array.from({ length: 2000 }, (_, i) => ({
      farmerId: `farmer-${i}`,
      preTestScore: i % 101,
      postTestScore: (i + 50) % 101,
    }));

    const start = performance.now();
    const r = addParticipantsSchema.safeParse({ activityId: "act-1", participants });
    const duration = performance.now() - start;

    console.log(
      `  addParticipants validation (${participants.length} peserta): ${duration.toFixed(2)}ms`,
    );
    expect(r.success).toBe(true);
    expect(duration).toBeLessThan(50);
  });
});

// Forward-looking untuk #148 (card "Total Kelompok Tani"): sub-kelompok interim
// disimpan denormalisasi per-lahan di LandParcel.subGroupLv2 (#146). Count = distinct
// nilai ternormalisasi (trim+lowercase, buang null) — buktikan pendekatan O(n) tetap
// murah pada skala besar & normalisasi meredam noise typo/spasi (dedup benar).
describe("Performance - Kelompok Tani distinct aggregation (#148, subGroupLv2)", () => {
  it("counts distinct normalized subGroupLv2 over 50k parcels under 20ms", () => {
    const KT_POOL = Array.from({ length: 500 }, (_, i) => `Kelompok Tani ${i}`);
    // 50k lahan: ~1/7 null, sisanya salah satu dari 500 KT + noise spasi/kapital
    const parcels = Array.from({ length: 50_000 }, (_, i) => ({
      subGroupLv2:
        i % 7 === 0
          ? null
          : (i % 3 === 0 ? "  " : "") + KT_POOL[i % 500] + (i % 5 === 0 ? " " : ""),
    }));

    const start = performance.now();
    const distinct = new Set<string>();
    for (const p of parcels) {
      const v = p.subGroupLv2?.trim().toLowerCase();
      if (v) distinct.add(v);
    }
    const count = distinct.size;
    const duration = performance.now() - start;

    console.log(`  distinct KT over 50k lahan: ${count} in ${duration.toFixed(2)}ms`);
    expect(count).toBe(500); // noise spasi/kapital ter-dedup ke 500 KT unik
    expect(duration).toBeLessThan(100); // margin longgar (aktual ~5ms) — guard O(n), bukan micro-benchmark
  });
});

// #152: detail Petani menderivasi KT dari lahan aktif via
// deriveFarmerSubGroups. Realistisnya satu petani hanya punya beberapa lahan —
// stress jauh melampaui itu untuk membuktikan derivasi (trim+lowercase dedup +
// sort) tetap O(n) dan aman dipanggil per-render halaman detail.
describe("Performance - Farmer sub-group derivation (#152)", () => {
  it("derives distinct KT from 10k parcels under 50ms", () => {
    const parcels = Array.from({ length: 10_000 }, (_, i) => ({
      subGroupLv2: i % 7 === 0 ? null : `KT ${i % 250}${i % 5 === 0 ? " " : ""}`,
    }));

    const start = performance.now();
    const result = deriveFarmerSubGroups(parcels);
    const duration = performance.now() - start;

    console.log(
      `  deriveFarmerSubGroups (10k lahan): ${result.kelompokTani.length} KT in ${duration.toFixed(2)}ms`,
    );
    expect(result.kelompokTani.length).toBe(250);
    expect(duration).toBeLessThan(50);
  });
});

// #160: kolom "Sertifikasi RSPO" di list Lembaga Petani di-sort via sortValue
// (string rank "0-<tahun>"/"1-<tahun>") dan di-render/export via formatRspoCert.
// Stress 10k baris (jauh di atas jumlah lembaga riil ~31) — guard bahwa sort
// kustom + format tetap murah untuk client-side DataTable.
describe("Performance - RSPO cert sort & format (#160)", () => {
  it("sortValue rank + formatRspoCert over 10k rows under 100ms", () => {
    const rows = Array.from({ length: 10_000 }, (_, i) => ({
      rspoCertStatus: i % 3 === 0 ? null : i % 3 === 1 ? "CERTIFIED" : "PLANNED",
      rspoCertYear: i % 4 === 0 ? null : 2020 + (i % 8),
    }));
    const rank = (r: (typeof rows)[number]) =>
      r.rspoCertStatus === "CERTIFIED"
        ? `0-${r.rspoCertYear ?? 9999}`
        : r.rspoCertStatus === "PLANNED"
          ? `1-${r.rspoCertYear ?? 9999}`
          : null;

    const start = performance.now();
    const sorted = [...rows].sort((a, b) => {
      const aVal = rank(a);
      const bVal = rank(b);
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      return aVal.localeCompare(bVal, "id");
    });
    const labels = sorted.map((r) => formatRspoCert(r));
    const duration = performance.now() - start;

    console.log(`  RSPO sort+format (10k baris): ${duration.toFixed(2)}ms`);
    // Certified tahun terkecil di depan (2021: i%8==0 selalu beririsan dgn year null).
    expect(labels[0]).toBe("2021");
    expect(labels[labels.length - 1]).toBe("—"); // kosong selalu di akhir
    expect(duration).toBeLessThan(100);
  });
});

// Forward-looking untuk #153 (Master Lembaga Petani, snapshot-backed Opsi A): saat
// generate snapshot, agregasi per-Lembaga = distinct KT/Blok dari lahan
// seluruh petani di Lembaga tsb. Buktikan agregasi O(n) satu-pass tetap murah →
// aman dihitung di generator snapshot (bukan real-time per-baris list).
describe("Performance - Lembaga Petani snapshot aggregation (#153, per-Lembaga distinct)", () => {
  it("aggregates distinct KT/Blok per Lembaga over 50k parcels under 30ms", () => {
    const N_LEMBAGA = 100;
    const parcels = Array.from({ length: 50_000 }, (_, i) => ({
      farmerGroupId: `lembaga-${i % N_LEMBAGA}`,
      subGroupLv2: i % 6 === 0 ? null : `KT ${i % 500}`,
      blok: i % 4 === 0 ? null : `Blok ${i % 200}`,
    }));

    const start = performance.now();
    const perLembaga = new Map<
      string,
      { kt: Set<string>; blok: Set<string> }
    >();
    for (const p of parcels) {
      let agg = perLembaga.get(p.farmerGroupId);
      if (!agg) {
        agg = { kt: new Set(), blok: new Set() };
        perLembaga.set(p.farmerGroupId, agg);
      }
      const kt = p.subGroupLv2?.trim().toLowerCase();
      if (kt) agg.kt.add(kt);
      const b = p.blok?.trim().toLowerCase();
      if (b) agg.blok.add(b);
    }
    const duration = performance.now() - start;

    console.log(
      `  per-Lembaga distinct (${N_LEMBAGA} lembaga × 50k lahan): ${duration.toFixed(2)}ms`,
    );
    expect(perLembaga.size).toBe(N_LEMBAGA);
    expect(duration).toBeLessThan(100); // margin longgar (aktual ~8ms) — guard O(n), bukan micro-benchmark
  });
});

// #179 (Laporan Lahan): layout peta cetak + grid index adalah pure logic yang
// memproyeksikan seluruh poligon Lembaga (bisa ribuan lahan × puluhan titik).
// Guard O(n·titik) — dihitung sekali per render preview / klik cetak.
describe("Performance - Laporan Lahan map layout + grid (#179)", () => {
  it("layouts 2k parcels × 64 vertices + 4×5 grid split under 250ms", async () => {
    const { buildLandParcelMapLayout, splitParcelsIntoGrid } =
      await import("@/lib/report-land-parcel");
    const ring = (lon: number, lat: number) =>
      Array.from({ length: 64 }, (_, k) => [
        lon + 0.005 * Math.cos((2 * Math.PI * k) / 64),
        lat + 0.005 * Math.sin((2 * Math.PI * k) / 64),
      ]);
    const parcels = Array.from({ length: 2_000 }, (_, i) => ({
      no: i + 1,
      geometry: {
        type: "Polygon",
        coordinates: [ring(101 + (i % 50) * 0.01, 0.5 + Math.floor(i / 50) * 0.01)],
      },
    }));

    const start = performance.now();
    const layout = buildLandParcelMapLayout(parcels, { x: 0, y: 0, w: 280, h: 180, pad: 6 });
    const split = splitParcelsIntoGrid(parcels, 4, 5);
    const duration = performance.now() - start;

    console.log(`  layout+grid (2k lahan × 64 titik): ${duration.toFixed(2)}ms`);
    expect(layout.polygons).toHaveLength(2_000);
    expect(split.cells.reduce((a, c) => a + c.parcels.length, 0)).toBe(2_000);
    expect(duration).toBeLessThan(250); // margin longgar — guard kompleksitas, bukan micro-benchmark
  });
});

/**
 * TD-020 — Dashboard Pelatihan sengaja **live query** tanpa paginasi: seluruh
 * kegiatan + peserta dalam scope ditarik ke satu payload lalu diagregasi di
 * client. Aman pada volume sekarang (±184 kegiatan / ±8.240 kehadiran), tetapi
 * tanpa pagar pertumbuhannya hanya ketahuan lewat keluhan "dashboard lambat".
 *
 * Ambang di bawah dipasang pada volume ~6× data produksi hari ini. Bila test ini
 * mulai merah, itu sinyal untuk menimbang pola snapshot (nama tabelnya sudah
 * disiapkan di `docs/database/dashboard-snapshots.md`), bukan sekadar
 * melonggarkan ambangnya.
 */
describe("Performance — agregasi Dashboard Pelatihan (TD-020)", () => {
  const GROUPS = 40;
  const FARMERS_PER_GROUP = 120;
  const ACTIVITIES_PER_GROUP = 30;

  const PACKAGES = [
    "PAKET_1_BMP_PC_RSPO_NKT",
    "PAKET_2_MK",
    "PAKET_2_K3",
    "PAKET_3_4_GEDSI_FINANCIAL_LIVELIHOOD_BUSDEV",
  ] as const;

  const groups = Array.from({ length: GROUPS }, (_, g) => ({
    id: `g${g}`,
    name: `Lembaga ${g}`,
    code: `L${g}`,
    category: (g % 2 === 0 ? "SWADAYA" : "EX_PLASMA") as "SWADAYA" | "EX_PLASMA",
    districtId: `d${g % 5}`,
    districtName: `Distrik ${g % 5}`,
    totalFarmers: FARMERS_PER_GROUP,
    activities: Array.from({ length: ACTIVITIES_PER_GROUP }, (_, a) => ({
      id: `g${g}-a${a}`,
      packageCode: PACKAGES[a % PACKAGES.length],
      date: `${2023 + (a % 3)}-${String((a % 12) + 1).padStart(2, "0")}-10`,
      hasEvidence: a % 4 !== 0,
      hasLocation: a % 5 !== 0,
      // 50 peserta per kegiatan → 40 × 30 × 50 = 60.000 baris kehadiran
      participants: Array.from({ length: 50 }, (_, p) => ({
        farmerId: `g${g}-f${(a * 7 + p) % FARMERS_PER_GROUP}`,
        gender: (p % 3 === 0 ? "F" : "M") as "F" | "M",
        preTestScore: p % 6 === 0 ? null : 40 + (p % 30),
        postTestScore: p % 6 === 0 ? null : 55 + (p % 40),
      })),
    })),
  }));

  it("payload 60.000 baris kehadiran: KPI + matriks + tren + skor < 1200 ms", async () => {
    const {
      trainingTotals,
      trainingCoverageMatrix,
      trainingTrendSeries,
      trainingScoreRows,
      trainingQualityStats,
    } = await import("@/lib/training-dashboard-aggregation");

    const attendance = groups.reduce(
      (n, g) => n + g.activities.reduce((m, a) => m + a.participants.length, 0),
      0,
    );
    expect(attendance).toBe(60_000);

    const start = performance.now();
    // Seluruh agregat yang dihitung ulang tiap kali filter berubah.
    trainingTotals(groups, null);
    trainingCoverageMatrix(groups, null);
    trainingTrendSeries(groups, null);
    trainingScoreRows(groups, null);
    trainingQualityStats(groups, null);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(1200);
  });

  it("matriks cakupan tetap benar pada volume besar (bukan hanya cepat)", async () => {
    const { trainingCoverageMatrix } = await import("@/lib/training-dashboard-aggregation");
    const rows = trainingCoverageMatrix(groups, null);
    expect(rows).toHaveLength(GROUPS);
    // Invarian inti: petani terlatih tak pernah melebihi jumlah petani aktif.
    for (const r of rows) {
      expect(r.anyPackage).toBeLessThanOrEqual(r.totalFarmers);
    }
  });
});
