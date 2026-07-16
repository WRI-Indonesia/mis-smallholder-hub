import { describe, it, expect } from "vitest";
import {
  buildFarmerGroupDetail,
  type DetailRawActivity,
  type DetailRawFarmer,
} from "@/lib/farmer-group-detail";

const PACKAGES = [
  { code: "PAKET_1_BMP_PC_RSPO_NKT", name: "Paket 1 - BMP" },
  { code: "PAKET_2_MK", name: "Paket 2 - MK" },
];

function parcel(id: string, area: number | null, opts: Partial<DetailRawFarmer["landParcels"][number]> = {}) {
  return { id, area, subGroupLv1: null, subGroupLv2: null, blok: null, ...opts };
}

/** Periods "YYYY-MM" berturut mulai start, sebanyak n — untuk kategori ketersediaan. */
function months(startYear: number, startMonth: number, n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const m = startMonth + i;
    const y = startYear + Math.floor((m - 1) / 12);
    const mm = ((m - 1) % 12) + 1;
    return `${y}-${String(mm).padStart(2, "0")}`;
  });
}

describe("buildFarmerGroupDetail (#171)", () => {
  it("summary: hitung petani L/P, tanpa lahan, persil/luas, KT/Gapoktan/Blok distinct", () => {
    const farmers: DetailRawFarmer[] = [
      {
        id: "f1", farmerId: "F-001", name: "Andi", gender: "M",
        landParcels: [
          parcel("p1", 1.5, { subGroupLv1: "KUD Maju", subGroupLv2: "KT A", blok: "Blok 1" }),
          parcel("p2", 2.5, { subGroupLv1: "kud maju ", subGroupLv2: "KT B", blok: " blok 1 " }), // varian kapital/spasi → 1 Gapoktan, 1 blok
        ],
        trainingParticipants: [{ packageCode: "PAKET_1_BMP_PC_RSPO_NKT" }],
        productionRecords: [],
      },
      {
        id: "f2", farmerId: "F-002", name: "Budi", gender: "F",
        landParcels: [],
        trainingParticipants: [],
        productionRecords: [],
      },
    ];

    const d = buildFarmerGroupDetail("g1", "Lembaga Uji", farmers, [], PACKAGES);
    expect(d.summary.totalFarmers).toBe(2);
    expect(d.summary.totalFarmersMale).toBe(1);
    expect(d.summary.totalFarmersFemale).toBe(1);
    expect(d.summary.farmersWithoutParcel).toBe(1);
    expect(d.summary.totalParcels).toBe(2);
    expect(d.summary.totalArea).toBe(4);
    expect(d.summary.gapoktanCount).toBe(1); // "KUD Maju" ≡ "kud maju "
    expect(d.summary.kelompokTaniCount).toBe(2); // KT A + KT B
    expect(d.summary.blokCount).toBe(1); // "Blok 1" ≡ " blok 1 "
    expect(d.struktur.summary.totalPetani).toBe(1); // hanya f1 punya lahan
  });

  it("produksi: agregat per tahun, produktivitas Ton/Ha atas luas pelapor (dedupe), record tanpa lahan hanya masuk total", () => {
    const farmers: DetailRawFarmer[] = [
      {
        id: "f1", farmerId: "F-001", name: "Andi", gender: "M",
        landParcels: [parcel("p1", 2), parcel("p2", 3)],
        trainingParticipants: [],
        productionRecords: [
          { parcelId: "p1", period: "2025-01", yieldKg: 1000 },
          { parcelId: "p1", period: "2025-02", yieldKg: 1000 }, // p1 dua record → luas dihitung sekali
          { parcelId: "p2", period: "2025-03", yieldKg: 2000 },
          { parcelId: null, period: "2025-04", yieldKg: 500 }, // tanpa lahan → total saja
          { parcelId: "p1", period: "2024-12", yieldKg: 700 }, // tahun lain
        ],
      },
    ];

    const d = buildFarmerGroupDetail("g1", "Lembaga Uji", farmers, [], PACKAGES);
    expect(d.summary.productionTotalKg).toBe(5200);
    expect(d.summary.productionYears).toEqual([2024, 2025]);

    expect(d.produksi.perYear.map((y) => y.year)).toEqual([2025, 2024]); // terbaru dulu
    const y2025 = d.produksi.perYear[0];
    expect(y2025.totalKg).toBe(4500);
    expect(y2025.recordCount).toBe(4);
    expect(y2025.parcelsReporting).toBe(2);
    expect(y2025.areaReporting).toBe(5); // p1 (2) + p2 (3), dedupe
    expect(y2025.productivityTonHa).toBe(0.9); // 4,5 Ton ÷ 5 Ha

    const y2024 = d.produksi.perYear[1];
    expect(y2024.areaReporting).toBe(2);
    expect(y2024.productivityTonHa).toBe(0.35); // 0,7 ÷ 2
  });

  it("ketersediaan per lahan: kategori dari run bulan berturut (aturan MAP-02)", () => {
    const farmers: DetailRawFarmer[] = [
      {
        id: "f1", farmerId: "F-001", name: "Andi", gender: "M",
        landParcels: [parcel("pBaik", 1), parcel("pCukup", 1), parcel("pKurang", 1), parcel("pNone", 1)],
        trainingParticipants: [],
        productionRecords: [
          ...months(2023, 1, 25).map((period) => ({ parcelId: "pBaik", period, yieldKg: 10 })),
          ...months(2025, 1, 12).map((period) => ({ parcelId: "pCukup", period, yieldKg: 10 })),
          ...months(2025, 1, 3).map((period) => ({ parcelId: "pKurang", period, yieldKg: 10 })),
        ],
      },
    ];

    const d = buildFarmerGroupDetail("g1", "Lembaga Uji", farmers, [], PACKAGES);
    expect(d.produksi.availability).toEqual({ BAIK: 1, CUKUP: 1, KURANG: 1, NONE: 1 });
  });

  it("pelatihan: cakupan distinct per petani + aktivitas urut terbaru dengan rata-rata pre/post null-safe", () => {
    const farmers: DetailRawFarmer[] = [
      {
        id: "f1", farmerId: "F-001", name: "Andi", gender: "M",
        landParcels: [],
        // Dua partisipasi paket sama → tetap 1 petani ter-cover
        trainingParticipants: [
          { packageCode: "PAKET_1_BMP_PC_RSPO_NKT" },
          { packageCode: "PAKET_1_BMP_PC_RSPO_NKT" },
        ],
        productionRecords: [],
      },
      { id: "f2", farmerId: "F-002", name: "Budi", gender: "M", landParcels: [], trainingParticipants: [], productionRecords: [] },
    ];
    const activities: DetailRawActivity[] = [
      {
        id: "a1", trainingDate: new Date("2026-01-10"), location: "Balai Desa",
        packageCode: "PAKET_1_BMP_PC_RSPO_NKT", packageName: "Paket 1 - BMP",
        participants: [
          { preTestScore: 40, postTestScore: 80 },
          { preTestScore: 60, postTestScore: null }, // post null → hanya pre ikut rata-rata pre
        ],
      },
      {
        id: "a2", trainingDate: new Date("2026-03-05"), location: null,
        packageCode: "PAKET_2_MK", packageName: "Paket 2 - MK",
        participants: [{ preTestScore: null, postTestScore: null }],
      },
    ];

    const d = buildFarmerGroupDetail("g1", "Lembaga Uji", farmers, activities, PACKAGES);

    const p1 = d.pelatihan.coverage.find((c) => c.code === "PAKET_1_BMP_PC_RSPO_NKT")!;
    expect(p1.covered).toBe(1);
    expect(p1.totalFarmers).toBe(2);
    expect(p1.coveragePct).toBe(50);
    // Rataan per paket dari seluruh peserta aktivitas paket tsb.
    expect(p1.avgPreTest).toBe(50); // (40+60)/2
    expect(p1.avgPostTest).toBe(80);
    const p2 = d.pelatihan.coverage.find((c) => c.code === "PAKET_2_MK")!;
    expect(p2.covered).toBe(0);
    expect(p2.avgPreTest).toBeNull();
    expect(p2.avgPostTest).toBeNull();

    expect(d.pelatihan.activities.map((a) => a.id)).toEqual(["a2", "a1"]); // terbaru dulu
    const a1 = d.pelatihan.activities.find((a) => a.id === "a1")!;
    expect(a1.participantCount).toBe(2);
    expect(a1.avgPreTest).toBe(50); // (40+60)/2
    expect(a1.avgPostTest).toBe(80); // hanya 1 skor
    const a2 = d.pelatihan.activities.find((a) => a.id === "a2")!;
    expect(a2.avgPreTest).toBeNull();
    expect(a2.avgPostTest).toBeNull();
  });

  it("input kosong aman: semua nol, tanpa error", () => {
    const d = buildFarmerGroupDetail("g1", "Lembaga Uji", [], [], PACKAGES);
    expect(d.summary.totalFarmers).toBe(0);
    expect(d.summary.productionYears).toEqual([]);
    expect(d.produksi.perYear).toEqual([]);
    expect(d.produksi.availability).toEqual({ BAIK: 0, CUKUP: 0, KURANG: 0, NONE: 0 });
    expect(d.pelatihan.coverage.every((c) => c.covered === 0 && c.coveragePct === 0)).toBe(true);
  });
});
