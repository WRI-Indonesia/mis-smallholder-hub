import { describe, it, expect } from "vitest";
import { buildSnapshotPdfOptions } from "@/lib/snapshot-pdf";
import { buildPDF } from "@/lib/pdf";
import type { KTDetails, SnapshotDetail } from "@/types/dashboard";

// #248: PDF Detail Snapshot — verifikasi mapper opsi (pure) + dokumen jsPDF
// yang dihasilkan tidak throw (pola build-vs-save #179/TD-019).

const kt = (over: Partial<KTDetails> = {}): KTDetails => ({
  id: "kt-1",
  name: "Lembaga Uji",
  code: "ISH-1",
  kelompokTaniCount: 3,
  totalFarmers: 120,
  totalFarmersMale: 80,
  totalFarmersFemale: 40,
  totalParcels: 150,
  totalArea: 1234.5,
  trainingCoverage: {
    PAKET_1_BMP_PC_RSPO_NKT: 100,
    PAKET_2_MK: 50,
    PAKET_2_K3: 0,
    PAKET_3_4_GEDSI_FINANCIAL_LIVELIHOOD_BUSDEV: 0,
  },
  districtId: null,
  districtName: "Siak",
  locationLat: null,
  locationLong: null,
  byYear: {},
  ...over,
});

const snapshot = (over: Partial<SnapshotDetail> = {}): SnapshotDetail => ({
  id: "snap-1",
  snapshotDate: "2025-03-15T10:30:00.000Z",
  districtId: null,
  districtName: null,
  joinedYear: null,
  createdByName: "Admin Uji",
  createdAt: "2025-03-15T10:30:00.000Z",
  data: {
    totalKelompokTani: 12,
    totalKelompokTaniLahan: 34,
    totalPetani: 5678,
    totalPetaniLaki: 4000,
    totalPetaniPerempuan: 1678,
    totalPersilLahan: 6000,
    totalLuasLahan: 8901.23,
    trainingCounts: {
      PAKET_1_BMP_PC_RSPO_NKT: 1000,
      PAKET_2_MK: 500,
      PAKET_2_K3: 250,
      PAKET_3_4_GEDSI_FINANCIAL_LIVELIHOOD_BUSDEV: 125,
    },
    certStats: {
      rspo: { certified: 2, planned: 3 },
      ispo: { certified: 1, planned: 0 },
      sapMap: { certified: 0, planned: 4 },
    },
    kelompokTaniList: [kt()],
  },
  ...over,
});

describe("buildSnapshotPdfOptions (lib/snapshot-pdf)", () => {
  it("header + metadata memakai tanggal snapshot (historis) dan KPI ringkasan", () => {
    const opts = buildSnapshotPdfOptions(snapshot());

    expect(opts.title).toBe("SNAPSHOT DASHBOARD");
    expect(opts.subtitle).toBe("Smallholder HUB Management Information System");
    expect(opts.filename).toBe("snapshot-snap-1");

    const meta = Object.fromEntries((opts.metadata ?? []).map((m) => [m.label, m.value]));
    expect(meta["Tanggal Snapshot"]).toContain("2025"); // tahun snapshot, bukan tahun unduh
    expect(meta["Filter Distrik"]).toBe("Semua Distrik");
    expect(meta["Filter Tahun"]).toBe("Semua Tahun");
    expect(meta["Dibuat Oleh"]).toBe("Admin Uji");
    expect(meta["Total Lembaga Petani"]).toBe("12");
    expect(meta["Total Petani"]).toBe("5.678");
    expect(meta["Total Luas Lahan"]).toBe("8.901,23 ha");
    expect(meta["Sertifikasi RSPO"]).toBe("2 tersertifikasi, 3 plan");
    expect(meta["Paket 1 - BMP/NKT/RSPO"]).toBe("1.000 petani");
  });

  it("kolom + baris tabel konsisten dengan tabel/Excel halaman detail", () => {
    const opts = buildSnapshotPdfOptions(snapshot());

    expect(opts.columns.map((c) => c.header)).toEqual([
      "Nama Lembaga Petani",
      "Kelompok Tani",
      "Total Petani",
      "Total Persil",
      "Luas Lahan",
      "Cakupan Pelatihan",
    ]);
    expect(opts.data[0]).toEqual({
      name: "Lembaga Uji",
      kelompokTaniCount: "3",
      totalFarmers: "120",
      totalParcels: "150",
      totalArea: "1.234,50 ha",
      coverage: "2/4 paket",
    });
  });

  it("filter terisi + snapshot pra-#169 (tanpa certStats) tetap aman", () => {
    const legacy = snapshot({ districtName: "Siak", joinedYear: 2022 });
    // @ts-expect-error snapshot lama tidak punya certStats di kolom JSON
    delete legacy.data.certStats;

    const opts = buildSnapshotPdfOptions(legacy);
    const meta = Object.fromEntries((opts.metadata ?? []).map((m) => [m.label, m.value]));
    expect(meta["Filter Distrik"]).toBe("Siak");
    expect(meta["Filter Tahun"]).toBe("2022");
    expect(meta["Sertifikasi ISPO"]).toBe("0 tersertifikasi, 0 plan");
  });

  it("opsi menghasilkan dokumen jsPDF portrait A4 tanpa throw", () => {
    const doc = buildPDF(buildSnapshotPdfOptions(snapshot()));
    expect(Math.round(doc.internal.pageSize.getWidth())).toBe(210);
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });
});
