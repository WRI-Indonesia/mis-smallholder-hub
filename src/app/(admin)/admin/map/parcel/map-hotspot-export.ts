/**
 * Ekspor layer Titik Api dari Peta Lahan: ZIP Shapefile (point WGS84) dan
 * laporan PDF (ringkasan + tabel deteksi). Client-only; library berat
 * (shp-write, jsPDF) di-import dinamis agar tidak membebani bundle awal peta.
 */

import type { FeatureCollection, Point } from "geojson";
import type { KTPoint } from "@/types/map";
import {
  HOTSPOT_CONF_LABELS,
  confidenceLabel,
  countByConfidence,
  formatWib,
  hotspotWindowLabel,
  satelliteLabel,
  type HotspotDayRange,
} from "./map-hotspot";
import {
  COMPASS_LEGEND_ID,
  bearingDegrees,
  compassPointId,
  haversineMeters,
} from "./map-geo";
import { formatArea, formatNumber } from "@/lib/format";

const windowLabel = (dayRange: HotspotDayRange) => `${hotspotWindowLabel(dayRange)} terakhir`;

/** Disclaimer sumber data pada laporan PDF (dipakai di 2 cabang render). */
const PDF_DISCLAIMER =
  "Deteksi anomali panas VIIRS 375 m, bukan konfirmasi kebakaran. Sumber: NASA FIRMS (LANCE/EOSDIS) · jeda ±3 jam.";

/** Keterangan kolom "Jarak (km) & Arah dari Kantor Lembaga" pada PDF (#293). */
const PDF_BEARING_NOTE = `Arah diukur dari kantor Lembaga Petani menuju titik api (0° = utara) — ${COMPASS_LEGEND_ID}.`;

