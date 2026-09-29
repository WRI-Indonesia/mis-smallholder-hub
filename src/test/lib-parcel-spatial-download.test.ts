import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import JSZip from "jszip";
import type { FeatureCollection, MultiPolygon, Polygon, Point } from "geojson";
import { downloadParcelExport, downloadFeatureExport } from "@/lib/parcel-spatial-download";
import type { ParcelExportProperties } from "@/lib/parcel-export-data";

/**
 * Unduhan spasial `src/lib/parcel-spatial-download.ts` ASLI (#313/#331):
 * GeoJSON / KML / SHP ZIP. `document` di-stub dan `URL.createObjectURL`
 * disadap untuk menangkap blob, lalu isinya dibaca ulang (JSON, teks KML, ZIP).
 * JSZip membaca Blob lewat `FileReader` (tak ada di node) → di-stub minimal.
 */
class FileReaderStub {
  onload: ((e: { target: { result: ArrayBuffer } }) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  readAsArrayBuffer(b: Blob) {
    b.arrayBuffer().then((result) => this.onload?.({ target: { result } }), (e) => this.onerror?.({ target: { error: e } }));
  }
}
let saved: { blob: Blob; name: string }[];

beforeEach(() => {
  saved = [];
  let pending: Blob | null = null;
  vi.spyOn(URL, "createObjectURL").mockImplementation((b) => {
    pending = b as Blob;
    return "blob:uji";
  });
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  vi.stubGlobal("FileReader", FileReaderStub);
  vi.stubGlobal("document", {
    createElement: () => {
      const a = { href: "", download: "", click: () => saved.push({ blob: pending!, name: a.download }) };
      return a;
    },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const ring = (x: number) => [[[x, 0], [x + 1, 0], [x + 1, 1], [x, 1], [x, 0]]];
const props = (id: string) => ({ idLahan: id, namaPetani: "Siti Ṣāliḥ", luasHa: 1.5, psr: "Tidak" }) as unknown as ParcelExportProperties;

const PARCELS: FeatureCollection<Polygon | MultiPolygon, ParcelExportProperties> = {
  type: "FeatureCollection",
  features: [
    { type: "Feature", geometry: { type: "Polygon", coordinates: ring(0) }, properties: props("A.1") },
    { type: "Feature", geometry: { type: "MultiPolygon", coordinates: [ring(2), ring(4)] }, properties: props("A.2") },
  ],
};

async function zipOf(i = 0) {
  return JSZip.loadAsync(await saved[i].blob.arrayBuffer());
}

describe("downloadParcelExport", () => {
  it("geojson → FeatureCollection utuh (MultiPolygon tidak dipecah), berkas .geojson", async () => {
    await downloadParcelExport("geojson", PARCELS, "lahan_uji");
    expect(saved[0].name).toBe("lahan_uji.geojson");
    expect(saved[0].blob.type).toBe("application/geo+json");
    expect(JSON.parse(await saved[0].blob.text())).toEqual(PARCELS);
  });

  it("kml → dokumen KML berisi atribut lahan, berkas .kml", async () => {
    await downloadParcelExport("kml", PARCELS, "lahan_uji");
    expect(saved[0].name).toBe("lahan_uji.kml");
    const kml = await saved[0].blob.text();
    expect(kml).toContain("<kml");
    expect(kml).toContain("A.2");
    expect(kml.match(/<Placemark>/g)).toHaveLength(2);
  });

  it("shp → ZIP satu layer `lahan` + .cpg UTF-8; MultiPolygon dipecah per anggota", async () => {
    await downloadParcelExport("shp", PARCELS, "lahan_uji");
    expect(saved[0].name).toBe("lahan_uji.zip");
    const zip = await zipOf();
    const names = Object.keys(zip.files).map((n) => n.split("/").pop());
    expect(names).toEqual(expect.arrayContaining(["lahan.shp", "lahan.shx", "lahan.dbf", "lahan.prj", "lahan.cpg"]));
    expect(await zip.file(/lahan\.cpg$/)[0].async("string")).toBe("UTF-8");
    // DBF: header 32 byte, jumlah record = uint32 LE di offset 4 → 1 Polygon + 2 anggota MultiPolygon.
    const dbf = await zip.file(/lahan\.dbf$/)[0].async("uint8array");
    expect(new DataView(dbf.buffer, dbf.byteOffset).getUint32(4, true)).toBe(3);
    // Kolom DBF-safe (≤10 karakter) dari toDbfProperties, nama ber-diakritik ditransliterasi ASCII.
    const text = new TextDecoder("latin1").decode(dbf);
    expect(text).toContain("nm_petani");
    expect(text).toContain("Siti Salih");
  });
});

describe("downloadFeatureExport (generik, #331)", () => {
  const POINTS: FeatureCollection<Point, Record<string, unknown>> = {
    type: "FeatureCollection",
    features: [
      { type: "Feature", geometry: { type: "Point", coordinates: [101.1, 0.5] }, properties: { "Kode Patok": "HJP-PTK-000001", kondisi: "Ada", catatan: null } },
    ],
  };

  it("geojson → isi apa adanya", async () => {
    await downloadFeatureExport("geojson", POINTS, "patok", { shpLayer: "patok" });
    expect(saved[0].name).toBe("patok.geojson");
    expect(JSON.parse(await saved[0].blob.text())).toEqual(POINTS);
  });

  it("kml → satu Placemark per titik", async () => {
    await downloadFeatureExport("kml", POINTS, "patok", { shpLayer: "patok" });
    expect(saved[0].name).toBe("patok.kml");
    expect(await saved[0].blob.text()).toContain("HJP-PTK-000001");
  });

  it("shp titik → layer bernama shpLayer + .cpg; atribut bawaan dipotong ≤10 karakter & null → kosong", async () => {
    await downloadFeatureExport("shp", POINTS, "patok", { shpLayer: "patok" });
    const zip = await zipOf();
    const names = Object.keys(zip.files).map((n) => n.split("/").pop());
    expect(names).toEqual(expect.arrayContaining(["patok.shp", "patok.dbf", "patok.cpg"]));
    const dbf = new TextDecoder("latin1").decode(await zip.file(/patok\.dbf$/)[0].async("uint8array"));
    expect(dbf).toContain("Kode_Patok"); // "Kode Patok" → karakter non-DBF jadi "_", maks 10
    expect(dbf).toContain("HJP-PTK-000001");
  });

  it("shp poligon memakai toDbf kustom dan memecah MultiPolygon", async () => {
    const toDbf = vi.fn((p: Record<string, unknown>) => ({ kode: String(p.id) }));
    const fc: FeatureCollection<MultiPolygon, Record<string, unknown>> = {
      type: "FeatureCollection",
      features: [{ type: "Feature", geometry: { type: "MultiPolygon", coordinates: [ring(0), ring(3)] }, properties: { id: "N1" } }],
    };
    await downloadFeatureExport("shp", fc, "nkt", { shpLayer: "lahan_nkt", toDbf });
    expect(toDbf).toHaveBeenCalledTimes(2);
    const zip = await zipOf();
    expect(zip.file(/lahan_nkt\.shp$/)).toHaveLength(1);
    expect(await zip.file(/lahan_nkt\.cpg$/)[0].async("string")).toBe("UTF-8");
  });
});
