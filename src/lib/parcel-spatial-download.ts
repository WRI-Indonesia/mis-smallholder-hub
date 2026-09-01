import type { FeatureCollection, MultiPolygon, Polygon } from "geojson";
import {
  explodeMultiPolygons,
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
