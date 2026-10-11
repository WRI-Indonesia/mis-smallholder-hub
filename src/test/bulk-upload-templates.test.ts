import { describe, it, expect, beforeAll } from "vitest";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import { FARMER_UPLOAD_FIELDS, FARMER_AUTO_MATCH_RULES } from "@/lib/farmer-upload-fields";
import { PRODUCTION_UPLOAD_FIELDS, PRODUCTION_AUTO_MATCH_RULES } from "@/lib/production-upload-fields";
import { PARCEL_UPLOAD_FIELDS, PARCEL_AUTO_MATCH_RULES, autoMatchColumns } from "@/lib/parcel-bulk-mapping";
import { groupTreeFeatures } from "@/lib/tree-upload";
import {
  FARMER_TEMPLATE,
  PRODUCTION_TEMPLATE,
  PARCEL_POLYGON_TEMPLATE,
  TREE_POINT_TEMPLATE,
  shapefileTemplateReadme,
  type ExcelTemplateSpec,
} from "@/lib/bulk-upload-templates";
import { buildExcelTemplate, buildShapefileTemplateZip } from "@/lib/bulk-upload-template-download";

// #419: setiap fitur Upload Massal punya template, dan template itu HARUS
// terpetakan otomatis oleh parsernya sendiri — bug yang dijaga: template
// Produksi lama bertajuk "Periode (YYYY-MM)" dkk. yang tak dikenali alias
// (cocok persis), sehingga 4 kolom wajib harus dipetakan manual.

function expectSelfMapping(
  spec: ExcelTemplateSpec,
  fields: readonly { key: string; required: boolean }[],
  rules: Record<string, string[]>,
) {
  const headers = spec.columns.map((c) => c.header);
  const mapped = autoMatchColumns(headers, fields.map((f) => f.key), rules);
  for (const c of spec.columns) expect(mapped[c.field], `tajuk "${c.header}"`).toBe(c.header);
  // Semua field parser punya kolom di template (tak ada field yang terlupa).
  expect(new Set(spec.columns.map((c) => c.field))).toEqual(new Set(fields.map((f) => f.key)));
  // Wajib di template = wajib di parser.
  for (const c of spec.columns) expect(c.required, c.header).toBe(fields.find((f) => f.key === c.field)!.required);
}

describe("template Excel — tajuk terpetakan otomatis", () => {
  it("Petani", () => expectSelfMapping(FARMER_TEMPLATE, FARMER_UPLOAD_FIELDS, FARMER_AUTO_MATCH_RULES));
  it("Produksi", () => expectSelfMapping(PRODUCTION_TEMPLATE, PRODUCTION_UPLOAD_FIELDS, PRODUCTION_AUTO_MATCH_RULES));

  it("Produksi — tajuk template LAMA (pra-#419) yang beredar di lapangan ikut terpetakan", () => {
    const legacy = ["ID Petani", "Periode (YYYY-MM)", "Tanggal Panen (DD/MM/YYYY)", "Panen Ke- (1-4)", "Hasil Panen (kg)", "ID Lahan (Opsional)", "Catatan (Opsional)"];
    const mapped = autoMatchColumns(legacy, PRODUCTION_UPLOAD_FIELDS.map((f) => f.key), PRODUCTION_AUTO_MATCH_RULES);
    expect(Object.keys(mapped).sort()).toEqual(PRODUCTION_UPLOAD_FIELDS.map((f) => f.key).sort());
  });

  it("baris contoh memakai ID fiktif CTH.* (repo publik)", () => {
    for (const spec of [FARMER_TEMPLATE, PRODUCTION_TEMPLATE]) {
      for (const ex of spec.examples) expect(String(ex.farmerId)).toMatch(/^CTH\./);
    }
  });
});

describe("template Excel — berkas yang dirakit", () => {
  it.each([["Petani", FARMER_TEMPLATE], ["Produksi", PRODUCTION_TEMPLATE]] as const)("%s: sheet Data (tajuk + contoh) di depan, lalu Petunjuk", async (_, spec) => {
    const wb = await buildExcelTemplate(spec);
    const back = new ExcelJS.Workbook();
    await back.xlsx.load((await wb.xlsx.writeBuffer()) as ArrayBuffer);
    expect(back.worksheets.map((w) => w.name)).toEqual(["Data", "Petunjuk"]);
    const data = back.getWorksheet("Data")!;
    const header = (data.getRow(1).values as unknown[]).slice(1);
    expect(header).toEqual(spec.columns.map((c) => c.header));
    expect(data.rowCount).toBe(1 + spec.examples.length);
  });
});

