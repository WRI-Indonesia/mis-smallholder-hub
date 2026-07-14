import { describe, it, expect } from "vitest";
import { buildKelompokTaniDetailReport, type KtDetailRawParcel } from "@/lib/report-kelompok-tani-detail";

const P = (o: Partial<KtDetailRawParcel> & { farmerId: string }): KtDetailRawParcel => ({
  farmerCode: `KODE-${o.farmerId}`,
  farmerName: `Petani ${o.farmerId}`,
  area: 1,
  subGroupLv1: null,
  subGroupLv2: null,
  ...o,
});

const build = (parcels: KtDetailRawParcel[]) =>
  buildKelompokTaniDetailReport("lg1", "Lembaga A", parcels);

describe("buildKelompokTaniDetailReport", () => {
  it("susun hierarki Gapoktan → KT → petani dengan jml lahan & luas per petani", () => {
    const r = build([
      P({ farmerId: "f1", subGroupLv1: "G1", subGroupLv2: "KT A", area: 2 }),
      P({ farmerId: "f1", subGroupLv1: "G1", subGroupLv2: "KT A", area: 1.5 }), // lahan ke-2 f1
      P({ farmerId: "f2", subGroupLv1: "G1", subGroupLv2: "KT A", area: 3 }),
      P({ farmerId: "f3", subGroupLv1: "G1", subGroupLv2: "KT B", area: 4 }),
    ]);
    expect(r.gapoktanList).toHaveLength(1);
    const g = r.gapoktanList[0];
    expect(g.gapoktan).toBe("G1");
    expect(g.kelompokTaniList).toHaveLength(2);

    const ktA = g.kelompokTaniList.find((k) => k.kelompokTani === "KT A")!;
    expect(ktA.totalPetani).toBe(2); // f1, f2 distinct
    expect(ktA.totalLahan).toBe(3);
    expect(ktA.totalLuas).toBeCloseTo(6.5);

    const f1 = ktA.petani.find((p) => p.farmerId === "f1")!;
    expect(f1.totalLahan).toBe(2);
    expect(f1.totalLuas).toBeCloseTo(3.5);
  });

  it("petani muncul di 2 KT berbeda dihitung terpisah per KT", () => {
    const r = build([
      P({ farmerId: "f1", subGroupLv1: "G1", subGroupLv2: "KT A" }),
      P({ farmerId: "f1", subGroupLv1: "G1", subGroupLv2: "KT B" }),
    ]);
    const g = r.gapoktanList[0];
    expect(g.totalPetani).toBe(1); // distinct dalam Gapoktan
    expect(g.kelompokTaniList).toHaveLength(2);
    expect(g.kelompokTaniList.every((k) => k.totalPetani === 1)).toBe(true);
    expect(r.summary.totalPetani).toBe(1); // distinct di Lembaga
  });

  it("normalisasi trim/case tak memecah grup", () => {
    const r = build([
      P({ farmerId: "f1", subGroupLv1: "Gapoktan 1", subGroupLv2: "KT Maju" }),
      P({ farmerId: "f2", subGroupLv1: "  gapoktan 1 ", subGroupLv2: " kt maju " }),
    ]);
    expect(r.gapoktanList).toHaveLength(1);
    expect(r.gapoktanList[0].gapoktan).toBe("Gapoktan 1"); // varian pertama
    expect(r.gapoktanList[0].kelompokTaniList).toHaveLength(1);
    expect(r.gapoktanList[0].kelompokTaniList[0].kelompokTani).toBe("KT Maju");
    expect(r.gapoktanList[0].kelompokTaniList[0].totalPetani).toBe(2);
  });

  it("Gapoktan/KT null tetap muncul dan diurut di akhir", () => {
    const r = build([
      P({ farmerId: "f1", subGroupLv1: null, subGroupLv2: null }),
      P({ farmerId: "f2", subGroupLv1: "G1", subGroupLv2: "KT A" }),
    ]);
    expect(r.gapoktanList).toHaveLength(2);
    expect(r.gapoktanList[0].gapoktan).toBe("G1"); // null di akhir
    expect(r.gapoktanList[1].gapoktan).toBeNull();
    expect(r.summary.totalGapoktan).toBe(1); // hanya non-null
  });

  it("summary: distinct Gapoktan/KT/petani + total lahan & luas", () => {
    const r = build([
      P({ farmerId: "f1", subGroupLv1: "G1", subGroupLv2: "KT1", area: 2 }),
      P({ farmerId: "f2", subGroupLv1: "G1", subGroupLv2: "KT2", area: 3 }),
      P({ farmerId: "f3", subGroupLv1: "G2", subGroupLv2: "KT3", area: 5 }),
      P({ farmerId: "f1", subGroupLv1: "G1", subGroupLv2: "KT1", area: 1 }),
    ]);
    expect(r.summary.totalGapoktan).toBe(2);
    expect(r.summary.totalKelompokTani).toBe(3);
    expect(r.summary.totalPetani).toBe(3);
    expect(r.summary.totalLahan).toBe(4);
    expect(r.summary.totalLuas).toBeCloseTo(11);
  });

  it("petani diurut per nama dalam KT", () => {
    const r = build([
      P({ farmerId: "f1", farmerName: "Zulkifli", subGroupLv1: "G1", subGroupLv2: "KT A" }),
      P({ farmerId: "f2", farmerName: "Andi", subGroupLv1: "G1", subGroupLv2: "KT A" }),
    ]);
    const petani = r.gapoktanList[0].kelompokTaniList[0].petani;
    expect(petani.map((p) => p.name)).toEqual(["Andi", "Zulkifli"]);
  });

  it("input kosong → hasil kosong", () => {
    const r = build([]);
    expect(r.gapoktanList).toHaveLength(0);
    expect(r.summary).toEqual({
      totalGapoktan: 0,
      totalKelompokTani: 0,
      totalPetani: 0,
      totalLahan: 0,
      totalLuas: 0,
    });
    expect(r.lembagaTani).toBe("Lembaga A");
  });
});
