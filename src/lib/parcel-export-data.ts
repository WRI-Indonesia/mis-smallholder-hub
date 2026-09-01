import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import {
  summarizeDocuments,
  summarizeHolderNames,
  sumStatedArea,
  summarizeStdb,
  parcelMapperShort,
  summarizePrograms,
  type DocSummaryInput,
  type StdbSummaryInput,
  type ExternalIdSummaryInput,
  type ProgramSummaryInput,
} from "@/lib/land-parcel-satellite-format";

/**
 * Unduh data spasial lahan (#313) — bagian MURNI (tanpa prisma/DOM) agar bisa
 * diunit-test: builder `where`, perakit FeatureCollection beratribut lengkap,
 * pemetaan atribut DBF (≤10 karakter), pemecah MultiPolygon, dan nama file.
 * Konversi format + unduhan browser ada di `parcel-spatial-download.ts`;
 * kuerinya di `src/server/actions/land-parcel-export.ts`.
 */

export type ParcelExportFormat = "shp" | "geojson" | "kml";

export interface ParcelExportFilters {
  provinceId?: string | null;
  districtId?: string | null;
  farmerGroupId?: string | null;
}

/**
 * Scope FarmerGroup untuk kueri ekspor — pola anti scope-leak BUG-007 (#127):
 * filter akses masuk `AND` (bukan spread) supaya `{ districtId/id: { in } }`
 * miliknya tak bisa tertimpa literal `districtId`/`id` dari filter user.
 * `accessFilter` = hasil `farmerGroupAccessFilter(access)` (dioper sebagai
 * argumen agar modul ini bebas import next-auth).
 */
export function parcelExportGroupWhere(
  filters: ParcelExportFilters,
  accessFilter: Record<string, unknown>
) {
  const { provinceId, districtId, farmerGroupId } = filters;
  return {
    isActive: true,
    ...(districtId ? { districtId } : {}),
    ...(farmerGroupId ? { id: farmerGroupId } : {}),
    ...(provinceId ? { district: { provinceId } } : {}),
    AND: accessFilter,
  };
}

/** Satu baris lahan mentah (sudah ter-scope) dari kueri ekspor. */
export interface ParcelExportRow {
  parcelId: string;
  blok: string | null;
  geometry: unknown;
  area: number | null;
  landStatus: string | null;
  cropType: string | null;
  species: string | null;
  isPsr: boolean;
  plantingYear: number | null;
  subGroupLv2: string | null;
  revision: number;
  farmer: {
    farmerId: string;
    name: string;
    nik: string | null;
    farmerGroup: {
      code: string | null;
      name: string;
      district: { name: string } | null;
    };
  } | null;
  identity: {
    documents: DocSummaryInput[];
    stdbLinks: { stdb: StdbSummaryInput }[];
    externalIds: ExternalIdSummaryInput[];
    programs: ProgramSummaryInput[];
  } | null;
}

/** Atribut lengkap satu lahan — nama panjang (GeoJSON/KML tanpa batas DBF). */
export interface ParcelExportProperties {
  idLahan: string;
  /**
   * Kode lahan dari pemeta luar (`parcel_code` di berkas sumber vendor),
   * MENTAH tanpa label pemeta — dipakai GIS specialist sebagai kunci join ke
   * dataset vendor. Kode dan penerbitnya sengaja dipisah dua kolom
   * (`parcelCode` + `pemeta`), bukan satu kolom "ID0001 (Meridia)" seperti
   * `summarizeExternalIds` yang dipakai layar/laporan: nilai gabungan tak bisa
   * dijadikan kunci join. Beberapa kode → gabung "; ", sejajar dengan `pemeta`.
   */
  parcelCode: string | null;
  /** Penerbit tiap kode pada `parcelCode`, urutan sejajar. */
  pemeta: string | null;
  idPetani: string | null;
  namaPetani: string | null;
  nik: string | null;
  kodeLembaga: string | null;
  lembaga: string | null;
  kelompokTani: string | null;
  distrik: string | null;
  blok: string | null;
  luasHa: number | null;
  statusLahan: string | null;
  komoditas: string | null;
  species: string | null;
  psr: "Ya" | "Tidak";
  tahunTanam: number | null;
  revisi: number;
  /** Gabungan distinct pola Laporan Lahan #296/#305 — bukan pilih-satu. */
  stdb: string | null;
  surat: string | null;
  namaDiSurat: string | null;
  luasSurat: number | null;
  program: string | null;
  [key: string]: unknown;
}

