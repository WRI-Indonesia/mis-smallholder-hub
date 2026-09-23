import { describe, it, expect } from "vitest";
import {
  LAND_PARCEL_EXPORT_COLUMNS,
  landParcelExportColumns,
  landParcelExportRow,
  type LandParcelOptionalCol,
} from "@/lib/report-land-parcel";
import { formatParcelNodes } from "@/lib/parcel-node-coords";
import type { LandParcelReportRow } from "@/types/report";

/**
 * Kesepakatan kolom ↔ baris ekspor Laporan Lahan (Excel & PDF).
 *
 * Pelajaran #323/TD-039: kolom yang kuncinya tidak dipetakan di baris terbit
 * KOSONG tanpa error — berkasnya terlihat sah dan bisa beredar. Kolom Patok
 * (#331) sempat begitu di Excel & PDF (review 2026-09-15) karena kolom dan
 * baris ditulis di dua tempat. Kini keduanya dari satu definisi; test ini
 * memastikan setiap kunci kolom punya nilai di baris.
 */

const ROW: LandParcelReportRow = {
  id: "lp-1",
  farmerGroupId: "kt-1",
  lembagaTani: "KP Hasrat Jaya Pagaruyung",
  namaPetani: "Budi",
  idPetani: "ISH-1401-03-0001",
  idLahan: "ISH-1401-03-0001-01",
  kelompokTani: "KT Maju",
  blok: "33 F",
  komoditas: "Kelapa Sawit",
  species: "Tenera",
  psr: false,
  tahunTanam: 1991,
  luas: 2.345,
  surat: "SHM 727",
  namaDiSurat: "Budi",
  luasTertera: 2.5,
  stdb: "STDB 12/2024",
  ulParcelCode: "MERIDIA: UL-1",
  program: "Demplot PBU",
  selisihLuasBesar: false,
  nkt: "Terdampak NKT — NKT 4",
  nktStatus: "AFFECTED",
  luasNkt: 0.1234,
  patok: 4,
  patokKondisi: "3 ada · 1 hilang",
};

const EMPTY_ROW: LandParcelReportRow = {
  ...ROW,
  kelompokTani: null, blok: null, komoditas: null, species: null, tahunTanam: null, luas: null,
  surat: null, namaDiSurat: null, luasTertera: null, stdb: null, ulParcelCode: null, program: null,
  nkt: null, nktStatus: null, luasNkt: null, patok: 0, patokKondisi: null,
};

const GEOM = { type: "Polygon", coordinates: [[[101, -0.5], [101.001, -0.5], [101.001, -0.501], [101, -0.5]]] };

const excelDecimal = (n: number, d: number) => Number(n.toFixed(d));

describe("landParcelExportColumns × landParcelExportRow — kolom ↔ baris", () => {
  it("Excel: setiap kunci kolom (semua kolom menyala, termasuk excelOnly) punya nilai di baris — terisi maupun kosong", () => {
    const cols = landParcelExportColumns(() => true, { excel: true });
    expect(cols.length).toBe(LAND_PARCEL_EXPORT_COLUMNS.length);
    const nodes = formatParcelNodes(GEOM);
    for (const row of [landParcelExportRow(ROW, 0, excelDecimal, "-", nodes), landParcelExportRow(EMPTY_ROW, 1, excelDecimal, "-", formatParcelNodes(null))]) {
      for (const c of cols) {
        expect(row, `kunci "${c.key}" (kolom "${c.header}") tidak dipetakan — kolom akan terbit kosong`).toHaveProperty(c.key);
        expect(row[c.key], `kunci "${c.key}" bernilai undefined`).not.toBeUndefined();
      }
    }
  });

  it("PDF: kolom excelOnly (Koordinat, #370) absen walau toggle-nya menyala; sisanya tetap terpetakan", () => {
    const cols = landParcelExportColumns(() => true);
    const keys = cols.map((c) => c.key);
    expect(keys).not.toContain("koordinat");
    expect(keys).not.toContain("jumlahNode");
    expect(cols.length).toBe(LAND_PARCEL_EXPORT_COLUMNS.filter((c) => !c.excelOnly).length);
    const row = landParcelExportRow(ROW, 0, excelDecimal, "—");
    for (const c of cols) expect(row[c.key], `kunci "${c.key}" bernilai undefined`).not.toBeUndefined();
  });

  it("Koordinat (#370): ujung kanan, isi dari node poligon; tanpa geometri → kosong", () => {
    const keys = landParcelExportColumns(() => true, { excel: true }).map((c) => c.key);
    expect(keys.slice(-2)).toEqual(["koordinat", "jumlahNode"]);
    const row = landParcelExportRow(ROW, 0, excelDecimal, "-", formatParcelNodes(GEOM));
    expect(row.koordinat).toBe("-0.500000,101.000000; -0.500000,101.001000; -0.501000,101.001000");
    expect(row.jumlahNode).toBe(3);
    const none = landParcelExportRow(EMPTY_ROW, 0, excelDecimal, "-", formatParcelNodes(null));
    expect(none.koordinat).toBe("-");
    expect(none.jumlahNode).toBe(0);
    const off = landParcelExportColumns((c) => c !== "koordinat", { excel: true }).map((c) => c.key);
    expect(off).not.toContain("koordinat");
  });

  it("kolom Patok (#331): jumlah & ringkasan kondisi ikut ke Excel/PDF (regresi review 09-15)", () => {
    const excel = landParcelExportRow(ROW, 0, excelDecimal);
    expect(excel.patok).toBe(4);
    expect(excel.patokKondisi).toBe("3 ada · 1 hilang");
    const kosong = landParcelExportRow(EMPTY_ROW, 0, excelDecimal);
    expect(kosong.patok).toBe(0);
    expect(kosong.patokKondisi).toBe("-");
  });

  it("selektor kolom: kolom identitas selalu ada, kolom opsional mengikuti show(); satu toggle Patok = dua kolom", () => {
    const none = landParcelExportColumns(() => false).map((c) => c.key);
    expect(none).toEqual(["no", "lembagaTani", "namaPetani", "idPetani", "idLahan"]);
    const onlyPatok = landParcelExportColumns((c: LandParcelOptionalCol) => c === "patok").map((c) => c.key);
    expect(onlyPatok).toEqual(["no", "lembagaTani", "namaPetani", "idPetani", "idLahan", "patok", "patokKondisi"]);
  });

  it("desimal mengikuti formatter pemanggil: Excel Number, PDF string id-ID; NKT kosong → 'Belum dinilai', bukan sel kosong", () => {
    const excel = landParcelExportRow(ROW, 0, excelDecimal);
    expect(excel.luas).toBe(2.35);
    expect(excel.luasNkt).toBe(0.123);
    expect(excel.no).toBe(1);
    const pdf = landParcelExportRow(ROW, 4, (n, d) => n.toFixed(d).replace(".", ","), "—");
    expect(pdf.luas).toBe("2,35");
    expect(pdf.luasNkt).toBe("0,123");
    expect(pdf.no).toBe(5);
    expect(landParcelExportRow(EMPTY_ROW, 0, excelDecimal, "—").nkt).toBe("Belum dinilai");
    expect(landParcelExportRow(EMPTY_ROW, 0, excelDecimal, "—").luas).toBe("—");
  });
});
