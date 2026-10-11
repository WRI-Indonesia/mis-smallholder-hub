import { describe, it, expect } from "vitest";
import { inflateSync } from "node:zlib";
import { isWinAnsiChar, toWinAnsiText } from "@/lib/pdf-winansi";
import { buildLandParcelReportDoc } from "@/lib/report-land-parcel-pdf";
import { buildPDF } from "@/lib/pdf";

// Temuan #2 QA v1.7.0: "≥" di ringkasan PDF Laporan Lahan membuat jsPDF menulis
// baris itu sebagai UTF-16 → tercetak `Selisih Luas "e 0,50 Ha`. Lint/test lama
// lolos karena layar benar; penjaga ini membaca isi content stream PDF asli.

describe("toWinAnsiText", () => {
  it("memetakan simbol umum ke padanan ASCII", () => {
    expect(toWinAnsiText("Selisih Luas ≥ 0,50 Ha")).toBe("Selisih Luas >= 0,50 Ha");
    expect(toWinAnsiText("≤ 1 · ≠ 2 · ≈ 3 · Pre → Post · ✓ ✗ · −5")).toBe("<= 1 · != 2 · ~ 3 · Pre -> Post · v x · -5");
  });

  it("membiarkan karakter WinAnsi (em-dash, titik tengah, huruf Latin-1, ±, …)", () => {
    const s = "Ada STDB — 46% · Ø ±0,5 ha … “kutip” é";
    expect(toWinAnsiText(s)).toBe(s);
  });

  it("karakter lain di luar WinAnsi jadi '?' — bukan merusak seluruh baris", () => {
    expect(toWinAnsiText("Lahan 🌴 1")).toBe("Lahan ? 1");
    expect(toWinAnsiText("a\tb\r\nc")).toBe("a\tb\r\nc");
    expect([..."Lahan 🌴 1"].filter((c) => !isWinAnsiChar(c))).toEqual(["🌴"]);
  });
});

/** Teks string literal `(…) Tj` dari semua content stream ter-Flate di PDF. */
function pdfTextRuns(pdf: string): string[] {
  const buf = Buffer.from(pdf, "latin1");
  const runs: string[] = [];
  const re = /\/Length (\d+)\s*\/Filter \/FlateDecode\s*>>\nstream\n/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(pdf))) {
    const start = m.index + m[0].length;
    const body = inflateSync(buf.subarray(start, start + Number(m[1]))).toString("latin1");
    for (const t of body.matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj/g)) runs.push(t[1]);
  }
  return runs;
}

describe("PDF Laporan Lahan — teks metadata & sections tanpa UTF-16", () => {
  it("baris berisi '≥' tercetak '>=' dan tak ada string UTF-16 (byte NUL)", () => {
    const doc = buildLandParcelReportDoc({
      metadata: [{ label: "Distrik", value: "Siak ≥ 1" }],
      columns: [{ header: "No", key: "no" }],
      data: [{ no: 1 }],
      mapParcels: [],
      sections: [
        { title: "Filter Legalitas", lines: ["Selisih Luas: ≥ 0,50 Ha (luas surat vs poligon)"] },
        { title: "Ringkasan Legalitas", lines: ["Selisih Luas ≥ 0,50 Ha: 32 (luas di surat vs luas poligon)"] },
      ],
    });
    const runs = pdfTextRuns(doc.output());
    expect(runs.some((r) => r.includes("\u0000"))).toBe(false);
    expect(runs).toContain("Selisih Luas >= 0,50 Ha: 32 \\(luas di surat vs luas poligon\\)");
    expect(runs).toContain("Siak >= 1");
  });

  it("sel tabel, label peta, dan catatan kaki juga dipetakan (review #419)", () => {
    const doc = buildLandParcelReportDoc({
      metadata: [],
      columns: [{ header: "Catatan ≥", key: "note" }],
      data: [{ note: "luas ≥ 2 ha → cek" }],
      mapParcels: [{ no: 1, geometry: { type: "Polygon", coordinates: [[[101, 0.5], [101.01, 0.5], [101.01, 0.51], [101, 0.51], [101, 0.5]]] }, labelLines: ["1", "KT ≥ A"] }],
    });
    const runs = pdfTextRuns(doc.output());
    expect(runs.some((r) => r.includes("\u0000"))).toBe(false);
    expect(runs).toContain("luas >= 2 ha -> cek");
    expect(runs).toContain("Catatan >=");
    expect(runs).toContain("KT >= A");
  });
});

describe("buildPDF (eksportir bersama Report Petani/KT/Pelatihan/Produksi) — tanpa UTF-16", () => {
  it("judul, metadata, tajuk & sel tabel dipetakan ke WinAnsi (review pra-rilis v1.7.0)", () => {
    const doc = buildPDF({
      title: "Laporan ≥ 2026",
      metadata: [{ label: "Filter", value: "Luas ≥ 1 ha → Siak" }],
      columns: [{ header: "Catatan ✓", key: "note" }],
      data: [{ note: "KT ≈ Maju" }],
    });
    const out = doc.output();
    // buildPDF mungkin tak memampatkan stream — baca string literal langsung bila tak ada Flate.
    const runs = /FlateDecode/.test(out) ? pdfTextRuns(out) : [...out.matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj/g)].map((m) => m[1]);
    expect(runs.some((r) => r.includes("\u0000"))).toBe(false);
    expect(runs).toContain("Laporan >= 2026");
    expect(runs).toContain("Luas >= 1 ha -> Siak");
    expect(runs).toContain("Catatan v");
    expect(runs).toContain("KT ~ Maju");
  });
});