function isPolygonGeometry(g: unknown): g is Polygon | MultiPolygon {
  if (!g || typeof g !== "object") return false;
  const { type, coordinates } = g as { type?: unknown; coordinates?: unknown };
  return (type === "Polygon" || type === "MultiPolygon") && Array.isArray(coordinates);
}

/**
 * Kode pemeta luar dipecah DUA nilai sejajar — `parcelCode` (kode mentah, kunci
 * join) dan `pemeta` (penerbitnya). Dedup berbasis kode agar kedua deret tak
 * pernah berbeda panjang. Bandingkan `summarizeExternalIds` yang sengaja
 * menggabung jadi "ID0001 (Meridia)" untuk dibaca manusia di layar/laporan.
 */
function splitExternalIds(items: ExternalIdSummaryInput[]): {
  parcelCode: string | null;
  pemeta: string | null;
} {
  const seen = new Map<string, string>();
  for (const e of items) {
    const code = e.code.trim();
    if (code && !seen.has(code)) seen.set(code, parcelMapperShort(e.source));
  }
  if (seen.size === 0) return { parcelCode: null, pemeta: null };
  return {
    parcelCode: [...seen.keys()].join("; "),
    pemeta: [...seen.values()].join("; "),
  };
}

/** Trim; string kosong/whitespace → null. */
function clean(s: string | null | undefined): string | null {
  const t = s?.trim();
  return t ? t : null;
}

/**
 * Rakit FeatureCollection WGS84 dari baris kueri. Lahan tanpa geometri
 * Polygon/MultiPolygon valid dilewati tanpa menggagalkan batch (pola
 * buildMapData); jumlah yang terlewati dilaporkan agar UI bisa jujur.
 */
export function buildParcelExportFeatures(rows: ParcelExportRow[]): {
  fc: FeatureCollection<Polygon | MultiPolygon, ParcelExportProperties>;
  count: number;
  skipped: number;
} {
  const features: Feature<Polygon | MultiPolygon, ParcelExportProperties>[] = [];
  let skipped = 0;
  for (const row of rows) {
    if (!isPolygonGeometry(row.geometry)) {
      skipped++;
      continue;
    }
    const docs = row.identity?.documents ?? [];
    features.push({
      type: "Feature",
      geometry: row.geometry,
      properties: {
        idLahan: row.parcelId,
        ...splitExternalIds(row.identity?.externalIds ?? []),
        idPetani: row.farmer?.farmerId ?? null,
        namaPetani: row.farmer?.name ?? null,
        nik: clean(row.farmer?.nik),
        kodeLembaga: clean(row.farmer?.farmerGroup.code),
        lembaga: row.farmer?.farmerGroup.name ?? null,
        kelompokTani: clean(row.subGroupLv2),
        distrik: row.farmer?.farmerGroup.district?.name ?? null,
        blok: clean(row.blok),
        luasHa: row.area,
        statusLahan: clean(row.landStatus),
        komoditas: clean(row.cropType),
        species: clean(row.species),
        psr: row.isPsr ? "Ya" : "Tidak",
        tahunTanam: row.plantingYear,
        revisi: row.revision,
        stdb: summarizeStdb((row.identity?.stdbLinks ?? []).map((l) => l.stdb)),
        surat: summarizeDocuments(docs),
        namaDiSurat: summarizeHolderNames(docs),
        luasSurat: sumStatedArea(docs),
        program: summarizePrograms(row.identity?.programs ?? []),
      },
    });
  }
  return {
    fc: { type: "FeatureCollection", features },
    count: features.length,
    skipped,
  };
}

