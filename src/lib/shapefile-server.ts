// Parser ZIP shapefile bersama (server-only) — dipakai bulk upload Lahan dan
// Pohon (#238). Sebelumnya logika ini hidup di bulk-upload-parcel.ts; jalur
// pohon sempat mem-fork-nya tanpa workaround proj4 CEA sehingga shapefile
// berproyeksi cylindrical_equal_area gagal di satu jalur tapi sukses di jalur
// lain (temuan review #238). Guard permission tetap di masing-masing action.
import type { Feature, GeoJsonProperties } from "geojson";

export interface ParsedShapefileFeature {
  index: number;
  // NonNullable<GeoJsonProperties> = bentuk properti asli shpjs — menjaga
  // kompatibilitas dengan konsumen lama (mapping kolom exceljs di klien lahan).
  properties: NonNullable<GeoJsonProperties>;
  geometry: Feature["geometry"] | null;
}

// Bentuk longgar (bukan discriminated union) mengikuti kontrak lama
// parseShapefile agar penanganan `res.error` di kedua klien tetap valid.
export interface ParseShapefileResult {
  success: boolean;
  features?: ParsedShapefileFeature[];
  error?: string;
}

export async function parseShapefileZip(base64Data: string): Promise<ParseShapefileResult> {
  // (bentuk hasil: { success, features? , error? } — lihat ParseShapefileResult)
  // Polyfill self to avoid ReferenceError: self is not defined when running shpjs on the server
  if (typeof self === "undefined") {
    (globalThis as unknown as { self: typeof globalThis }).self = globalThis;
  }

  // Register cylindrical_equal_area alias to cea projection in proj4
  try {
    const proj4 = (await import("proj4")).default;
    const cea = proj4.Proj.projections.get("cea");
    if (cea) {
      if (!cea.names.includes("cylindrical_equal_area")) {
        cea.names.push("cylindrical_equal_area");
        (proj4.Proj.projections as unknown as { add: (proj: unknown) => void }).add(cea);
      }
      // Override init to handle missing lat_ts (latitude of true scale) in WKT
      if (!(cea as unknown as { _initOverridden?: boolean })._initOverridden) {
        const originalInit = cea.init;
        cea.init = function () {
          const self = this as unknown as { lat_ts?: number; lat1?: number; lat0?: number };
          if (self.lat_ts === undefined) {
            self.lat_ts = self.lat1 ?? self.lat0 ?? 0;
          }
          originalInit.apply(this);
        };
        (cea as unknown as { _initOverridden?: boolean })._initOverridden = true;
      }
    }
  } catch (projError) {
    console.error("Failed to register proj4 alias:", projError);
  }

  try {
    const shp = (await import("shpjs")).default;
    const buffer = Buffer.from(base64Data, "base64");
    // shpjs can parse a zip buffer containing shapefiles directly
    const geojson = await shp(buffer);

    const features: Feature[] = [];
    if (Array.isArray(geojson)) {
      for (const gc of geojson) {
        if (gc.type === "FeatureCollection") {
          features.push(...gc.features);
        }
      }
    } else if (geojson && geojson.type === "FeatureCollection") {
      features.push(...geojson.features);
    }

    return {
      success: true,
      features: features.map((f, index) => ({
        index,
        properties: f.properties || {},
        geometry: f.geometry || null,
      })),
    };
  } catch (error) {
    console.error("Shapefile parsing error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message || "Gagal mengurai file shapefile" };
  }
}
