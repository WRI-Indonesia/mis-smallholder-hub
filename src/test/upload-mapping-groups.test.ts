import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  PARCEL_DETAIL_MAPPING_GROUPS,
  PARCEL_POLYGON_MAPPING_GROUPS,
  MARKER_MAPPING_GROUPS,
  formatSampleValue,
  type MappingGroup,
} from "@/lib/upload-mapping-groups";
import { PARCEL_DETAIL_TARGET_FIELDS } from "@/lib/land-parcel-detail-import";
import { PARCEL_UPLOAD_FIELDS } from "@/lib/parcel-bulk-mapping";
import { MARKER_UPLOAD_FIELDS } from "@/lib/land-marker-upload";
import { GroupedFieldMapping } from "@/components/shared/grouped-field-mapping";

// #420: pemetaan kolom berkelompok. Field yang lupa dimasukkan ke grup tidak
// pernah dirender → tidak bisa dipetakan sama sekali (regresi diam-diam).

function expectPartition(groups: readonly MappingGroup[], fields: readonly { key: string; required: boolean }[]) {
  const all = groups.flatMap((g) => g.fields);
  expect(new Set(all).size, "field ganda di dua grup").toBe(all.length);
  expect([...all].sort()).toEqual(fields.map((f) => f.key).sort());
  // Field wajib berkumpul di grup pertama (selalu terbuka, dibaca lebih dulu).
  const required = fields.filter((f) => f.required).map((f) => f.key);
  for (const k of required) expect(groups[0].fields, k).toContain(k);
}

describe("grup pemetaan — tiap field tepat satu grup", () => {
  it("Detail Lahan (20 field, 5 grup)", () => {
    expect(PARCEL_DETAIL_TARGET_FIELDS).toHaveLength(20);
    expectPartition(PARCEL_DETAIL_MAPPING_GROUPS, PARCEL_DETAIL_TARGET_FIELDS);
  });
  it("Poligon (14 field)", () => expectPartition(PARCEL_POLYGON_MAPPING_GROUPS, PARCEL_UPLOAD_FIELDS));
  it("Patok (11 field)", () => expectPartition(MARKER_MAPPING_GROUPS, MARKER_UPLOAD_FIELDS));
});

describe("formatSampleValue", () => {
  it("teks, angka, tanggal UTC, sel exceljs, dan pemotongan", () => {
    expect(formatSampleValue(null)).toBe("");
    expect(formatSampleValue("  SHM  ")).toBe("SHM");
    expect(formatSampleValue(1.95)).toBe("1.95");
    expect(formatSampleValue(new Date(Date.UTC(2026, 5, 15)))).toBe("15/06/2026");
    expect(formatSampleValue({ richText: [{ text: "No. " }, { text: "12" }] })).toBe("No. 12");
    expect(formatSampleValue({ formula: "A1*2", result: 42 })).toBe("42");
    expect(formatSampleValue("x".repeat(40), 10)).toBe(`${"x".repeat(9)}…`);
  });
});

describe("GroupedFieldMapping — render", () => {
  const render = (mapping: Record<string, string>, groups?: readonly MappingGroup[]) =>
    renderToStaticMarkup(
      createElement(GroupedFieldMapping, {
        fields: PARCEL_DETAIL_TARGET_FIELDS,
        groups,
        headers: ["ID Lahan", "ID Petani", "Jenis Surat"],
        mapping,
        sample: { "ID Lahan": "CTH.0001.A.14.01.10.2012", "Jenis Surat": "SHM" },
        onChange: () => {},
      }),
    );

  it("ringkasan n/m, grup kosong bertanda 'tak ada di berkas', contoh nilai baris pertama", () => {
    const html = render({ parcelId: "ID Lahan", documentType: "Jenis Surat" }, PARCEL_DETAIL_MAPPING_GROUPS);
    expect(html).toContain("2/20");
    for (const g of PARCEL_DETAIL_MAPPING_GROUPS) expect(html).toContain(g.title.replace("&", "&amp;"));
    // Sepadan & NKT & Kelompok: belum ada kolom terpetakan → ditandai.
    expect(html.match(/tak ada di berkas/g)?.length).toBe(3);
    expect(html).toContain("CTH.0001.A.14.01.10.2012");
    expect(html).toContain("SHM");
  });

  it("field wajib belum dipetakan diberi tanda", () => {
    const html = render({ parcelId: "ID Lahan" }, PARCEL_DETAIL_MAPPING_GROUPS);
    expect(html).toContain("Wajib dipetakan");
  });

  it("grup ber-isi tambahan (Bawaan NKT) terbuka walau kolomnya tak ada di berkas (review #420)", () => {
    const html = renderToStaticMarkup(
      createElement(GroupedFieldMapping, {
        fields: PARCEL_DETAIL_TARGET_FIELDS,
        groups: PARCEL_DETAIL_MAPPING_GROUPS,
        headers: ["ID Lahan", "ID Petani"],
        mapping: { parcelId: "ID Lahan", farmerId: "ID Petani" },
        onChange: () => {},
        groupExtra: { nkt: createElement("p", null, "PANEL-BAWAAN-NKT") },
      }),
    );
    expect(html).toContain("PANEL-BAWAAN-NKT");
    expect(html).toContain("bawaan di bawah");
  });

  it("tanpa groups → satu daftar ringkas (Petani/Produksi)", () => {
    const html = render({ parcelId: "ID Lahan" });
    expect(html).not.toContain("tak ada di berkas");
    expect(html).toContain("1/20");
  });
});
