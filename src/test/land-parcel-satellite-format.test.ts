import { describe, it, expect } from "vitest";
import {
  documentTypeShort,
  parcelMapperLabel,
  parcelMapperShort,
  PARCEL_MAPPERS,
  DEFAULT_PARCEL_MAPPER,
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
    const terbit = (number: string) => ({ number, stage: "TERBIT" });
    expect(summarizeStdb([terbit("1637/53/1401/6/2025"), terbit(" 1637/53/1401/6/2025"), terbit("3475")])).toBe(
      "1637/53/1401/6/2025; 3475",
    );
    expect(summarizeStdb([])).toBeNull();
  });

  it("summarizeStdb: baris pra-terbit tampil bertahap, bukan string kosong (#306)", () => {
    expect(summarizeStdb([{ number: null, stage: "PERSIAPAN_DATA" }])).toBe("Persiapan Data — belum bernomor");
    expect(summarizeStdb([{ number: null, stage: "PENGAJUAN" }])).toBe("Pengajuan — belum bernomor");
    // Nomor pra-terbit (mis. nomor berkas) tetap tampil, tapi tahapnya ikut —
    // tanpa itu pembaca menyangka STDB-nya sudah terbit.
    expect(summarizeStdb([{ number: "3475", stage: "REVISI" }])).toBe("3475 (Revisi)");
    // TERBIT bernomor ditulis polos supaya kolom roster tak berubah bentuk.
    expect(summarizeStdb([{ number: "3475", stage: "TERBIT" }])).toBe("3475");
  });
});

describe("buildLandParcelReport — kolom legalitas (#296)", () => {
  const base = (o: Partial<LpRawParcel> & { id: string }): LpRawParcel => ({
    parcelCode: o.id, farmerId: "f1", farmerCode: "F-1", farmerName: "Budi", farmerGroupId: "g1", lembagaTani: "KUD A",
    subGroupLv2: null, blok: null, cropType: null, species: null, isPsr: false, plantingYear: null, area: 1, ...o,
  });

  it("pemanggil lama tanpa documents/stdbs → kolom legalitas null (kompatibel)", () => {
    const r = buildLandParcelReport([base({ id: "p1" })]);
    expect(r.rows[0]).toMatchObject({ surat: null, namaDiSurat: null, luasTertera: null, stdb: null });
  });

  it("dokumen & STDB diringkas ke satu baris per lahan", () => {
    const r = buildLandParcelReport([
      base({
        id: "p1",
        documents: [{ type: "SHM", number: "727", holderName: "Abdul Rohman", statedArea: 0.25 }],
        stdbs: [{ number: "1637/53/1401/6/2025", stage: "TERBIT" }],
      }),
    ]);
    expect(r.rows[0]).toMatchObject({ surat: "SHM 727", namaDiSurat: "Abdul Rohman", luasTertera: 0.25, stdb: "1637/53/1401/6/2025" });
  });

  /** Pemeta UL Parcel Code (2026-08-28): kolom `source` = SIAPA yang memetakan. */
  describe("pemeta UL Parcel Code", () => {
    it("defaults to Meridia — vendor yang ditugaskan donor (UL)", () => {
      expect(DEFAULT_PARCEL_MAPPER).toBe("MERIDIA");
      expect(PARCEL_MAPPERS.map((m) => m.value)).toEqual(["MERIDIA", "WRI", "SWADAYA"]);
    });

    it("melabeli pemeta dikenal panjang & pendek", () => {
      expect(parcelMapperLabel("MERIDIA")).toBe("Meridia — vendor pemetaan (ditugaskan UL)");
      expect(parcelMapperShort("MERIDIA")).toBe("Meridia");
      expect(parcelMapperShort("SWADAYA")).toBe("Swadaya");
    });

    it("menampilkan sumber tak dikenal apa adanya (isian bebas tidak hilang)", () => {
      expect(parcelMapperLabel("Dinas Perkebunan")).toBe("Dinas Perkebunan");
      expect(parcelMapperShort("parcel_code")).toBe("parcel_code");
    });
  });

});
