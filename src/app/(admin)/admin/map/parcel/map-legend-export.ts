import type { Feature, FeatureCollection, MultiPolygon, Point, Polygon } from "geojson";
import { exportToExcel } from "@/lib/xlsx";
import { downloadFeatureExport } from "@/lib/parcel-spatial-download";
import { toAsciiDbf, toDbfProperties, parcelExportFileBase, type ParcelExportFormat, type ParcelExportProperties } from "@/lib/parcel-export-data";
import { LAND_MARKER_CONDITION_LABELS, LAND_MARKER_SOURCE_LABELS, LAND_MARKER_TYPE_LABELS, fmtCoord, labelOf } from "@/lib/land-marker";
import { isNktAffected } from "@/lib/land-parcel-satellite-format";
import type { LandMarkerExportRow } from "@/server/actions/land-marker";
import type { KTPoint } from "@/types/map";

/**
 * Unduhan per baris legenda Peta Lahan (#331) — helper klien murni (tanpa
 * action): tiap baris punya pembangun FeatureCollection + baris Excel sendiri,
 * dan format spasialnya mengikuti tipe fitur baris (Point/Polygon). Nama
 * berkas: `<baris>-<label filter>-<stempel WIB>`.
 */
export type LegendFormat = "xlsx" | ParcelExportFormat;

const base = (slug: string, label: string | null, now: Date) => `${slug}-${parcelExportFileBase(label, now)}`;

/** Titik tengah sederhana (rata-rata vertex ring luar pertama) — cukup untuk fitur "Point Lahan". */
function centroidOf(g: Polygon | MultiPolygon): [number, number] {
  const ring = g.type === "Polygon" ? g.coordinates[0] : g.coordinates[0]?.[0];
  if (!ring || ring.length === 0) return [0, 0];
  const [sx, sy] = ring.reduce(([ax, ay], [x, y]) => [ax + x, ay + y], [0, 0]);
  return [sx / ring.length, sy / ring.length];
}

// ─── Lembaga Petani (Point) ───

export async function exportKtRow(format: LegendFormat, kts: KTPoint[], label: string | null, now: Date) {
  const b = base("lembaga", label, now);
  if (format === "xlsx") {
    await exportToExcel({
      filename: b,
      sheetName: "Lembaga",
      columns: [
        { header: "Kode Lembaga", key: "code", width: 16 },
        { header: "Nama Lembaga", key: "name", width: 32 },
        { header: "Distrik", key: "districtName", width: 18 },
        { header: "Lintang", key: "lat", width: 14 },
        { header: "Bujur", key: "long", width: 14 },
      ],
      data: kts.map((k) => ({ code: k.code ?? "", name: k.name, districtName: k.districtName, lat: k.lat, long: k.long })),
    });
    return;
  }
  const fc: FeatureCollection<Point, Record<string, unknown>> = {
    type: "FeatureCollection",
    features: kts.map((k) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [k.long, k.lat] },
      properties: { kodeLembaga: k.code, lembaga: k.name, distrik: k.districtName },
    })),
  };
  await downloadFeatureExport(format, fc, b, {
    shpLayer: "lembaga",
    toDbf: (p) => ({ kd_lembaga: toAsciiDbf(String(p.kodeLembaga ?? "")), lembaga: toAsciiDbf(String(p.lembaga ?? "")), distrik: toAsciiDbf(String(p.distrik ?? "")) }),
  });
}

// ─── Lahan: Point (centroid) · Polygon (area) · Polygon NKT ───

