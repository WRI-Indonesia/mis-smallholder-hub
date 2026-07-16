import { describe, it, expect } from "vitest";
import {
  buildFarmerDetail,
  computeProfileCompleteness,
  type FarmerDetailRawInput,
  type FarmerDetailRawParticipation,
} from "@/lib/farmer-detail";

const PACKAGES = [
  { code: "PAKET_1_BMP_PC_RSPO_NKT", name: "Paket 1 - BMP" },
  { code: "PAKET_2_MK", name: "Paket 2 - MK" },
];

function parcel(id: string, area: number | null, extra: Partial<FarmerDetailRawInput["landParcels"][number]> = {}) {
  return {
    id,
    parcelId: `L-${id}`,
    area,
    subGroupLv1: null,
    subGroupLv2: null,
    blok: null,
    plantingYear: null,
    cropType: null,
    landStatus: null,
    revision: 0,
    ...extra,
  };
}

function participation(
  id: string,
  packageCode: string,
  date: string,
  scores: { pre?: number | null; post?: number | null } = {}
): FarmerDetailRawParticipation {
  return {
    id,
    packageCode,
    packageName: packageCode,
    trainingDate: new Date(date),
    location: null,
    preTestScore: scores.pre ?? null,
    postTestScore: scores.post ?? null,
  };
}

const baseFarmer: FarmerDetailRawInput = {
  nik: "1234567890123456",
  address: "Jl. Kebun",
  birthPlace: "Siak",
  birthDate: new Date("1980-05-01"),
  joinedYear: 2024,
  landParcels: [],
  trainingParticipants: [],
  productionRecords: [],
};

describe("computeProfileCompleteness (#172)", () => {
  it("semua terisi & NIK 16 digit → 5/5", () => {
    const p = computeProfileCompleteness(baseFarmer);
    expect(p).toEqual({ complete: 5, total: 5, missing: [] });
  });

  it("NIK salah format dihitung belum lengkap; field kosong tercatat di missing", () => {
    const p = computeProfileCompleteness({
      nik: "123", // bukan 16 digit
      address: "  ", // whitespace = kosong
      birthPlace: null,
      birthDate: new Date("1980-05-01"),
      joinedYear: null,
    });
    expect(p.complete).toBe(1);
    expect(p.missing).toEqual(["NIK valid", "Alamat", "Tempat lahir", "Tahun bergabung"]);
  });
});

describe("buildFarmerDetail (#172)", () => {
  it("summary: lahan/luas, KT-Gapoktan turunan, checklist paket, produktivitas terakhir", () => {
    const d = buildFarmerDetail(
      {
        ...baseFarmer,
        landParcels: [
          parcel("p1", 2, { subGroupLv1: "KUD Maju", subGroupLv2: "KT A" }),
          parcel("p2", 3, { subGroupLv2: "kt a " }), // varian → tetap 1 KT
        ],
        trainingParticipants: [
          participation("t1", "PAKET_1_BMP_PC_RSPO_NKT", "2025-01-10", { pre: 40, post: 80 }),
          participation("t2", "PAKET_1_BMP_PC_RSPO_NKT", "2026-02-01"),
        ],
        productionRecords: [
          { parcelId: "p1", period: "2025-06", yieldKg: 1000 },
          { parcelId: "p2", period: "2026-01", yieldKg: 3000 },
        ],
      },
      PACKAGES
    );

    expect(d.summary.totalParcels).toBe(2);
    expect(d.summary.totalArea).toBe(5);
    expect(d.subGroups.kelompokTani).toEqual(["KT A"]);
    expect(d.subGroups.gapoktan).toEqual(["KUD Maju"]);

    // Checklist: Paket 1 done (2 partisipasi), Paket 2 belum
    const p1 = d.pelatihan.checklist.find((c) => c.code === "PAKET_1_BMP_PC_RSPO_NKT")!;
    expect(p1.done).toBe(true);
    expect(p1.participations).toBe(2);
    expect(d.pelatihan.checklist.find((c) => c.code === "PAKET_2_MK")!.done).toBe(false);
    expect(d.summary.packagesDone).toBe(1);
    expect(d.summary.packagesTotal).toBe(2);

    // Riwayat terbaru dulu
    expect(d.pelatihan.history.map((h) => h.id)).toEqual(["t2", "t1"]);

    // Produktivitas tahun terakhir ber-data: 2026 → 3 Ton ÷ 3 Ha (hanya p2 melapor)
    expect(d.summary.lastProductivity).toEqual({ year: 2026, tonHa: 1 });
    expect(d.summary.productionTotalKg).toBe(4000);
    expect(d.summary.productionYears).toEqual([2025, 2026]);
  });

  it("tanpa produksi → lastProductivity null; ketersediaan semua NONE", () => {
    const d = buildFarmerDetail(
      { ...baseFarmer, landParcels: [parcel("p1", 1)] },
      PACKAGES
    );
    expect(d.summary.lastProductivity).toBeNull();
    expect(d.produksi.perYear).toEqual([]);
    expect(d.produksi.availability).toEqual({ BAIK: 0, CUKUP: 0, KURANG: 0, NONE: 1 });
  });
});