/**
 * Transliterasi ke ASCII untuk nilai DBF: penulis `dbf` (shp-write) menulis
 * 1 byte per code-unit sehingga karakter non-ASCII korup apa pun isi `.cpg`.
 * Diakritik dilepas via NFKD (é→e, ñ→n); sisanya di luar ASCII menjadi "?".
 * GeoJSON/KML tidak lewat sini — teks penuh tetap tersedia di sana.
 */
export function toAsciiDbf(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7e]/g, "?");
}

/**
 * Atribut panjang → kolom DBF-safe (maks 10 karakter, skema di #313).
 * String null → "" dan angka null dibiarkan null — pola ekspor SHP titik api.
 */
export function toDbfProperties(p: ParcelExportProperties): Record<string, unknown> {
  const str = (v: string | null) => (v == null ? "" : toAsciiDbf(v));
  return {
    id_lahan: str(p.idLahan),
    // `parcel_code` (12 char) melebihi batas nama kolom DBF 10 karakter;
    // dipendekkan `parcel_cod` — pemenggalan yang sama dengan yang dilakukan
    // QGIS/ArcGIS sendiri saat menulis shapefile. Nama panjangnya utuh di
    // GeoJSON/KML (`parcelCode`). Penerbitnya di kolom terpisah `pemeta`.
    parcel_cod: str(p.parcelCode),
    pemeta: str(p.pemeta),
    id_petani: str(p.idPetani),
    nm_petani: str(p.namaPetani),
    nik: str(p.nik),
    kd_lembaga: str(p.kodeLembaga),
    lembaga: str(p.lembaga),
    kel_tani: str(p.kelompokTani),
    distrik: str(p.distrik),
    blok: str(p.blok),
    luas_ha: p.luasHa,
    sts_lahan: str(p.statusLahan),
    komoditas: str(p.komoditas),
    species: str(p.species),
    psr: p.psr,
    thn_tanam: p.tahunTanam,
    revisi: p.revisi,
    stdb: str(p.stdb),
    surat: str(p.surat),
    nm_surat: str(p.namaDiSurat),
    luas_surat: p.luasSurat,
    program: str(p.program),
  };
}

/**
 * Pecah tiap MultiPolygon menjadi beberapa Feature Polygon (atribut diduplikasi,
 * ring dalam/lubang tetap ikut) — khusus jalur SHP karena `@mapbox/shp-write`
 * rewel soal MultiPolygon (risiko di #313). GeoJSON/KML memakai geometri asli.
 */
export function explodeMultiPolygons(
  fc: FeatureCollection<Polygon | MultiPolygon, ParcelExportProperties>
): FeatureCollection<Polygon, ParcelExportProperties> {
  const features: Feature<Polygon, ParcelExportProperties>[] = [];
  for (const f of fc.features) {
    if (f.geometry.type === "Polygon") {
      features.push(f as Feature<Polygon, ParcelExportProperties>);
    } else {
      for (const coordinates of f.geometry.coordinates) {
        features.push({
          type: "Feature",
          geometry: { type: "Polygon", coordinates },
          properties: f.properties,
        });
      }
    }
  }
  return { type: "FeatureCollection", features };
}

/** Timestamp WIB ringkas untuk nama file, mis. "20260901-1417" (pola #293). */
export function wibFileStamp(now: Date): string {
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

/**
 * Basis nama file `lahan_<kd-lembaga|distrik>_<YYYYMMDD-HHmm>`; label
 * di-slug-kan (huruf kecil, spasi → "-", karakter aneh dibuang).
 */
export function parcelExportFileBase(label: string | null, now: Date): string {
  const slug = (label ?? "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `lahan_${slug || "terfilter"}_${wibFileStamp(now)}`;
}