const PARCEL_XLSX_COLUMNS = [
  { header: "ID Lahan", key: "idLahan", width: 28 },
  { header: "ID Petani", key: "idPetani", width: 24 },
  { header: "Nama Petani", key: "namaPetani", width: 26 },
  { header: "NIK", key: "nik", width: 18 },
  { header: "Kode Lembaga", key: "kodeLembaga", width: 14 },
  { header: "Lembaga Petani", key: "lembaga", width: 26 },
  { header: "Kelompok Tani", key: "kelompokTani", width: 18 },
  { header: "Distrik", key: "distrik", width: 14 },
  { header: "Blok", key: "blok", width: 10 },
  { header: "Luas (ha)", key: "luasHa", width: 10 },
  { header: "Status Lahan", key: "statusLahan", width: 14 },
  { header: "Komoditas", key: "komoditas", width: 14 },
  { header: "Species", key: "species", width: 14 },
  { header: "PSR", key: "psr", width: 8 },
  { header: "Tahun Tanam", key: "tahunTanam", width: 10 },
  { header: "NKT", key: "nkt", width: 16 },
  { header: "STDB", key: "stdb", width: 20 },
  { header: "Surat", key: "surat", width: 24 },
  { header: "Nama di Surat", key: "namaDiSurat", width: 24 },
  { header: "Luas Surat (ha)", key: "luasSurat", width: 12 },
  { header: "UL Parcel Code", key: "parcelCode", width: 18 },
  { header: "Pemeta", key: "pemeta", width: 12 },
  { header: "Program", key: "program", width: 20 },
  { header: "Revisi", key: "revisi", width: 8 },
];

type ParcelFc = FeatureCollection<Polygon | MultiPolygon, ParcelExportProperties>;

export async function exportParcelRow(
  row: "parcelPoints" | "parcelAreas" | "nkt",
  format: LegendFormat,
  fc: ParcelFc,
  label: string | null,
  now: Date,
): Promise<number> {
  const features = row === "nkt" ? fc.features.filter((f) => isNktAffected(nktCodeFromLabel(f.properties.nkt))) : fc.features;
  const slug = row === "parcelPoints" ? "titik-lahan" : row === "nkt" ? "lahan-nkt" : "lahan";
  const b = base(slug, label, now);
  if (features.length === 0) return 0;
  if (format === "xlsx") {
    const withCoord = row === "parcelPoints";
    await exportToExcel({
      filename: b,
      sheetName: "Data",
      columns: withCoord
        ? [PARCEL_XLSX_COLUMNS[0], { header: "Lintang", key: "lat", width: 14 }, { header: "Bujur", key: "lon", width: 14 }, ...PARCEL_XLSX_COLUMNS.slice(1)]
        : PARCEL_XLSX_COLUMNS,
      data: features.map((f) => {
        const [lon, lat] = withCoord ? centroidOf(f.geometry) : [null, null];
        const p = f.properties;
        return {
          ...Object.fromEntries(PARCEL_XLSX_COLUMNS.map((c) => [c.key, p[c.key] ?? ""])),
          nkt: p.nkt ?? "Belum dinilai",
          ...(withCoord ? { lat: Number(fmtCoord(lat as number)), lon: Number(fmtCoord(lon as number)) } : {}),
        };
      }),
    });
    return features.length;
  }
  if (row === "parcelPoints") {
    const pts: FeatureCollection<Point, Record<string, unknown>> = {
      type: "FeatureCollection",
      features: features.map((f) => ({ type: "Feature", geometry: { type: "Point", coordinates: centroidOf(f.geometry) }, properties: f.properties })),
    };
    await downloadFeatureExport(format, pts, b, { shpLayer: "titik_lahan", toDbf: (p) => toDbfProperties(p as ParcelExportProperties) });
    return features.length;
  }
  const polys: FeatureCollection<Polygon | MultiPolygon, Record<string, unknown>> = { type: "FeatureCollection", features: features as Feature<Polygon | MultiPolygon, Record<string, unknown>>[] };
  await downloadFeatureExport(format, polys, b, { shpLayer: slug.replace("-", "_"), toDbf: (p) => toDbfProperties(p as ParcelExportProperties) });
  return features.length;
}

/** Label pendek NKT di atribut ekspor → kode status (untuk saringan baris "Lahan NKT"). */
function nktCodeFromLabel(label: string | null): string | null {
  if (!label) return null;
  if (label.startsWith("Termasuk")) return "INCLUDED";
  if (label.startsWith("Terdampak")) return "AFFECTED";
  return "NOT_AFFECTED";
}

// ─── Patok (Point) ───

