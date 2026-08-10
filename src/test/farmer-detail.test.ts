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
    subGroupLv2: null,
    blok: null,
    plantingYear: null,
    cropType: null,
    landStatus: null,
    revision: 0,
    isPsr: false,
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
  it("summary: lahan/luas, KT turunan, checklist paket, produktivitas terakhir", () => {
    const d = buildFarmerDetail(
      {
        ...baseFarmer,
        landParcels: [
          parcel("p1", 2, { subGroupLv2: "KT A" }),
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

  it("produksi.parcelBreakdown (#239): rincian per lahan per tahun + baris Tanpa Lahan + flag excluded", () => {
    const d = buildFarmerDetail(
      {
        ...baseFarmer,
        landParcels: [
          parcel("p1", 2, { plantingYear: 2015 }),
          parcel("p2", 1, { isPsr: true }), // → excluded pada varian Exclude
        ],
        productionRecords: [
          { parcelId: "p1", period: "2025-01", yieldKg: 1000 },
          { parcelId: "p1", period: "2025-01", yieldKg: 500 }, // 2 record sebulan → agregat
          { parcelId: "p1", period: "2024-06", yieldKg: 400 }, // tahun lain → baris terpisah
          { parcelId: "p2", period: "2025-02", yieldKg: 200 },
          { parcelId: null, period: "2025-03", yieldKg: 300 }, // → baris "Tanpa Lahan"
          { parcelId: "ghost", period: "2025-04", yieldKg: 50 }, // lahan di luar daftar aktif
        ],
      },
      PACKAGES,
      2026
    );

    const bd = d.produksi.parcelBreakdown;
    const p1y2025 = bd.find((r) => r.parcelKey === "p1" && r.year === 2025)!;
    expect(p1y2025.label).toBe("L-p1");
    expect(p1y2025.months[1]).toEqual({ totalKg: 1500, recordCount: 2 });
    expect(p1y2025.totalKg).toBe(1500);
    expect(p1y2025.productivityTonHa).toBe(0.75); // 1,5 Ton ÷ 2 Ha
    expect(p1y2025.excluded).toBe(false);
    expect(p1y2025.plantingYear).toBe(2015);

    expect(bd.find((r) => r.parcelKey === "p1" && r.year === 2024)!.totalKg).toBe(400);
    expect(bd.find((r) => r.parcelKey === "p2" && r.year === 2025)!.excluded).toBe(true);

    const none = bd.find((r) => r.parcelKey === "__none__")!;
    expect(none.label).toBe("Tanpa Lahan");
    expect(none.area).toBeNull();
    expect(none.excluded).toBe(false);
    expect(none.months[3]).toEqual({ totalKg: 300, recordCount: 1 });
    expect(none.productivityTonHa).toBe(0); // tanpa luas → 0

    // Konsistensi dgn buildExcludeVariant: lahan di luar daftar aktif ikut
    // terbuang pada varian Exclude (excluded=true), beda dgn "Tanpa Lahan".
    const ghost = bd.find((r) => r.parcelKey === "ghost")!;
    expect(ghost.excluded).toBe(true);
  });

  it("tanpa produksi → lastProductivity null; ketersediaan semua NONE", () => {
    const d = buildFarmerDetail(
      { ...baseFarmer, landParcels: [parcel("p1", 1)] },
      PACKAGES
    );
    expect(d.summary.lastProductivity).toBeNull();
    expect(d.produksi.all.perYear).toEqual([]);
    expect(d.produksi.availability).toEqual({ BAIK: 0, CUKUP: 0, KURANG: 0, NONE: 1 });
  });
});

// ——— Sensor data pribadi di layar (keputusan owner 2026-07-16) ———

import { maskNik, maskIfNik, maskBirthDate } from "@/lib/mask";

describe("mask (sensor NIK & tanggal lahir)", () => {
  it("maskNik: 4 depan + 2 belakang, sisanya bintang", () => {
    expect(maskNik("1471234567890156")).toBe("1471**********56");
    expect(maskNik(null)).toBe("—");
    expect(maskNik("12345")).toBe("12345"); // terlalu pendek — tampil apa adanya
  });

  it("maskIfNik: hanya string 10–16 digit yang di-mask", () => {
    expect(maskIfNik("1471234567890156")).toBe("1471**********56");
    expect(maskIfNik("LP-1401-001")).toBe("LP-1401-001"); // kode lahan tak disentuh
    expect(maskIfNik(null)).toBe("—");
  });

  it("maskBirthDate: tanggal & bulan disensor, tahun tampil", () => {
    expect(maskBirthDate(new Date("1980-05-12"))).toBe("** *** 1980");
    expect(maskBirthDate(null)).toBe("—");
  });
});