describe("template shapefile — atribut DBF dikenali parser", () => {
  it("Poligon: nama ≤ 10 karakter, terpetakan ke field-nya, field wajib tercakup", () => {
    const names = PARCEL_POLYGON_TEMPLATE.attributes.map((a) => a.name);
    for (const n of names) expect(n.length, n).toBeLessThanOrEqual(10);
    const mapped = autoMatchColumns(names, PARCEL_UPLOAD_FIELDS.map((f) => f.key), PARCEL_AUTO_MATCH_RULES);
    for (const a of PARCEL_POLYGON_TEMPLATE.attributes) expect(mapped[a.field], a.name).toBe(a.name);
    expect(new Set(PARCEL_POLYGON_TEMPLATE.attributes.map((a) => a.field))).toEqual(new Set(PARCEL_UPLOAD_FIELDS.map((f) => f.key)));
    for (const f of PARCEL_UPLOAD_FIELDS.filter((x) => x.required)) {
      expect(PARCEL_POLYGON_TEMPLATE.attributes.find((a) => a.field === f.key)?.required, f.key).toBe(true);
    }
  });

  it("Pohon: fitur contoh terbaca groupTreeFeatures dengan semua atribut terisi", () => {
    const { groups, skipped } = groupTreeFeatures(
      TREE_POINT_TEMPLATE.features.map((f, index) => ({ index, properties: f.properties ?? {}, geometry: f.geometry })),
    );
    expect(skipped).toEqual([]);
    expect(groups).toHaveLength(1);
    expect(groups[0].parcelId).toBe("CTH.0001.A.14.01.10.2012");
    const row = groups[0].rows[0];
    expect(row).toMatchObject({ treeId: 1, sequenceNo: 1, category: "Produktif", vigor: 0.82, source: "verified" });
    for (const n of TREE_POINT_TEMPLATE.attributes.map((a) => a.name)) expect(n.length, n).toBeLessThanOrEqual(10);
  });

  it("BACA-SAYA memisahkan atribut wajib dan opsional", () => {
    const txt = shapefileTemplateReadme(PARCEL_POLYGON_TEMPLATE);
    const [wajib, opsional] = txt.split("Atribut opsional:");
    expect(wajib).toContain("parcel_id");
    expect(wajib).toContain("farmer_id");
    expect(opsional).toContain("thn_tanam");
    expect(opsional).not.toContain("farmer_id");
  });
});

describe("template shapefile — ZIP yang dirakit terbaca shpjs", () => {
  // shpjs (bundel browser) membaca global `self`.
  beforeAll(() => {
    (globalThis as { self?: unknown }).self ??= globalThis;
  });

  it.each([
    ["Poligon", PARCEL_POLYGON_TEMPLATE, "Polygon"],
    ["Pohon", TREE_POINT_TEMPLATE, "Point"],
  ] as const)("%s: berkas rata di akar ZIP + BACA-SAYA, geometri & atribut utuh", async (_, spec, geomType) => {
    const bytes = await buildShapefileTemplateZip(spec);
    const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const zip = await JSZip.loadAsync(buf);
    const names = Object.keys(zip.files).sort();
    expect(names).toEqual(["BACA-SAYA.txt", ...["cpg", "dbf", "prj", "shp", "shx"].map((e) => `${spec.base}.${e}`)].sort());

    const { default: shp } = await import("shpjs");
    const parsed = (await shp(buf)) as { features: { geometry: { type: string }; properties: Record<string, unknown> }[] };
    expect(parsed.features).toHaveLength(spec.features.length);
    expect(parsed.features[0].geometry.type).toBe(geomType);
    expect(Object.keys(parsed.features[0].properties).sort()).toEqual(spec.attributes.map((a) => a.name).sort());
    expect(parsed.features[0].properties.parcel_id).toBe("CTH.0001.A.14.01.10.2012");
  });
});