const MARKER_XLSX_COLUMNS = [
  { header: "ID Lahan", key: "parcelId", width: 28 },
  { header: "ID Petani", key: "farmerCode", width: 24 },
  { header: "Nama Petani", key: "farmerName", width: 26 },
  { header: "Lembaga Petani", key: "groupName", width: 26 },
  { header: "Kelompok Tani", key: "subGroupLv2", width: 20 },
  { header: "Blok", key: "blok", width: 10 },
  { header: "No Patok", key: "sequenceNo", width: 10 },
  { header: "Lintang", key: "latitude", width: 14 },
  { header: "Bujur", key: "longitude", width: 14 },
  { header: "Kondisi", key: "condition", width: 16 },
  { header: "Jenis", key: "type", width: 12 },
  { header: "Tanggal Pemasangan", key: "installedAt", width: 14 },
  { header: "Dipasang oleh", key: "installedBy", width: 20 },
  { header: "Sumber koordinat", key: "source", width: 16 },
  { header: "NKT", key: "nkt", width: 8 },
  { header: "Dipakai juga oleh", key: "sharedWith", width: 30 },
  { header: "Keterangan", key: "notes", width: 30 },
];

export async function exportMarkerRow(
  row: "markers" | "markersNkt",
  format: LegendFormat,
  rows: (LandMarkerExportRow & { markerId: string })[],
  label: string | null,
  now: Date,
): Promise<number> {
  const b = base(row === "markersNkt" ? "patok-nkt" : "patok", label, now);
  if (rows.length === 0) return 0;
  const fmt = (r: LandMarkerExportRow) => ({
    ...r,
    subGroupLv2: r.subGroupLv2 ?? "",
    blok: r.blok ?? "",
    latitude: Number(fmtCoord(r.latitude)),
    longitude: Number(fmtCoord(r.longitude)),
    condition: labelOf(LAND_MARKER_CONDITION_LABELS, r.condition),
    type: labelOf(LAND_MARKER_TYPE_LABELS, r.type),
    installedAt: r.installedAt ?? "",
    installedBy: r.installedBy ?? "",
    source: labelOf(LAND_MARKER_SOURCE_LABELS, r.source),
    nkt: r.nkt ? "Ya" : "",
    sharedWith: r.sharedWith.join(", "),
    notes: r.notes ?? "",
  });
  if (format === "xlsx") {
    await exportToExcel({ filename: b, sheetName: "Patok", columns: MARKER_XLSX_COLUMNS, data: rows.map(fmt) });
    return rows.length;
  }
  // Spasial: SATU fitur per patok fisik (baris Excel = per lahan) — lahan pemakai digabung "ID #n; …".
  const byMarker = new Map<string, (LandMarkerExportRow & { markerId: string })[]>();
  for (const r of rows) byMarker.set(r.markerId, [...(byMarker.get(r.markerId) ?? []), r]);
  const fc: FeatureCollection<Point, Record<string, unknown>> = {
    type: "FeatureCollection",
    features: [...byMarker.entries()].map(([id, group]) => {
      const r = group[0];
      const f = fmt(r);
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [r.longitude, r.latitude] },
        properties: {
          idPatok: id,
          lahan: group.map((x) => `${x.parcelId} #${x.sequenceNo}`).join("; "),
          petani: [...new Set(group.map((x) => x.farmerName))].join("; "),
          lembaga: r.groupName,
          kondisi: f.condition,
          jenis: f.type,
          dipasang: f.installedAt,
          oleh: f.installedBy,
          sumber: f.source,
          nkt: f.nkt,
          keterangan: f.notes,
        },
      };
    }),
  };
  await downloadFeatureExport(format, fc, b, {
    shpLayer: row === "markersNkt" ? "patok_nkt" : "patok",
    toDbf: (p) => ({
      id_patok: String(p.idPatok ?? ""),
      lahan: toAsciiDbf(String(p.lahan ?? "")),
      petani: toAsciiDbf(String(p.petani ?? "")),
      lembaga: toAsciiDbf(String(p.lembaga ?? "")),
      kondisi: toAsciiDbf(String(p.kondisi ?? "")),
      jenis: toAsciiDbf(String(p.jenis ?? "")),
      dipasang: String(p.dipasang ?? ""),
      oleh: toAsciiDbf(String(p.oleh ?? "")),
      sumber: toAsciiDbf(String(p.sumber ?? "")),
      nkt: String(p.nkt ?? ""),
      keterangan: toAsciiDbf(String(p.keterangan ?? "")),
    }),
  });
  return byMarker.size;
}