/** Timestamp WIB ringkas untuk nama file, mis. "20260810-1417". */
function wibFileStamp(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}${get("month")}${get("day")}-${get("hour")}${get("minute")}`;
}

export function fileBase(dayRange: HotspotDayRange, now: Date): string {
  return `titik-api-riau-${dayRange === 1 ? "24jam" : `${dayRange}hari`}-${wibFileStamp(now)}`;
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Fitur point titik api terurut terbaru → terlama (berdasar acqDatetime). */
function sortedPoints(fc: FeatureCollection) {
  return fc.features
    .filter((f) => f.geometry.type === "Point")
    .sort((a, b) =>
      String(b.properties?.acqDatetime ?? "").localeCompare(String(a.properties?.acqDatetime ?? ""))
    );
}

/**
 * Unduh titik api sebagai ZIP Shapefile (shp/shx/dbf/prj, WGS84).
 * Properti dipetakan ulang ke nama kolom DBF-safe (maks 10 karakter).
 */
export async function downloadHotspotShapefile(
  fc: FeatureCollection,
  dayRange: HotspotDayRange,
  now: Date
): Promise<void> {
  const shpwrite = await import("@mapbox/shp-write");
  const str = (v: unknown) => (v == null ? "" : String(v));
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  const clean: FeatureCollection = {
    type: "FeatureCollection",
    features: sortedPoints(fc).map((f) => ({
      type: "Feature",
      geometry: f.geometry as Point,
      properties: {
        acq_date: str(f.properties?.acqDate),
        acq_time: str(f.properties?.acqTime),
        datetime: str(f.properties?.acqDatetime),
        satellite: str(f.properties?.satellite),
        confidence: str(f.properties?.confidence),
        frp_mw: num(f.properties?.frp),
        brightness: num(f.properties?.brightness),
        daynight: str(f.properties?.daynight),
      },
    })),
  };
  const blob = await shpwrite.zip<"blob">(clean, {
    outputType: "blob",
    compression: "DEFLATE",
    types: { point: "titik_api" },
  });
  saveBlob(blob, `${fileBase(dayRange, now)}.zip`);
}

/** Lembaga Petani terdekat dari sebuah titik api (dari data KT yang dimuat di peta). */
function nearestKt(
  lon: number,
  lat: number,
  ktPoints: KTPoint[]
): { name: string; meters: number; bearing: number } | null {
  let best: { name: string; meters: number; lon: number; lat: number } | null = null;
  for (const kt of ktPoints) {
    const m = haversineMeters([lon, lat], [kt.long, kt.lat]);
    if (!best || m < best.meters)
      best = { name: kt.name, meters: m, lon: kt.long, lat: kt.lat };
  }
  if (!best) return null;
  // Bearing dihitung SEKALI untuk pemenang, di luar loop (#293): loop ini
  // berjalan sebanyak (jumlah titik api x jumlah lembaga) dan pada rentang
  // 30 hari titiknya ribuan — trigonometri tambahan di dalam loop akan terasa.
  //
  // Arahnya lembaga -> titik api ("titik api ada di sebelah X dari kantor"),
  // BUKAN sebaliknya; keduanya berselisih 180°.
  return {
    name: best.name,
    meters: best.meters,
    bearing: bearingDegrees([best.lon, best.lat], [lon, lat]),
  };
}

/** Satu titik api + hasil kalkulasi lembaga terdekatnya (precomputed untuk PDF). */
export type HotspotNearestRow = {
  f: FeatureCollection["features"][number];
  lon: number;
  lat: number;
  nearest: { name: string; meters: number; bearing: number } | null;
};

/**
 * Kalkulasi lembaga terdekat untuk semua titik api secara bertahap (chunk per
 * event-loop tick) agar peta tetap responsif saat titiknya ribuan. Batalkan
 * lewat `signal` (hasil di-discard); resolve berisi baris terurut waktu
 * deteksi terbaru (urutan `sortedPoints`).
 */
export async function calcHotspotNearest(
  fc: FeatureCollection,
  ktPoints: KTPoint[],
  signal?: AbortSignal
): Promise<HotspotNearestRow[]> {
  const CHUNK = 250;
  const points = sortedPoints(fc);
  const rows: HotspotNearestRow[] = [];
  for (let i = 0; i < points.length; i += CHUNK) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    for (const f of points.slice(i, i + CHUNK)) {
      const [lon, lat] = (f.geometry as Point).coordinates;
      rows.push({ f, lon, lat, nearest: nearestKt(lon, lat, ktPoints) });
    }
    // Lepaskan main thread antar-chunk supaya render peta tidak tersendat.
    await new Promise((r) => setTimeout(r, 0));
  }
  return rows;
}

/** Format jarak meter → "x,xx" km (id-ID, 2 desimal via formatter bersama). */
export const formatKm = (meters: number) => formatArea(meters / 1000);

/** Sel baris deteksi yang sama untuk tabel modal ringkasan & tabel PDF
 *  (dedup #241). Keyakinan tidak ikut: modal memakai badge, PDF label teks. */
export function hotspotRowCells(r: HotspotNearestRow): {
  time: string;
  satellite: string;
  frp: string;
  nearestName: string;
  distanceKm: string;
  /** "2,49 · B 287°" — jarak + arah dari kantor Lembaga menuju titik api (#293). */
  distanceDir: string;
} {
  const frp = r.f.properties?.frp;
  return {
    time: formatWib(r.f.properties?.acqDatetime as string | null),
    satellite: satelliteLabel(r.f.properties?.satellite),
    frp: typeof frp === "number" && Number.isFinite(frp) ? frp.toFixed(1) : "—",
    nearestName: r.nearest?.name ?? "—",
    distanceKm: r.nearest ? formatKm(r.nearest.meters) : "—",
    distanceDir: r.nearest
      ? `${formatKm(r.nearest.meters)} · ${compassPointId(r.nearest.bearing)} ${Math.round(r.nearest.bearing)}°`
      : "—",
  };
}

/** Ambang laporan/ringkasan: hanya titik api berjarak < 15 km dari Lembaga Petani. */
export const NEAR_KM_THRESHOLD = 15;

/** Baris hasil kalkulasi yang < 15 km dari lembaga, urut jarak terdekat. */
export function filterNearSorted(rows: HotspotNearestRow[]): HotspotNearestRow[] {
  return rows
    .filter((r) => r.nearest !== null && r.nearest.meters / 1000 < NEAR_KM_THRESHOLD)
    .sort((a, b) => (a.nearest?.meters ?? 0) - (b.nearest?.meters ?? 0));
}

/**
 * Buat laporan PDF titik api (landscape) lalu unduh. Ringkasan menampilkan
 * total titik + jumlah yang < 15 km dari Lembaga Petani; tabel hanya memuat
 * titik < 15 km tsb, dengan kolom Lembaga Terdekat & Jarak (km), diurutkan
 * dari jarak terdekat. `nearestRows` = hasil `calcHotspotNearest` (dihitung
 * lazy di background); bila null (data peta tanpa titik Lembaga Petani →
 * jarak tak bisa dihitung), tabel memuat semua titik (kolom jarak "—") dengan
 * keterangan di header. `area` = Provinsi & Distrik SAAT data dimuat (snapshot
 * dari klien, bukan pilihan combobox berjalan), ditampilkan di header laporan.
 */
export async function printHotspotPdf(
  fc: FeatureCollection,
  dayRange: HotspotDayRange,
  now: Date,
  nearestRows: HotspotNearestRow[] | null,
  area: { provinceName: string | null; districtName: string | null }
): Promise<void> {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const SLATE_800: [number, number, number] = [30, 41, 59];
  const SLATE_600: [number, number, number] = [71, 85, 105];
  const RED: [number, number, number] = [239, 68, 68];
  const MARGIN = 14;
  const PAGE_H = 210; // A4 landscape

  const counts = countByConfidence(fc);
  const total = counts.high + counts.nominal + counts.low;

  const hasDistance = nearestRows !== null;
  const all: HotspotNearestRow[] =
    nearestRows ??
    sortedPoints(fc).map((f) => {
      const [lon, lat] = (f.geometry as Point).coordinates;
      return { f, lon, lat, nearest: null };
    });
  // Tabel: hanya titik < 15 km, terdekat dulu. Tanpa data lembaga jarak tak
  // terhitung → tampilkan semua apa adanya (urutan waktu deteksi bawaan).
  const near = filterNearSorted(all);
  const rows = hasDistance ? near : all;

  const doc = new jsPDF({ orientation: "landscape", compress: true });

  doc.setFont("helvetica", "bold");
  const loadedArea = area.districtName ?? area.provinceName ?? null;

  doc.setFontSize(15);
  doc.setTextColor(...RED);
  doc.text("Laporan Titik Api (Hotspot)", MARGIN, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...SLATE_600);
  doc.text(
    [
      // Cakupan data LAHAN yang dimuat — bukan cakupan titik apinya, yang
      // selalu se-Riau (#294). Field kosong dihilangkan, bukan dicetak "—".
      loadedArea ? `Data lahan: ${loadedArea}` : null,
      `Rentang: ${windowLabel(dayRange)}`,
      `Dibuat: ${formatWib(now.toISOString())}`,
    ]
      .filter(Boolean)
      .join("  ·  "),
    MARGIN,
    25
  );
  doc.text(
    `Total ${formatNumber(total)} titik se-Riau  —  Keyakinan ${HOTSPOT_CONF_LABELS.high}: ${formatNumber(counts.high)}  ·  ${HOTSPOT_CONF_LABELS.nominal}: ${formatNumber(counts.nominal)}  ·  ${HOTSPOT_CONF_LABELS.low}: ${formatNumber(counts.low)}`,
    MARGIN,
    31
  );
  doc.text(
    hasDistance
      ? `Berjarak < ${NEAR_KM_THRESHOLD} km dari Lembaga Petani: ${formatNumber(near.length)} titik — tabel hanya memuat titik tsb, diurutkan dari yang terdekat.`
      : "Jarak ke Lembaga Petani tidak dapat dihitung — data peta yang dimuat tidak memiliki titik Lembaga Petani; tabel memuat semua titik.",
    MARGIN,
    37
  );

  if (rows.length === 0) {
    doc.setFontSize(10);
    doc.text(`Tidak ada titik api berjarak < ${NEAR_KM_THRESHOLD} km dari Lembaga Petani.`, MARGIN, 47);
    doc.setFontSize(8);
    doc.text(PDF_DISCLAIMER, MARGIN, 55);
    doc.save(`${fileBase(dayRange, now)}.pdf`);
    return;
  }

  autoTable(doc, {
    startY: 43,
    margin: { left: MARGIN, right: MARGIN },
    head: [
      ["No", "Waktu Deteksi (WIB)", "Satelit", "Keyakinan", "FRP (MW)", "Lintang", "Bujur", "Lembaga Terdekat", "Jarak (km) & Arah dari Kantor Lembaga"],
    ],
    body: rows.map((r, i) => {
      const cells = hotspotRowCells(r);
      return [
        formatNumber(i + 1),
        cells.time,
        cells.satellite,
        confidenceLabel(r.f.properties?.confidence),
        cells.frp,
        r.lat.toFixed(5),
        r.lon.toFixed(5),
        cells.nearestName,
        cells.distanceDir,
      ];
    }),
    styles: { fontSize: 8, textColor: SLATE_800, cellPadding: 1.6 },
    headStyles: { fillColor: RED, textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  const endY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 40;
  doc.setFontSize(8);
  doc.setTextColor(...SLATE_600);
  // Keterangan arah hanya relevan bila tabelnya benar-benar memuat kolom itu
  // dengan isi — yakni saat jarak berhasil dihitung (#293).
  const footNoteY = Math.min(endY + 8, PAGE_H - 12);
  doc.text(PDF_DISCLAIMER, MARGIN, footNoteY);
  if (nearestRows) doc.text(PDF_BEARING_NOTE, MARGIN, Math.min(footNoteY + 4, PAGE_H - 6));

  doc.save(`${fileBase(dayRange, now)}.pdf`);
}
