import { describe, it, expect } from "vitest";
import { buildNktReportDoc, buildNktReportInput, nktReportFilename, summarizeNktReport, type NktReportData, type NktReportParcel } from "@/lib/nkt-report";
import { pdfText } from "./pdf-text";

/**
 * Laporan NKT per Lembaga (#332) — builder murni di atas buildLayerReportDoc:
 * KPI, peta (NKT merah bernomor, lahan lain konteks), tabel hanya lahan NKT,
 * ringkasan kategori, nama berkas. Data disusun sendiri (tanpa Prisma).
 */
const D = 0.0009;
const square = (i: number) => ({
  type: "Polygon" as const,
  coordinates: [[[101.19 + i * D, 0.52], [101.19 + (i + 1) * D, 0.52], [101.19 + (i + 1) * D, 0.52 + D], [101.19 + i * D, 0.52 + D], [101.19 + i * D, 0.52]]],
});
const parcel = (i: number, nkt: NktReportParcel["nkt"]): NktReportParcel => ({
  id: `lp-${i}`, parcelId: `HJP.${String(i).padStart(4, "0")}.A`, farmerName: `Petani ${i}`, farmerCode: `HJP.${i}`,
  subGroupLv2: "25", blok: "F", area: 2, geometry: square(i), nkt,
});
const nkt = (status: string, extra: Partial<NonNullable<NktReportParcel["nkt"]>> = {}): NktReportParcel["nkt"] => ({
  status, categories: ["NKT_4"], affectedAreaHa: 0.1, affectedLengthM: 100, assessedAt: "2026-09-01", assessor: null, source: "Lampiran III", notes: null, ...extra,
});
const data: NktReportData = {
  group: { name: "KP Hasrat Jaya Pagaruyung", code: "ISH-1401-03", abrv: "HJP", districtName: "Kampar" },
  parcels: [
    parcel(1, nkt("AFFECTED")),
    parcel(2, nkt("INCLUDED", { categories: ["NKT_1", "NKT_4"], affectedAreaHa: 0.5, affectedLengthM: null, notes: "sempadan sungai" })),
    parcel(3, nkt("NOT_AFFECTED")),
    parcel(4, null),
    parcel(5, null),
  ],
  printedAt: "2026-09-14T12:00:00.000Z",
};

describe("summarizeNktReport", () => {
  it("hitung lahan aktif/dinilai/terdampak (INCLUDED = terdampak)/tidak/belum, luas & panjang NKT, kategori, asesor unik", () => {
    const s = summarizeNktReport(data);
    expect([s.total, s.assessed, s.affected, s.clean, s.unassessed]).toEqual([5, 3, 2, 1, 2]);
    expect(s.areaAffectedParcels).toBe(4);
    expect(s.nktArea).toBeCloseTo(0.6, 6);
    expect(s.nktLength).toBe(100);
    expect([...s.byCategory.entries()]).toEqual([["NKT_4", 2], ["NKT_1", 1]]);
    expect(s.assessors).toEqual(["Lampiran III"]);
  });
});

describe("buildNktReportInput", () => {
  it("KPI 3 kotak (total · lahan NKT · luas NKT — revisi owner 2026-09-15), fitur peta = lahan NKT saja, konteks = semua lahan, baris tabel hanya lahan NKT, kategori 'NKT 1'", () => {
    const input = buildNktReportInput(data);
    expect(input.kicker).toBe("SMALLHOLDER HUB · LAPORAN NKT");
    expect(input.kpis?.map((k) => [k.label, k.value])).toEqual([["Total lahan", "5"], ["Lahan NKT", "2"], ["Luas NKT", "0,60 ha"]]);
    expect(input.kpis?.[0].note).toBe("3 sudah dinilai · 2 belum");
    expect(input.fc.features).toHaveLength(2);
    expect(input.context?.fc.features).toHaveLength(5);
    expect(input.rows.map((r) => r.parcelId)).toEqual(["HJP.0001.A", "HJP.0002.A"]);
    expect(input.rows[1]).toMatchObject({ no: 2, categories: "NKT 1, NKT 4", nktArea: "0,50", nktLength: "—" });
    expect(String(input.rows[1].assessed)).toContain("sempadan sungai");
    expect(input.legend?.map((l) => l.label)).toEqual(["Lahan NKT", "Lahan lain"]);
    expect(input.extraTables?.[0].rows.map((r) => [r.cat, r.n])).toEqual([["NKT 1", "1"], ["NKT 4", "2"]]);
  });

  it("asesor/sumber seragam → disebut di subjudul, kolom tabel cukup Tanggal · Catatan; beragam → kolom ikut memuat asesor", () => {
    const uniform = buildNktReportInput(data);
    expect(uniform.subtitle).toContain("sumber asesmen: Lampiran III");
    expect(uniform.columns.at(-1)?.header).toBe("Tanggal · Catatan");
    expect(String(uniform.rows[0].assessed)).not.toContain("Lampiran III");

    const mixed: NktReportData = { ...data, parcels: [parcel(1, nkt("AFFECTED", { assessor: "Tim A" })), parcel(2, nkt("AFFECTED", { assessor: "Tim B" }))] };
    const varied = buildNktReportInput(mixed);
    expect(varied.columns.at(-1)?.header).toBe("Tanggal · Asesor · Catatan");
    expect(String(varied.rows[0].assessed)).toContain("Tim A — Lampiran III");
  });

  it("lahan tanpa poligon tetap masuk tabel tapi tidak digambar", () => {
    const noGeom: NktReportData = { ...data, parcels: [{ ...parcel(1, nkt("AFFECTED")), geometry: null }] };
    const input = buildNktReportInput(noGeom);
    expect(input.fc.features).toHaveLength(0);
    expect(input.rows).toHaveLength(1);
  });
});

describe("buildNktReportDoc / nktReportFilename", () => {
  it("PDF landscape memuat kop, KPI, nama petani NKT, ringkasan kategori; lahan tak-NKT tidak masuk tabel", () => {
    const doc = buildNktReportDoc(data);
    expect(Math.round(doc.internal.pageSize.getWidth())).toBe(297);
    const text = pdfText(doc);
    expect(text).toContain("LAPORAN NKT");
    expect(text).toContain("KP Hasrat Jaya Pagaruyung");
    expect(text).toContain("LUAS NKT"); // label KPI dicetak kapital
    expect(text).not.toContain("PATOK NKT"); // kotak dicoret (revisi owner 2026-09-15)
    expect(text).toContain("HJP.0002.A");
    expect(text).not.toContain("HJP.0003.A");
    expect(text).toContain("Ringkasan per kategori NKT");
  });

  it("nama berkas dari kode Lembaga (aman) + tanggal cetak; tanpa kode → nama Lembaga", () => {
    expect(nktReportFilename(data)).toMatch(/^Laporan_NKT_ISH_1401_03_2026091\d\.pdf$/);
    expect(nktReportFilename({ ...data, group: { ...data.group, code: null } })).toMatch(/^Laporan_NKT_KP_Hasrat_Jaya_Pagaruyung_/);
  });
});
