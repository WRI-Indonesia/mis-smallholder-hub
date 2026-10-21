import { describe, it, expect } from "vitest";
import { buildTrainingReport, type TrainingRawActivity, type TrainingRawFarmer } from "@/lib/report-training";

/**
 * Agregasi murni Report Pelatihan (`buildTrainingReport`, dipindah dari
 * `getTrainingReport` — audit #440 F2): tanggal paket = kegiatan terawal,
 * peserta non-aktif tetap dihitung di total peserta tetapi tidak di cakupan
 * paket, persentase 2 desimal, tanpa petani → 0%.
 */
const P1 = { code: "PAKET_1_BMP_PC_RSPO_NKT", name: "Paket 1" };
const MK = { code: "PAKET_2_MK", name: "Paket 2 MK" };
const K3 = { code: "PAKET_2_K3", name: "Paket 2 K3" };
const P34 = { code: "PAKET_3_4_GEDSI_FINANCIAL_LIVELIHOOD_BUSDEV", name: "Paket 3-4" };

const farmer = (id: string, gender: "M" | "F" = "M"): TrainingRawFarmer => ({ id, farmerId: `X.${id}`, name: `Petani ${id}`, gender });
const part = (farmerId: string, pre: number | null = null, post: number | null = null) => ({ farmerId, preTestScore: pre, postTestScore: post });
const act = (id: string, date: string, pkg: { code: string; name: string }, participants: ReturnType<typeof part>[], location: string | null = null): TrainingRawActivity => ({
  id, trainingDate: new Date(date), location, package: pkg, participants,
});

describe("buildTrainingReport — tanggal paket per petani", () => {
  it("tanggal paket = kegiatan TERAWAL yang diikuti (urutan masukan tak berpengaruh); paket lain terpisah", () => {
    const farmers = [farmer("f1"), farmer("f2", "F")];
    const sorted = [
      act("a1", "2026-01-10T00:00:00.000Z", P1, [part("f1")]),
      act("a2", "2026-03-05T00:00:00.000Z", P1, [part("f1"), part("f2")]),
      act("a3", "2026-04-01T00:00:00.000Z", K3, [part("f2")]),
    ];
    const out = buildTrainingReport(sorted, farmers);
    expect(out.farmers).toEqual([
      { id: "f1", farmerId: "X.f1", name: "Petani f1", gender: "M", paket1Date: "2026-01-10T00:00:00.000Z", paket2MKDate: null, paket2K3Date: null, paket34Date: null },
      { id: "f2", farmerId: "X.f2", name: "Petani f2", gender: "F", paket1Date: "2026-03-05T00:00:00.000Z", paket2MKDate: null, paket2K3Date: "2026-04-01T00:00:00.000Z", paket34Date: null },
    ]);
    // Kegiatan dibalik → tanggal paket tetap yang terawal.
    expect(buildTrainingReport([...sorted].reverse(), farmers).farmers).toEqual(out.farmers);
  });

  it("baris petani mengikuti urutan & isi daftar petani aktif (tanpa pelatihan → semua tanggal null)", () => {
    const out = buildTrainingReport([], [farmer("f2"), farmer("f1")]);
    expect(out.farmers.map((f) => f.id)).toEqual(["f2", "f1"]);
    expect(out.farmers[0]).toMatchObject({ paket1Date: null, paket2MKDate: null, paket2K3Date: null, paket34Date: null });
  });
});

describe("buildTrainingReport — Tab Kegiatan", () => {
  it("satu baris per kegiatan; peserta dipetakan ke kode & nama petani, skor pre/post diteruskan", () => {
    const out = buildTrainingReport(
      [act("a1", "2026-02-01T00:00:00.000Z", MK, [part("f1", 40, 80)], "Balai Desa")],
      [farmer("f1")],
    );
    expect(out.activities).toEqual([
      {
        id: "a1", packageName: "Paket 2 MK", packageCode: "PAKET_2_MK", trainingDate: "2026-02-01T00:00:00.000Z", location: "Balai Desa",
        totalParticipants: 1,
        participants: [{ farmerId: "f1", farmerIdCode: "X.f1", name: "Petani f1", preTestScore: 40, postTestScore: 80 }],
      },
    ]);
  });

  it("peserta yang bukan petani aktif Lembaga (nonaktif/pindah) → tetap tampil dengan kode & nama '—'", () => {
    const out = buildTrainingReport([act("a1", "2026-02-01T00:00:00.000Z", P1, [part("f1"), part("f-nonaktif", 10, null)])], [farmer("f1")]);
    expect(out.activities[0].totalParticipants).toBe(2);
    expect(out.activities[0].participants[1]).toEqual({ farmerId: "f-nonaktif", farmerIdCode: "—", name: "—", preTestScore: 10, postTestScore: null });
  });
});

describe("buildTrainingReport — ringkasan", () => {
  it("total peserta = kehadiran, peserta unik = petani berbeda (termasuk non-aktif); cakupan paket hanya petani aktif", () => {
    const farmers = [farmer("f1"), farmer("f2"), farmer("f3")];
    const out = buildTrainingReport(
      [
        act("a1", "2026-01-10T00:00:00.000Z", P1, [part("f1"), part("f2"), part("f-nonaktif")]),
        act("a2", "2026-02-10T00:00:00.000Z", P1, [part("f1")]), // ulang paket → tak menambah cakupan
        act("a3", "2026-03-10T00:00:00.000Z", MK, [part("f1"), part("f-nonaktif")]),
        act("a4", "2026-04-10T00:00:00.000Z", P34, [part("f3")]),
      ],
      farmers,
    );
    expect(out.summary).toEqual({
      totalPetani: 3,
      totalKegiatan: 4,
      totalPeserta: 7,
      totalPesertaUnik: 4, // f1, f2, f3, f-nonaktif
      totalUnikPaket1: 2,
      pctPaket1: 66.67,
      totalUnikPaket2MK: 1,
      pctPaket2MK: 33.33,
      totalUnikPaket2K3: 0,
      pctPaket2K3: 0,
      totalUnikPaket34: 1,
      pctPaket34: 33.33,
    });
  });

  it("persentase dibulatkan 2 desimal (1/7 → 14,29; 7/7 → 100)", () => {
    const farmers = Array.from({ length: 7 }, (_, i) => farmer(`f${i}`));
    const out = buildTrainingReport(
      [
        act("a1", "2026-01-01T00:00:00.000Z", K3, [part("f0")]),
        act("a2", "2026-01-02T00:00:00.000Z", P1, farmers.map((f) => part(f.id))),
      ],
      farmers,
    );
    expect(out.summary.pctPaket2K3).toBe(14.29);
    expect(out.summary.pctPaket1).toBe(100);
  });

  it("totalPetani 0 → semua persentase 0 (bukan NaN), peserta non-aktif tetap terhitung", () => {
    const out = buildTrainingReport([act("a1", "2026-01-01T00:00:00.000Z", P1, [part("f-nonaktif")])], []);
    expect(out.farmers).toEqual([]);
    expect(out.summary).toMatchObject({
      totalPetani: 0, totalKegiatan: 1, totalPeserta: 1, totalPesertaUnik: 1,
      totalUnikPaket1: 0, pctPaket1: 0, pctPaket2MK: 0, pctPaket2K3: 0, pctPaket34: 0,
    });
  });

  it("tanpa kegiatan & tanpa petani → ringkasan nol semua", () => {
    const out = buildTrainingReport([], []);
    expect(Object.values(out.summary).every((v) => v === 0)).toBe(true);
    expect(out.activities).toEqual([]);
  });
});
