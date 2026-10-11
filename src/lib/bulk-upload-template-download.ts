/**
 * Pengunduh template Upload Massal (#419) — client-only. Spesifikasinya
 * (tajuk, atribut, contoh) ada di `bulk-upload-templates.ts` dan teruji
 * terhadap parser; berkas ini hanya merakit berkas. Library berat di-import
 * dinamis (pola `parcel-spatial-download.ts`).
 */
import type { FeatureCollection } from "geojson";
import { toast } from "sonner";
import {
  shapefileTemplateReadme,
  type ExcelTemplateSpec,
  type ShapefileTemplateSpec,
} from "@/lib/bulk-upload-templates";

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Workbook template: sheet "Data" (tajuk + baris contoh) + sheet "Petunjuk" (kolom · wajib · format). */
export async function buildExcelTemplate(spec: ExcelTemplateSpec) {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  const data = wb.addWorksheet("Data");
  data.columns = spec.columns.map((c) => ({ header: c.header, key: c.field, width: c.width ?? Math.max(14, c.header.length + 4) }));
  const head = data.getRow(1);
  head.font = { bold: true };
  head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } };
  spec.columns.forEach((c, i) => {
    // Kolom wajib ditandai lewat catatan sel, BUKAN tanda di tajuk — tajuk harus persis alias parser.
    head.getCell(i + 1).note = `${c.required ? "WAJIB" : "Opsional"} — ${c.guide}`;
    if (c.text) data.getColumn(i + 1).numFmt = "@";
  });
  spec.examples.forEach((ex) => data.addRow(ex));

  const guide = wb.addWorksheet("Petunjuk");
  spec.intro.forEach((line) => guide.addRow([line]));
  guide.addRow([]);
  const gh = guide.addRow(["Kolom", "Wajib", "Format / keterangan"]);
  gh.font = { bold: true };
  // Nama kolom DIKUTIP: tanpa kutip, baris "ID Petani | Ya | …" lolos deteksi tajuk alias,
  // dan bila sheet Data kosong pembaca jatuh ke sheet ini sebagai data (review #419).
  spec.columns.forEach((c) => guide.addRow([`"${c.header}"`, c.required ? "Ya" : "Tidak", c.guide]));
  guide.getColumn(1).width = 24;
  guide.getColumn(2).width = 8;
  guide.getColumn(3).width = 70;
  return wb;
}

// Satu unduhan template sekali jalan; galat (mis. chunk exceljs/shp-write gagal dimuat
// sesudah deploy) jadi toast, bukan klik yang diam-diam tak berefek (review #419).
let busy = false;
async function guarded(task: () => Promise<void>) {
  if (busy) return;
  busy = true;
  try {
    await task();
  } catch (err) {
    console.error("[template] gagal membuat template", err);
    toast.error("Gagal membuat template — muat ulang halaman lalu coba lagi");
  } finally {
    busy = false;
  }
}

export function downloadExcelTemplate(spec: ExcelTemplateSpec): Promise<void> {
  return guarded(async () => {
    const [wb, { downloadWorkbook }] = await Promise.all([buildExcelTemplate(spec), import("@/lib/xlsx")]);
    await downloadWorkbook(wb, spec.filename.replace(/\.xlsx$/i, ""));
  });
}

/** ZIP shapefile contoh (shp/shx/dbf/prj WGS84 + cpg UTF-8) + BACA-SAYA.txt, satu layer bernama `spec.base`. */
export async function buildShapefileTemplateZip(spec: ShapefileTemplateSpec): Promise<Uint8Array> {
  const [shpwrite, { default: JSZip }] = await Promise.all([import("@mapbox/shp-write"), import("jszip")]);
  const fc: FeatureCollection = { type: "FeatureCollection", features: spec.features };
  // arraybuffer/uint8array (bukan blob): JSZip di Node (test) tak menerima Blob.
  const raw = await shpwrite.zip<"arraybuffer">(fc, {
    outputType: "arraybuffer",
    compression: "DEFLATE",
    types: spec.geometry === "polygon" ? { polygon: spec.base } : { point: spec.base },
  });
  // shp-write 0.4.x menulis di akar ZIP (tanpa `folder`) tetapi tanpa .cpg; tambahkan
  // .cpg (QGIS membaca DBF sebagai UTF-8) + petunjuk ke arsip yang sama.
  const out = await JSZip.loadAsync(raw);
  out.file(`${spec.base}.cpg`, "UTF-8");
  out.file("BACA-SAYA.txt", shapefileTemplateReadme(spec));
  return out.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

export function downloadShapefileTemplate(spec: ShapefileTemplateSpec): Promise<void> {
  return guarded(async () => {
    const bytes = await buildShapefileTemplateZip(spec);
    saveBlob(new Blob([bytes as BlobPart], { type: "application/zip" }), `${spec.base}.zip`);
  });
}
