import type { Feature, FeatureCollection, MultiPolygon, Point, Polygon } from "geojson";
import { exportToExcel } from "@/lib/xlsx";
import { downloadFeatureExport } from "@/lib/parcel-spatial-download";
import { toAsciiDbf, toDbfProperties, parcelExportFileBase, type ParcelExportFormat, type ParcelExportProperties } from "@/lib/parcel-export-data";
import { LAND_MARKER_CONDITION_LABELS, fmtCoord, labelOf, uniqueMarkerRows, groupMarkersByParcel, MARKER_XLSX_COLUMNS, formatUniqueMarkerRow } from "@/lib/land-marker";
import { isNktAffected, landNktStatusFromShortLabel } from "@/lib/land-parcel-satellite-format";
import type { LandMarkerExportRow } from "@/server/actions/land-marker";
import type { KTPoint } from "@/types/map";
import { buildLayerReportDoc, type LayerReportContext, type LayerReportInput } from "@/lib/layer-report-pdf";
import type { ParcelFeature } from "@/types/map";

const RED: [number, number, number] = [220, 38, 38];
const PURPLE: [number, number, number] = [126, 34, 206];
const GREEN: [number, number, number] = [34, 197, 94];
const BLUE: [number, number, number] = [59, 130, 246];
const YELLOW: [number, number, number] = [250, 204, 21];

/** Konteks lahan (poligon hasil filter yang sudah dimuat peta) di belakang titik — NKT diarsir merah/amber. */
export function parcelContext(parcels: ParcelFeature[]): LayerReportContext {
  return {
    fc: { type: "FeatureCollection", features: parcels.map((p) => ({ type: "Feature", geometry: p.geometry, properties: { nktStatus: p.nktStatus, farmerName: p.farmerName } })) },
    colorOf: (p) => (isNktAffected(p.nktStatus as string | null) ? RED : null),
    // Nama petani di dalam poligon bila muat (owner 2026-09-14) — di halaman peta rinci lahan cukup besar.
    labelOf: (p) => (typeof p.farmerName === "string" && p.farmerName ? p.farmerName : null),
  };
}
// Termasuk = terdampak di mata pengguna (owner 2026-09-14) → satu kategori "Lahan NKT", satu warna.
const CONTEXT_LEGEND: { color: [number, number, number]; label: string }[] = [
  { color: [239, 230, 250], label: "Lahan lain" },
  { color: RED, label: "Lahan NKT" },
];

/**
 * Unduhan per baris legenda Peta Lahan (#331) — helper klien murni (tanpa
 * action): tiap baris punya pembangun FeatureCollection + baris Excel sendiri,
 * dan format spasialnya mengikuti tipe fitur baris (Point/Polygon). Nama
 * berkas: `<baris>-<label filter>-<stempel WIB>`.
 */
export type LegendFormat = "xlsx" | "pdf" | ParcelExportFormat;


const printedAt = (now: Date) => new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(now);

function savePdf(input: LayerReportInput, base: string) {
  buildLayerReportDoc(input).save(`${base}.pdf`);
}

const base = (slug: string, label: string | null, now: Date) => `${slug}-${parcelExportFileBase(label, now)}`;

/** Titik tengah sederhana (rata-rata vertex ring luar pertama) — cukup untuk fitur "Point Lahan". */
function centroidOf(g: Polygon | MultiPolygon): [number, number] {
  const ring = g.type === "Polygon" ? g.coordinates[0] : g.coordinates[0]?.[0];
  if (!ring || ring.length === 0) return [0, 0];
  const [sx, sy] = ring.reduce(([ax, ay], [x, y]) => [ax + x, ay + y], [0, 0]);
  return [sx / ring.length, sy / ring.length];
}

// ─── Lembaga Petani (Point) ───

