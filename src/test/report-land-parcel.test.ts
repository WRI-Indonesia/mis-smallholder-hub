import { describe, it, expect } from "vitest";
import {
  buildLandParcelReport,
  buildLandParcelMapLayout,
  splitParcelsIntoGrid,
  fitLabelToBox,
  verticalLabelAnchors,
  exteriorRings,
  type LpRawParcel,
  type LpMapBox,
} from "@/lib/report-land-parcel";

const P = (o: Partial<LpRawParcel> & { id: string; farmerId: string }): LpRawParcel => ({
  parcelCode: `L-${o.id}`,
  farmerCode: `F-${o.farmerId}`,
  farmerName: "Petani",
  farmerGroupId: "lg1",
  lembagaTani: "Lembaga A",
  subGroupLv1: null,
  subGroupLv2: null,
  blok: null,
  cropType: null,
  species: null,
  isPsr: false,
  plantingYear: null,
  area: 1,
  ...o,
});

describe("buildLandParcelReport", () => {
  it("1 baris per lahan dengan kolom Lembaga/Petani/ID Petani/ID Lahan/KT", () => {
    const r = buildLandParcelReport([
      P({ id: "p1", farmerId: "f1", farmerName: "Budi", farmerCode: "SH-001", parcelCode: "LHN-001", subGroupLv2: "KT Maju", plantingYear: 2016 }),
      P({ id: "p2", farmerId: "f1", farmerName: "Budi", farmerCode: "SH-001", parcelCode: "LHN-002", subGroupLv2: "KT Maju" }),
    ]);
    expect(r.rows).toHaveLength(2);
    expect(r.rows[0]).toMatchObject({
      lembagaTani: "Lembaga A",
      namaPetani: "Budi",
      idPetani: "SH-001",
      idLahan: "LHN-001",
      kelompokTani: "KT Maju",
      tahunTanam: 2016,
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

// ─── Layout peta cetak (#179) ───

const square = (lon: number, lat: number, size = 1) => ({
  type: "Polygon",
  coordinates: [[[lon, lat], [lon + size, lat], [lon + size, lat + size], [lon, lat + size], [lon, lat]]],
});

const BOX: LpMapBox = { x: 10, y: 20, w: 100, h: 80, pad: 5 };

describe("exteriorRings", () => {
  it("Polygon → 1 ring tanpa titik penutup; MultiPolygon → semua exterior ring", () => {
    expect(exteriorRings(square(0, 0))[0]).toHaveLength(4); // titik penutup dibuang
    const multi = {
      type: "MultiPolygon",
      coordinates: [square(0, 0).coordinates, square(5, 5).coordinates],
    };
    expect(exteriorRings(multi)).toHaveLength(2);
  });

  it("geometri null/invalid/ring < 3 titik → []", () => {
    expect(exteriorRings(null)).toHaveLength(0);
    expect(exteriorRings({ type: "Polygon" })).toHaveLength(0);
    expect(exteriorRings({ type: "Polygon", coordinates: [[[0, 0], [1, 1]]] })).toHaveLength(0);
    expect(exteriorRings({ type: "Point", coordinates: [0, 0] })).toHaveLength(0);
  });
});

describe("buildLandParcelMapLayout", () => {
  it("semua poligon ter-proyeksi dalam box (aspect-fit bounds bersama, utara di atas)", () => {
    const layout = buildLandParcelMapLayout(
      [
        { no: 1, geometry: square(101, 0.5) },
        { no: 2, geometry: square(101.5, 1.2) },
      ],
      BOX,
    );
    expect(layout.polygons).toHaveLength(2);
    for (const poly of layout.polygons) {
      for (const [x, y] of poly.rings.flat()) {
        expect(x).toBeGreaterThanOrEqual(BOX.x + BOX.pad);
        expect(x).toBeLessThanOrEqual(BOX.x + BOX.w - BOX.pad);
        expect(y).toBeGreaterThanOrEqual(BOX.y + BOX.pad);
        expect(y).toBeLessThanOrEqual(BOX.y + BOX.h - BOX.pad);
      }
    }
    // Utara di atas: lahan ber-lat lebih tinggi (no 2) harus tergambar lebih atas (y lebih kecil).
    const p1 = layout.polygons.find((p) => p.no === 1)!;
    const p2 = layout.polygons.find((p) => p.no === 2)!;
    expect(p2.labelY).toBeLessThan(p1.labelY);
  });

  it("label di centroid ring terbesar untuk MultiPolygon", () => {
    const multi = {
      type: "MultiPolygon",
      coordinates: [square(0, 0, 1).coordinates, square(10, 0, 4).coordinates],
    };
    const layout = buildLandParcelMapLayout([{ no: 7, geometry: multi }], BOX);
    const poly = layout.polygons[0];
    // Ring terbesar = square(10,0,4) → label harus berada di dalam bbox proyeksinya.
    const bigRing = poly.rings[1];
    const xs = bigRing.map((p) => p[0]);
    const ys = bigRing.map((p) => p[1]);
    expect(poly.labelX).toBeGreaterThan(Math.min(...xs));
    expect(poly.labelX).toBeLessThan(Math.max(...xs));
    expect(poly.labelY).toBeGreaterThan(Math.min(...ys));
    expect(poly.labelY).toBeLessThan(Math.max(...ys));
  });

  it("lahan tanpa geometri valid masuk skippedNos, sisanya tetap tergambar", () => {
    const layout = buildLandParcelMapLayout(
      [
        { no: 1, geometry: square(101, 0.5) },
        { no: 2, geometry: null },
        { no: 3, geometry: { type: "Polygon", coordinates: [] } },
      ],
      BOX,
    );
    expect(layout.polygons.map((p) => p.no)).toEqual([1]);
    expect(layout.skippedNos).toEqual([2, 3]);
  });

  it("semua lahan tanpa geometri → polygons kosong, tanpa error", () => {
    const layout = buildLandParcelMapLayout([{ no: 1, geometry: null }], BOX);
    expect(layout.polygons).toHaveLength(0);
    expect(layout.skippedNos).toEqual([1]);
  });
});

describe("splitParcelsIntoGrid", () => {
  // 4 lahan di 4 kuadran bounds: BL, BR, TL, TR (lat tinggi = baris atas).
  const corners = [
    { no: 1, geometry: square(100, 0) },     // barat-selatan
    { no: 2, geometry: square(100.9, 0) },   // timur-selatan
    { no: 3, geometry: square(100, 0.9) },   // barat-utara
    { no: 4, geometry: square(100.9, 0.9) }, // timur-utara
  ];

  it("2×2: lahan masuk sel sesuai centroid; label baris-huruf dari utara", () => {
    const split = splitParcelsIntoGrid(corners, 2, 2);
    expect(split.rows).toBe(2);
    expect(split.cols).toBe(2);
    expect(split.cells).toHaveLength(4);
    const byLabel = Object.fromEntries(split.cells.map((c) => [c.label, c.parcels.map((p) => p.no)]));
    expect(byLabel["A1"]).toEqual([3]); // utara-barat
    expect(byLabel["A2"]).toEqual([4]); // utara-timur
    expect(byLabel["B1"]).toEqual([1]); // selatan-barat
    expect(byLabel["B2"]).toEqual([2]); // selatan-timur
  });

  it("grid non-persegi (2×3): kolom & baris dihitung terpisah", () => {
    // 2 baris × 3 kolom; lahan di pojok timur-utara → baris A, kolom 3.
    const split = splitParcelsIntoGrid(corners, 2, 3);
    expect(split.rows).toBe(2);
    expect(split.cols).toBe(3);
    const ne = split.cells.find((c) => c.parcels.some((p) => p.no === 4))!;
    expect(ne.label).toBe("A3");
    const sw = split.cells.find((c) => c.parcels.some((p) => p.no === 1))!;
    expect(sw.label).toBe("B1");
  });

  it("sel kosong tidak ikut; tiap lahan tepat satu sel", () => {
    const split = splitParcelsIntoGrid(
      [
        { no: 1, geometry: square(100, 0) },
        { no: 2, geometry: square(100.05, 0.05) },
      ],
      4,
      4,
    );
    const allNos = split.cells.flatMap((c) => c.parcels.map((p) => p.no)).sort();
    expect(allNos).toEqual([1, 2]);
    expect(split.cells.length).toBeLessThanOrEqual(2); // sisanya kosong → tak ada
  });

  it("1×1 → satu sel berisi semua; tanpa geometri → skippedNos", () => {
    const split = splitParcelsIntoGrid(
      [
        { no: 1, geometry: square(100, 0) },
        { no: 2, geometry: null },
      ],
      1,
      1,
    );
    expect(split.rows).toBe(1);
    expect(split.cols).toBe(1);
    expect(split.cells).toHaveLength(1);
    expect(split.cells[0].parcels.map((p) => p.no)).toEqual([1]);
    expect(split.skippedNos).toEqual([2]);
  });
});

describe("fitLabelToBox", () => {
  it("muat horizontal → tanpa rotasi, skala 1", () => {
    expect(fitLabelToBox(10, 4, 20, 10)).toEqual({ vertical: false, scale: 1 });
  });

  it("sempit horizontal tapi lega vertikal → putar 90°, skala 1", () => {
    // Poligon memanjang ke atas: lebar 5 < panjang label 10, tinggi 20 cukup.
    expect(fitLabelToBox(10, 4, 5, 20)).toEqual({ vertical: true, scale: 1 });
  });

  it("keduanya sempit → skala turun mengikuti orientasi terbaik, lantai 0.55", () => {
    const fit = fitLabelToBox(10, 4, 6, 8);
    expect(fit.vertical).toBe(true); // vertikal 8/10 > horizontal 6/10
    expect(fit.scale).toBeCloseTo(0.8);
    // Poligon sangat kecil → skala tak boleh di bawah lantai keterbacaan.
    expect(fitLabelToBox(10, 4, 1, 1).scale).toBe(0.55);
  });
});

describe("buildLandParcelMapLayout bbox", () => {
  it("polygon menyimpan bboxW/bboxH ter-proyeksi (ruang label)", () => {
    const layout = buildLandParcelMapLayout([{ no: 1, geometry: square(101, 0.5) }], BOX);
    const poly = layout.polygons[0];
    expect(poly.bboxW).toBeGreaterThan(0);
    expect(poly.bboxH).toBeGreaterThan(0);
    expect(poly.bboxW).toBeLessThanOrEqual(BOX.w - BOX.pad * 2 + 1e-6);
    expect(poly.bboxH).toBeLessThanOrEqual(BOX.h - BOX.pad * 2 + 1e-6);
  });
});

describe("verticalLabelAnchors", () => {
  it("semua anchor baseline berada di dalam blok pill vertikal", () => {
    const lineH = 2.6, pad = 0.6;
    const widths = [2.5, 28.4]; // nomor pendek + ID panjang
    const anchors = verticalLabelAnchors(100, 100, lineH, 2, pad, widths);
    const blockH = 2 * lineH + 2 * pad;
    anchors.forEach((a, i) => {
      // Kolom baris di dalam tebal blok.
      expect(a.x).toBeGreaterThan(100 - blockH / 2);
      expect(a.x).toBeLessThan(100 + blockH / 2);
      // Teks memanjang ke atas dari anchor → rentang [y - tw, y] mengitari cy.
      expect(a.y).toBeCloseTo(100 + widths[i] / 2);
      expect(a.y - widths[i]).toBeCloseTo(100 - widths[i] / 2);
    });
    // Baris berurutan dari kiri blok.
    expect(anchors[0].x).toBeLessThan(anchors[1].x);
  });
});
