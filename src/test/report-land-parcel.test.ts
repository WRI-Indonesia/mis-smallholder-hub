import { describe, it, expect } from "vitest";
import { buildLandParcelReport, type LpRawParcel } from "@/lib/report-land-parcel";

const P = (o: Partial<LpRawParcel> & { id: string; farmerId: string }): LpRawParcel => ({
  parcelCode: `L-${o.id}`,
  farmerCode: `F-${o.farmerId}`,
  farmerName: "Petani",
  farmerGroupId: "lg1",
  lembagaTani: "Lembaga A",
  subGroupLv1: null,
  subGroupLv2: null,
  blok: null,
  area: 1,
  ...o,
});

describe("buildLandParcelReport", () => {
  it("1 baris per lahan dengan kolom Lembaga/Petani/ID Petani/ID Lahan/KT", () => {
    const r = buildLandParcelReport([
      P({ id: "p1", farmerId: "f1", farmerName: "Budi", farmerCode: "SH-001", parcelCode: "LHN-001", subGroupLv2: "KT Maju" }),
      P({ id: "p2", farmerId: "f1", farmerName: "Budi", farmerCode: "SH-001", parcelCode: "LHN-002", subGroupLv2: "KT Maju" }),
    ]);
    expect(r.rows).toHaveLength(2);
    expect(r.rows[0]).toMatchObject({
      lembagaTani: "Lembaga A",
      namaPetani: "Budi",
      idPetani: "SH-001",
      idLahan: "LHN-001",
      kelompokTani: "KT Maju",
    });
  });

  it("normalisasi trim: KT/Gapoktan/Blok kosong/whitespace → null", () => {
    const r = buildLandParcelReport([
      P({ id: "p1", farmerId: "f1", subGroupLv1: "  ", subGroupLv2: "", blok: "   " }),
      P({ id: "p2", farmerId: "f1", subGroupLv2: "  KT Subur " }),
    ]);
    const p1 = r.rows.find((x) => x.id === "p1")!;
    expect(p1.kelompokTani).toBeNull();
    expect(p1.gapoktan).toBeNull();
    expect(p1.blok).toBeNull();
    const p2 = r.rows.find((x) => x.id === "p2")!;
    expect(p2.kelompokTani).toBe("KT Subur");
  });

  it("summary: distinct petani/KT/Lembaga + total luas (null = 0)", () => {
    const r = buildLandParcelReport([
      P({ id: "p1", farmerId: "f1", subGroupLv2: "KT Maju", area: 2 }),
      P({ id: "p2", farmerId: "f1", subGroupLv2: "kt maju ", area: null }), // varian case/spasi = KT sama
      P({ id: "p3", farmerId: "f2", subGroupLv2: "KT Subur", area: 1.5 }),
      P({ id: "p4", farmerId: "f3", farmerGroupId: "lg2", lembagaTani: "Lembaga B", subGroupLv2: "KT Maju", area: 0.5 }),
    ]);
    expect(r.summary.totalLahan).toBe(4);
    expect(r.summary.totalPetani).toBe(3);
    // KT Maju lg1 + KT Subur lg1 + KT Maju lg2 (distinct per Lembaga, case-insensitive)
    expect(r.summary.totalKelompokTani).toBe(3);
    expect(r.summary.totalLembagaTani).toBe(2);
    expect(r.summary.totalLuas).toBeCloseTo(4);
  });

  it("urutan: Lembaga → KT (null di akhir) → Nama Petani → ID Lahan", () => {
    const r = buildLandParcelReport([
      P({ id: "p1", farmerId: "f1", lembagaTani: "Lembaga B", farmerGroupId: "lg2", subGroupLv2: "KT A" }),
      P({ id: "p2", farmerId: "f2", lembagaTani: "Lembaga A", subGroupLv2: null, farmerName: "Zul" }),
      P({ id: "p3", farmerId: "f3", lembagaTani: "Lembaga A", subGroupLv2: "KT B", farmerName: "Budi", parcelCode: "LHN-2" }),
      P({ id: "p4", farmerId: "f3", lembagaTani: "Lembaga A", subGroupLv2: "KT B", farmerName: "Budi", parcelCode: "LHN-1" }),
      P({ id: "p5", farmerId: "f4", lembagaTani: "Lembaga A", subGroupLv2: "KT B", farmerName: "Andi" }),
    ]);
    expect(r.rows.map((x) => x.id)).toEqual(["p5", "p4", "p3", "p2", "p1"]);
  });

  it("input kosong → summary nol & rows kosong", () => {
    const r = buildLandParcelReport([]);
    expect(r.rows).toHaveLength(0);
    expect(r.summary).toEqual({
      totalLahan: 0,
      totalPetani: 0,
      totalKelompokTani: 0,
      totalLembagaTani: 0,
      totalLuas: 0,
    });
  });
});