export async function exportKtRow(format: LegendFormat, kts: KTPoint[], label: string | null, now: Date, context?: LayerReportContext) {
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
  if (format === "pdf") {
    savePdf({
      title: "Point Lembaga Petani",
      subtitle: `${label ?? "Semua"} · ${kts.length} lembaga · dicetak ${printedAt(now)}`,
      fc,
      context,
      style: { color: GREEN, numbered: true },
      legend: [{ color: GREEN, label: "Lembaga Petani" }, ...(context ? CONTEXT_LEGEND : [])],
      columns: [
        { header: "No", key: "no", align: "right", width: 10 },
        { header: "Kode", key: "code", width: 26 },
        { header: "Nama Lembaga", key: "name" },
        { header: "Distrik", key: "districtName", width: 30 },
        { header: "Lintang", key: "lat", align: "right", width: 24 },
        { header: "Bujur", key: "long", align: "right", width: 24 },
      ],
      rows: kts.map((k, i) => ({ no: i + 1, code: k.code, name: k.name, districtName: k.districtName, lat: fmtCoord(k.lat), long: fmtCoord(k.long) })),
    }, b);
    return;
  }
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
  context?: LayerReportContext,
): Promise<number> {
  const features = row === "nkt" ? fc.features.filter((f) => isNktAffected(landNktStatusFromShortLabel(f.properties.nkt))) : fc.features;
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
  if (format === "pdf") {
    const isPoint = row === "parcelPoints";
    const fcPdf: FeatureCollection<Point | Polygon | MultiPolygon, Record<string, unknown>> = {
      type: "FeatureCollection",
      features: features.map((f) => ({
        type: "Feature",
        geometry: isPoint ? { type: "Point", coordinates: centroidOf(f.geometry) } : f.geometry,
        properties: f.properties,
      })),
    };
    const nktColor = (p: Record<string, unknown>) => (isNktAffected(landNktStatusFromShortLabel(typeof p.nkt === "string" ? p.nkt : null)) ? RED : isPoint ? BLUE : PURPLE);
    savePdf({
      title: row === "nkt" ? "Lahan terdampak NKT" : isPoint ? "Point Lahan Petani" : "Area Lahan Petani",
      subtitle: `${label ?? "Semua"} · ${features.length} lahan · dicetak ${printedAt(now)}`,
      fc: fcPdf,
      // Titik lahan & lahan NKT: lahan lain sebagai konteks; Area Lahan sudah menggambar semua poligonnya sendiri.
      context: row === "parcelAreas" ? undefined : context,
      style: { colorOf: nktColor, numbered: true, labelOf: isPoint ? undefined : (p) => (typeof p.namaPetani === "string" ? p.namaPetani : null) },
      legend: row === "nkt"
        ? [{ color: RED, label: "Lahan NKT" }, ...(context ? [CONTEXT_LEGEND[0]] : [])]
        : isPoint
          ? [{ color: BLUE, label: "Titik lahan" }, ...(context ? CONTEXT_LEGEND : [])]
          : [{ color: PURPLE, label: "Lahan" }, { color: RED, label: "Lahan NKT" }],
      columns: [
        { header: "No", key: "no", align: "right", width: 9 },
        { header: "ID Lahan", key: "idLahan", width: 40 },
        { header: "Petani", key: "namaPetani" },
        { header: "Lembaga", key: "lembaga", width: 30 },
        { header: "KT / Blok", key: "ktBlok", width: 22 },
        { header: "Luas (ha)", key: "luasHa", align: "right", width: 16 },
        { header: "NKT", key: "nkt", width: 24 },
        ...(isPoint ? [{ header: "Lintang, Bujur", key: "coord", width: 34 }] : [{ header: "Tahun Tanam", key: "tahunTanam", align: "right" as const, width: 18 }]),
      ],
      rows: features.map((f, i) => {
        const p = f.properties;
        const [lon, lat] = isPoint ? centroidOf(f.geometry) : [0, 0];
        return {
          no: i + 1,
          idLahan: p.idLahan,
          namaPetani: p.namaPetani,
          lembaga: p.lembaga,
          ktBlok: [p.kelompokTani, p.blok].filter(Boolean).join(" / "),
          luasHa: p.luasHa != null ? new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(p.luasHa as number) : null,
          nkt: p.nkt ?? "Belum dinilai",
          coord: isPoint ? `${fmtCoord(lat)}, ${fmtCoord(lon)}` : null,
          tahunTanam: p.tahunTanam,
        };
      }),
    }, b);
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

// ─── Patok (Point) — satu baris/fitur per patok FISIK (keputusan owner 2026-09-14) ───

export async function exportMarkerRow(
  format: LegendFormat,
  rows: LandMarkerExportRow[],
  label: string | null,
  now: Date,
  context?: LayerReportContext,
): Promise<number> {
  // Semua patok = patok lahan (#345): unduhan "patok-nkt" turunan dihapus.
  const b = base("patok", label, now);
  if (rows.length === 0) return 0;
  const unique = uniqueMarkerRows(rows);
  const data = unique.map(formatUniqueMarkerRow);
  if (format === "xlsx") {
    await exportToExcel({ filename: b, sheetName: "Patok", columns: MARKER_XLSX_COLUMNS, data });
    return unique.length;
  }
  if (format === "pdf") {
    // Tabel per LAHAN (owner 2026-09-14: baris per patok mengulang nama/ID petani);
    // nomor di peta = urutan patok unik, dicantumkan di tiap patok pada sel "Patok".
    const groups = groupMarkersByParcel(rows, unique);
    savePdf({
      title: "Patok lahan",
      subtitle: `${label ?? "Semua"} · ${unique.length} patok · ${groups.length} lahan · urut Kelompok Tani, Blok · dicetak ${printedAt(now)}`,
      fc: {
        type: "FeatureCollection",
        features: unique.map((r) => ({ type: "Feature", geometry: { type: "Point", coordinates: [r.longitude, r.latitude] }, properties: {} })),
      },
      context,
      style: { colorOf: () => YELLOW, numbered: true },
      legend: [{ color: YELLOW, label: "Patok lahan" }, ...(context ? CONTEXT_LEGEND : [])],
      columns: [
        { header: "No", key: "no", align: "right", width: 9 },
        { header: "KT / Blok", key: "ktBlok", width: 22 },
        { header: "Nama Petani", key: "farmerName", width: 38 },
        { header: "ID Petani", key: "farmerCode", width: 42 },
        { header: "ID Lahan", key: "parcelId", width: 44 },
        // Empat kolom sejajar per patok (satu patok per baris sel) — bukan satu sel gabungan.
        { header: "No peta", key: "mapNo", align: "right", width: 14 },
        { header: "Kode Patok", key: "code", width: 32 },
        { header: "No di lahan", key: "seq", align: "right", width: 18 },
        { header: "Kondisi", key: "condition" },
      ],
      rows: groups.map((g, i) => ({
        no: i + 1,
        ktBlok: [g.subGroupLv2, g.blok].filter(Boolean).join(" / "),
        farmerName: g.farmerName,
        farmerCode: g.farmerCode,
        parcelId: g.parcelId,
        mapNo: g.markers.map((m) => String(m.mapNo)).join("\n"),
        code: g.markers.map((m) => m.code).join("\n"),
        seq: g.markers.map((m) => `#${m.sequenceNo}`).join("\n"),
        condition: g.markers.map((m) => labelOf(LAND_MARKER_CONDITION_LABELS, m.condition)).join("\n"),
      })),
    }, b);
    return unique.length;
  }
  const fc: FeatureCollection<Point, Record<string, unknown>> = {
    type: "FeatureCollection",
    features: data.map((r) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [r.longitude, r.latitude] },
      properties: {
        idPatok: r.markerId,
        kodePatok: r.code,
        kelompokTani: r.subGroupLv2,
        blok: r.blok,
        lahan: r.lahan,
        petani: r.farmerNames,
        lembaga: r.groupName,
        kondisi: r.condition,
        // "bahan" (owner 2026-09-20, #345) — dulu "jenis".
        bahan: r.type,
        dipasang: r.installedAt,
        oleh: r.installedBy,
        sumber: r.source,
        keterangan: r.notes,
      },
    })),
  };
  await downloadFeatureExport(format, fc, b, {
    shpLayer: "patok",
    toDbf: (p) => ({
      id_patok: String(p.idPatok ?? ""),
      kode: String(p.kodePatok ?? ""),
      kel_tani: toAsciiDbf(String(p.kelompokTani ?? "")),
      blok: toAsciiDbf(String(p.blok ?? "")),
      lahan: toAsciiDbf(String(p.lahan ?? "")),
      petani: toAsciiDbf(String(p.petani ?? "")),
      lembaga: toAsciiDbf(String(p.lembaga ?? "")),
      kondisi: toAsciiDbf(String(p.kondisi ?? "")),
      bahan: toAsciiDbf(String(p.bahan ?? "")),
      dipasang: String(p.dipasang ?? ""),
      oleh: toAsciiDbf(String(p.oleh ?? "")),
      sumber: toAsciiDbf(String(p.sumber ?? "")),
      keterangan: toAsciiDbf(String(p.keterangan ?? "")),
    }),
  });
  return unique.length;
}
