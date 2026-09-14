import type { FeatureCollection, MultiPolygon, Point, Polygon } from "geojson";
import {
  explodeMultiPolygons,
  toAsciiDbf,
  toDbfProperties,
  type ParcelExportFormat,
  type ParcelExportProperties,
} from "@/lib/parcel-export-data";

/**
 * Unduhan data spasial lahan di browser (#313): SHP ZIP / GeoJSON / KML.
 * Client-only; library berat (shp-write, jszip, tokml) di-import dinamis agar
 * tidak membebani bundle awal — pola ekspor titik api (#293).
 */

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * ZIP Shapefile (shp/shx/dbf/prj WGS84 + cpg UTF-8). MultiPolygon dipecah per
 * poligon anggota (lubang tetap ikut) supaya hasilnya SATU layer polygon —
 * shp-write menulis Polygon dan MultiPolygon sebagai dua shapefile terpisah,
 * dan MultiPolygon-nya rawan salah baca (risiko #313). Atribut dipetakan ke
 * kolom DBF-safe ≤10 karakter.
 */
async function downloadShp(
  fc: FeatureCollection<Polygon | MultiPolygon, ParcelExportProperties>,
  base: string
): Promise<void> {
  const [shpwrite, { default: JSZip }] = await Promise.all([
    import("@mapbox/shp-write"),
    import("jszip"),
  ]);
  const exploded = explodeMultiPolygons(fc);
  const clean: FeatureCollection = {
    type: "FeatureCollection",
    features: exploded.features.map((f) => ({
      type: "Feature",
      geometry: f.geometry,
      properties: toDbfProperties(f.properties),
    })),
  };
  const blob = await shpwrite.zip<"blob">(clean, {
    outputType: "blob",
    compression: "DEFLATE",
    types: { polygon: "lahan" },
  });
  // shp-write tidak menulis .cpg; sisipkan agar QGIS membaca DBF sebagai UTF-8
  // (nama petani ber-diakritik). Muat ulang ZIP-nya lalu regenerasi.
  const zip = await JSZip.loadAsync(blob);
  zip.file("lahan.cpg", "UTF-8");
  const withCpg = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  saveBlob(withCpg, `${base}.zip`);
}

async function downloadKml(
  fc: FeatureCollection<Polygon | MultiPolygon, ParcelExportProperties>,
  base: string
): Promise<void> {
  // Geometri + atribut polos, tanpa styling (pertanyaan terbuka #313 —
  // default paling netral untuk diolah lanjut di Google Earth/GIS).
  const { toKML } = await import("@placemarkio/tokml");
  const kml = toKML(fc);
  saveBlob(new Blob([kml], { type: "application/vnd.google-earth.kml+xml" }), `${base}.kml`);
}

function downloadGeojson(
  fc: FeatureCollection<Polygon | MultiPolygon, ParcelExportProperties>,
  base: string
): void {
  saveBlob(new Blob([JSON.stringify(fc)], { type: "application/geo+json" }), `${base}.geojson`);
}

/** Unduh FeatureCollection lahan pada format terpilih; `base` tanpa ekstensi. */
export async function downloadParcelExport(
  format: ParcelExportFormat,
  fc: FeatureCollection<Polygon | MultiPolygon, ParcelExportProperties>,
  base: string
): Promise<void> {
  if (format === "shp") return downloadShp(fc, base);
  if (format === "kml") return downloadKml(fc, base);
  return Promise.resolve(downloadGeojson(fc, base));
}

// ─── Unduhan generik (#331): baris legenda Peta Lahan — Point (Lembaga, titik lahan,
// patok) maupun Polygon (area lahan, lahan NKT) dengan atribut bebas. ───

export type ExportGeometry = Point | Polygon | MultiPolygon;

export interface GenericExportOptions {
  /** Nama layer di dalam ZIP shapefile (tanpa ekstensi), mis. "patok". */
  shpLayer: string;
  /** Pemetaan atribut → kolom DBF-safe (≤10 karakter, ASCII). Bawaan: potong nama & transliterasi. */
  toDbf?: (props: Record<string, unknown>) => Record<string, unknown>;
}

function defaultDbf(props: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    const key = k.replace(/[^A-Za-z0-9_]/g, "_").slice(0, 10);
    out[key] = typeof v === "string" ? toAsciiDbf(v) : v == null ? "" : v;
  }
  return out;
}

/**
 * Unduh FeatureCollection apa pun (Point/Polygon/MultiPolygon) pada format
 * terpilih. SHP: MultiPolygon dipecah per anggota; geometri campuran ditolak
 * oleh shp-write, jadi pemanggil memastikan satu tipe per unduhan.
 */
export async function downloadFeatureExport(
  format: ParcelExportFormat,
  fc: FeatureCollection<ExportGeometry, Record<string, unknown>>,
  base: string,
  opts: GenericExportOptions
): Promise<void> {
  if (format === "geojson") {
    saveBlob(new Blob([JSON.stringify(fc)], { type: "application/geo+json" }), `${base}.geojson`);
    return;
  }
  if (format === "kml") {
    const { toKML } = await import("@placemarkio/tokml");
    saveBlob(new Blob([toKML(fc)], { type: "application/vnd.google-earth.kml+xml" }), `${base}.kml`);
    return;
  }
  const [shpwrite, { default: JSZip }] = await Promise.all([import("@mapbox/shp-write"), import("jszip")]);
  const toDbf = opts.toDbf ?? defaultDbf;
  const isPoint = fc.features.every((f) => f.geometry.type === "Point");
  const source: FeatureCollection<ExportGeometry, Record<string, unknown>> = isPoint
    ? fc
    : explodeMultiPolygons(fc as FeatureCollection<Polygon | MultiPolygon, Record<string, unknown>>);
  const clean: FeatureCollection = {
    type: "FeatureCollection",
    features: source.features.map((f) => ({
      type: "Feature",
      geometry: f.geometry,
      properties: toDbf(f.properties ?? {}),
    })),
  };
  const blob = await shpwrite.zip<"blob">(clean, {
    outputType: "blob",
    compression: "DEFLATE",
    types: isPoint ? { point: opts.shpLayer } : { polygon: opts.shpLayer },
  });
  const zip = await JSZip.loadAsync(blob);
  zip.file(`${opts.shpLayer}.cpg`, "UTF-8");
  const withCpg = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  saveBlob(withCpg, `${base}.zip`);
}
