import { describe, it, expect } from "vitest";
import {
  documentTypeShort,
  summarizeDocuments,
  summarizeHolderNames,
  sumStatedArea,
  summarizeStdb,
} from "@/lib/land-parcel-satellite-format";
import { buildLandParcelReport, type LpRawParcel } from "@/lib/report-land-parcel";

/** Ringkasan satelit lahan untuk tabel padat (Report Lahan, tab Lahan detail Petani) — #296. */
describe("land-parcel-satellite-format", () => {
  const docs = [
    { type: "SHM", number: "727", holderName: "Abdul Rohman", statedArea: 0.25 },
    { type: "SKT", number: "05.16.08.05.1.105108", holderName: "Abdul Rohman", statedArea: 2 },
    { type: "OTHER", number: null, holderName: null, statedArea: null },
  ];

  it("documentTypeShort: enum → akronim, OTHER/HIBAH/JUAL_BELI → kata", () => {
    expect(documentTypeShort("SHM")).toBe("SHM");
    expect(documentTypeShort("OTHER")).toBe("Lainnya");
    expect(documentTypeShort("JUAL_BELI")).toBe("Jual Beli");
    expect(documentTypeShort("HIBAH")).toBe("Hibah");
  });

  it("summarizeDocuments: 'JENIS nomor' digabung '; ', tanpa nomor hanya jenis, kosong → null", () => {
    expect(summarizeDocuments(docs)).toBe("SHM 727; SKT 05.16.08.05.1.105108; Lainnya");
    expect(summarizeDocuments([])).toBeNull();
  });

  it("summarizeHolderNames: distinct, null dibuang", () => {
    expect(summarizeHolderNames(docs)).toBe("Abdul Rohman");
    expect(summarizeHolderNames([{ type: "SHM", number: "1", holderName: null, statedArea: null }])).toBeNull();
  });

  it("sumStatedArea: jumlah lintas dokumen; tak satu pun terisi → null (bukan 0)", () => {
    expect(sumStatedArea(docs)).toBe(2.25);
    expect(sumStatedArea([{ type: "SHM", number: "1", holderName: null, statedArea: null }])).toBeNull();
  });

  it("summarizeStdb: distinct + trim; kosong → null", () => {
    expect(summarizeStdb(["1637/53/1401/6/2025", " 1637/53/1401/6/2025", "3475"])).toBe("1637/53/1401/6/2025; 3475");
    expect(summarizeStdb([])).toBeNull();
  });
});

describe("buildLandParcelReport — kolom legalitas (#296)", () => {
  const base = (o: Partial<LpRawParcel> & { id: string }): LpRawParcel => ({
    parcelCode: o.id, farmerId: "f1", farmerCode: "F-1", farmerName: "Budi", farmerGroupId: "g1", lembagaTani: "KUD A",
    subGroupLv2: null, blok: null, cropType: null, species: null, isPsr: false, plantingYear: null, area: 1, ...o,
  });

  it("pemanggil lama tanpa documents/stdbNumbers → kolom legalitas null (kompatibel)", () => {
    const r = buildLandParcelReport([base({ id: "p1" })]);
    expect(r.rows[0]).toMatchObject({ surat: null, namaDiSurat: null, luasTertera: null, stdb: null });
  });

  it("dokumen & STDB diringkas ke satu baris per lahan", () => {
    const r = buildLandParcelReport([
      base({
        id: "p1",
        documents: [{ type: "SHM", number: "727", holderName: "Abdul Rohman", statedArea: 0.25 }],
        stdbNumbers: ["1637/53/1401/6/2025"],
      }),
    ]);
    expect(r.rows[0]).toMatchObject({ surat: "SHM 727", namaDiSurat: "Abdul Rohman", luasTertera: 0.25, stdb: "1637/53/1401/6/2025" });
  });
});
