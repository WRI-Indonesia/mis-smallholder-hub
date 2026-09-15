/**
 * Helper MURNI unggah patok (#329): Excel/CSV titik GPS atau shapefile Point.
 * Kedua sumber dinormalisasi ke bentuk record ber-header yang sama, lalu
 * divalidasi per baris. Tanpa Prisma/DOM agar teruji langsung.
 *
 * Aturan (paralel `bulkUpsertLandMarkers`): No Patok terisi & sudah ada di
 * lahan → koordinat/atribut patok itu diperbarui; No Patok baru/kosong →
 * patok baru (snap ≤ 5 m ke patok lahan lain). Guard ≤ 100 m dari batas
 * dijalankan server (butuh geometri).
 */
import { autoMatchColumns } from "@/lib/parcel-bulk-mapping";
import { cleanCell, cleanFreeTextCell, parseDateCell } from "@/lib/land-parcel-detail-import";
import {
  LAND_MARKER_CONDITIONS,
  LAND_MARKER_CONDITION_LABELS,
  LAND_MARKER_TYPES,
  LAND_MARKER_TYPE_LABELS,
  normalizeMarkerCode,
  type LandMarkerConditionCode,
  type LandMarkerTypeCode,
} from "@/lib/land-marker";

export const MARKER_UPLOAD_FIELDS = [
  { key: "parcelId", label: "ID Lahan", required: true },
  { key: "farmerCode", label: "ID Petani", required: false },
  { key: "code", label: "Kode Patok", required: false },
  { key: "sequenceNo", label: "No Patok", required: false },
  { key: "latitude", label: "Lintang", required: true },
  { key: "longitude", label: "Bujur", required: true },
  { key: "condition", label: "Kondisi", required: false },
  { key: "type", label: "Jenis", required: false },
  { key: "installedAt", label: "Tanggal Pemasangan", required: false },
  { key: "installedBy", label: "Dipasang oleh", required: false },
  { key: "notes", label: "Keterangan", required: false },
] as const;
export type MarkerUploadFieldKey = (typeof MARKER_UPLOAD_FIELDS)[number]["key"];

/** Alias header (lowercase, persis) — termasuk nama atribut DBF ≤ 10 karakter. */
export const MARKER_UPLOAD_AUTO_MATCH_RULES: Record<MarkerUploadFieldKey, string[]> = {
  parcelId: ["id lahan", "id_lahan", "idlahan", "parcel_id", "parcelid", "land_id", "kode lahan"],
  farmerCode: ["id petani", "id_petani", "idpetani", "farmer_id", "farmerid", "kode petani"],
  code: ["kode patok", "kode_patok", "kodepatok", "kode", "code", "marker_code", "id patok", "id_patok", "patok_code"],
  // Tanpa alias "no"/"nomor": kolom nomor BARIS spreadsheet ikut terpetakan dan
  // menimpa koordinat patok bernomor sama (temuan review 2026-09-14).
  sequenceNo: ["no patok", "no_patok", "nopatok", "nomor patok", "nomor_patok", "seq", "sequence", "patok", "no_seq"],
  latitude: ["lintang", "lat", "latitude", "y"],
  longitude: ["bujur", "lon", "lng", "long", "longitude", "x"],
  condition: ["kondisi", "condition", "cond", "status patok", "status"],
  type: ["jenis", "jenis patok", "type", "tipe", "bahan"],
  installedAt: ["tanggal pemasangan", "tgl pemasangan", "tanggal_pemasangan", "tgl_pasang", "dipasang", "installed", "installed_at", "tanggal"],
  installedBy: ["dipasang oleh", "dipasang_oleh", "installed_by", "oleh", "pemasang", "surveyor"],
  notes: ["keterangan", "ket", "catatan", "notes", "note", "remarks"],
};

export function autoMatchMarkerUploadColumns(headers: string[]): Partial<Record<MarkerUploadFieldKey, string>> {
  return autoMatchColumns(headers, MARKER_UPLOAD_FIELDS.map((f) => f.key), MARKER_UPLOAD_AUTO_MATCH_RULES) as Partial<
    Record<MarkerUploadFieldKey, string>
  >;
}

// ─── Parser sel ───

const CONDITION_ALIASES: Record<string, LandMarkerConditionCode> = {
  ada: "PRESENT", present: "PRESENT", ok: "PRESENT", baik: "PRESENT", terpasang: "PRESENT", utuh: "PRESENT",
  hilang: "MISSING", missing: "MISSING", "tidak ada": "MISSING", lost: "MISSING",
  rusak: "DAMAGED", damaged: "DAMAGED", patah: "DAMAGED", miring: "DAMAGED",
  "belum dipasang": "NOT_INSTALLED", "belum": "NOT_INSTALLED", "belum ada": "NOT_INSTALLED", not_installed: "NOT_INSTALLED", "not installed": "NOT_INSTALLED",
};
const TYPE_ALIASES: Record<string, LandMarkerTypeCode> = {
  beton: "CONCRETE", concrete: "CONCRETE", semen: "CONCRETE", cor: "CONCRETE",
  kayu: "WOOD", wood: "WOOD",
  pipa: "PIPE", pipe: "PIPE", besi: "PIPE", paralon: "PIPE",
  "tanda alam": "NATURAL", alam: "NATURAL", natural: "NATURAL", pohon: "NATURAL", batu: "NATURAL",
  lainnya: "OTHER", other: "OTHER", lain: "OTHER",
};

/** Kondisi: kode enum, label Indonesia, atau alias lapangan. Sel kosong → null (server pakai bawaan/tak mengubah). */
export function parseMarkerCondition(raw: unknown): { value: LandMarkerConditionCode | null; error: string | null } {
  // `cleanFreeTextCell`: "tidak ada"/"belum ada" adalah jawaban sah di sini, jangan dibuang.
  const text = cleanFreeTextCell(raw);
  if (!text) return { value: null, error: null };
  const key = text.toLowerCase();
  const upper = text.toUpperCase().replace(/\s+/g, "_");
  if ((LAND_MARKER_CONDITIONS as readonly string[]).includes(upper)) return { value: upper as LandMarkerConditionCode, error: null };
  const byLabel = LAND_MARKER_CONDITIONS.find((c) => LAND_MARKER_CONDITION_LABELS[c].toLowerCase() === key);
  if (byLabel) return { value: byLabel, error: null };
  if (CONDITION_ALIASES[key]) return { value: CONDITION_ALIASES[key], error: null };
  return { value: null, error: `Kondisi tidak dikenal: "${text}" (Ada / Hilang / Rusak / Belum dipasang)` };
}

export function parseMarkerType(raw: unknown): { value: LandMarkerTypeCode | null; error: string | null } {
  const text = cleanCell(raw);
  if (!text) return { value: null, error: null };
  const key = text.toLowerCase();
  const upper = text.toUpperCase().replace(/\s+/g, "_");
  if ((LAND_MARKER_TYPES as readonly string[]).includes(upper)) return { value: upper as LandMarkerTypeCode, error: null };
  const byLabel = LAND_MARKER_TYPES.find((t) => LAND_MARKER_TYPE_LABELS[t].toLowerCase() === key);
  if (byLabel) return { value: byLabel, error: null };
  if (TYPE_ALIASES[key]) return { value: TYPE_ALIASES[key], error: null };
  return { value: null, error: `Jenis tidak dikenal: "${text}" (Beton / Kayu / Pipa / Tanda alam / Lainnya)` };
}

/** Teks koordinat: trim saja — `cleanCell` membuang "0", padahal 0 adalah koordinat sah (CSV mengirim string). */
const coordText = (raw: unknown): string => (raw === null || raw === undefined ? "" : String(raw).trim().replace(/^-$/, ""));

/** Koordinat desimal; koma sebagai pemisah desimal diterima ("0,52" → 0.52). */
export function parseCoordCell(raw: unknown, label: string, min: number, max: number): { value: number | null; error: string | null } {
  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) return { value: null, error: `${label} tidak valid` };
    return raw < min || raw > max ? { value: null, error: `${label} di luar rentang: ${raw}` } : { value: raw, error: null };
  }
  const text = coordText(raw);
  if (!text) return { value: null, error: `${label} wajib diisi` };
  const n = Number(text.replace(",", "."));
  if (!Number.isFinite(n)) return { value: null, error: `${label} bukan angka: "${text}"` };
  if (n < min || n > max) return { value: null, error: `${label} di luar rentang: "${text}"` };
  return { value: n, error: null };
}

export function parseSequenceCell(raw: unknown): { value: number | null; error: string | null } {
  // `cleanCell` menganggap "0" token kosong, padahal 0 = nomor tak sah — dan CSV
  // mengirim SEMUA sel sebagai string, sehingga "0" teks sempat lolos sebagai
  // "tanpa nomor" (= patok baru) sementara 0 numerik ditolak (review 2026-09-15).
  // Sel yang bernilai angka (apa pun tipenya) dibaca mentah; sisanya lewat cleanCell.
  const trimmed = typeof raw === "number" ? String(raw) : typeof raw === "string" ? raw.trim() : "";
  const text = /^-?\d+(\.\d+)?$/.test(trimmed) ? trimmed : cleanCell(raw);
  if (!text) return { value: null, error: null };
  const n = Number(text);
  if (!Number.isInteger(n) || n <= 0) return { value: null, error: `No Patok harus bilangan bulat positif: "${text}"` };
  return { value: n, error: null };
}

/** Angka mentah tanpa cek rentang — untuk deteksi lat/long tertukar sebelum pesan "di luar rentang". */
function rawNumber(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  const text = coordText(raw);
  if (!text) return null;
  const n = Number(text.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

// ─── Shapefile Point → record ───

export interface MarkerFeatureInput {
  index: number;
  properties: Record<string, unknown>;
  geometry: { type?: string; coordinates?: unknown } | null;
}

/**
 * Ubah fitur shapefile Point menjadi record ber-header template (kolom sama
 * dengan Excel), koordinat dari geometri (WGS84) — atribut lon/lat hanya
 * fallback. Fitur non-Point/koordinat tak valid dicatat di `skipped`.
 */
export function markerFeaturesToRecords(features: MarkerFeatureInput[]): {
  records: Record<string, unknown>[];
  rowNumbers: number[];
  skipped: { index: number; reason: string }[];
} {
  const records: Record<string, unknown>[] = [];
  const rowNumbers: number[] = [];
  const skipped: { index: number; reason: string }[] = [];
  for (const f of features) {
    let lon: unknown, lat: unknown;
    if (f.geometry && f.geometry.type === "Point" && Array.isArray(f.geometry.coordinates)) {
      [lon, lat] = f.geometry.coordinates as unknown[];
    }
    const hasGeom = typeof lon === "number" && typeof lat === "number" && Number.isFinite(lon) && Number.isFinite(lat);
    if (!hasGeom && f.geometry && f.geometry.type && f.geometry.type !== "Point") {
      skipped.push({ index: f.index, reason: `Geometri ${f.geometry.type}, bukan Point` });
      continue;
    }
    // Kunci geometri DITARUH LEBIH DULU: auto-match memilih header pertama yang cocok,
    // jadi Lintang/Bujur dari geometri menang atas atribut DBF X/Y/LAT/LON yang bisa
    // berisi UTM atau nilai basi (temuan review 2026-09-14). Atribut DBF yang kebetulan
    // bernama Lintang/Bujur DIBUANG — bila ikut di-spread ia menimpa nilai geometri
    // (review 2026-09-15); geometri shapefile selalu menang.
    const props = Object.fromEntries(
      Object.entries(f.properties ?? {}).filter(([k]) => !hasGeom || !/^(lintang|bujur)$/i.test(k.trim())),
    );
    const rec: Record<string, unknown> = hasGeom ? { Lintang: lat, Bujur: lon, ...props } : props;
    records.push(rec);
    rowNumbers.push(f.index + 1);
  }
  return { records, rowNumbers, skipped };
}

// ─── Validasi baris ───

/** Lahan kandidat hasil pencocokan server (dalam scope). */
export interface MarkerUploadParcelRef {
  id: string;
  parcelId: string;
  farmerCode: string;
  farmerName: string;
  hasGeometry: boolean;
  activeMarkerCount: number;
  /** Nomor patok aktif yang sudah ada (untuk label "perbarui #n"). */
  sequenceNos: number[];
}

export interface MarkerUploadRow {
  rowNumber: number;
  parcelId: string;
  farmerCode: string | null;
  /** Kode patok fisik bila baris merujuk patok yang sudah ada. */
  code: string | null;
  sequenceNo: number | null;
  latitude: number;
  longitude: number;
  condition: LandMarkerConditionCode | null;
  type: LandMarkerTypeCode | null;
  installedAt: string | null;
  installedBy: string | null;
  notes: string | null;
}

export interface MarkerUploadValidatedRow {
  row: MarkerUploadRow | null;
  rowNumber: number;
  parcelId: string;
  /** LandParcel.id hasil pencocokan; null bila tak cocok/ambigu. */
  landParcelId: string | null;
  farmerName: string | null;
  /** "update" = No Patok sudah ada di lahan; "create" = patok baru. */
  action: "update" | "create" | null;
  errors: string[];
}

export interface MarkerUploadMatch {
  /** Kandidat lahan per ID Lahan (bisa >1 bila ID dipakai lebih dari satu petani dalam scope). */
  parcelsById: Map<string, MarkerUploadParcelRef[]>;
  /** ID Lahan yang jumlah GLOBAL-nya > 1 (termasuk di luar scope) — perlu ID Petani. */
  globalCounts: Map<string, number>;
}

function pick(rec: Record<string, unknown>, mapping: Partial<Record<MarkerUploadFieldKey, string>>, key: MarkerUploadFieldKey): unknown {
  const col = mapping[key];
  return col ? rec[col] : undefined;
}

/**
 * Validasi record (Excel/CSV/shapefile) memakai pemetaan kolom dan hasil
 * pencocokan lahan. Baris ber-error tidak dikirim; baris valid siap dikirim
 * ke `bulkUpsertLandMarkers` lewat `toUploadPayload`.
 */
export function validateMarkerUploadRows(
  records: Record<string, unknown>[],
  mapping: Partial<Record<MarkerUploadFieldKey, string>>,
  match: MarkerUploadMatch,
  rowNumbers?: number[],
): MarkerUploadValidatedRow[] {
  const seen = new Map<string, number>(); // "landParcelId#seq" → rowNumber (duplikat dalam berkas)
  return records.map((rec, i) => {
    const rowNumber = rowNumbers?.[i] ?? i + 2;
    const errors: string[] = [];
    const parcelId = cleanCell(pick(rec, mapping, "parcelId"));
    const farmerCode = cleanCell(pick(rec, mapping, "farmerCode")) || null;
    if (!parcelId) errors.push("ID Lahan kosong");

    let ref: MarkerUploadParcelRef | null = null;
    if (parcelId) {
      const candidates = match.parcelsById.get(parcelId) ?? [];
      const global = match.globalCounts.get(parcelId) ?? candidates.length;
      if (farmerCode) {
        ref = candidates.find((c) => c.farmerCode === farmerCode) ?? null;
        if (!ref) errors.push(candidates.length ? `ID Lahan ${parcelId} tidak terdaftar pada ID Petani ${farmerCode}` : "Lahan tidak ditemukan atau di luar akses Anda");
      } else if (global > 1) {
        errors.push("ID Lahan dipakai lebih dari satu petani — isi kolom ID Petani");
      } else if (candidates.length === 1) {
        ref = candidates[0];
      } else {
        errors.push("Lahan tidak ditemukan atau di luar akses Anda");
      }
      if (ref && !ref.hasGeometry) errors.push("Lahan belum punya poligon — jarak patok ke batas tidak bisa diperiksa");
    }

    const rawCode = cleanCell(pick(rec, mapping, "code"));
    const code = rawCode ? normalizeMarkerCode(rawCode) : null;
    if (rawCode && !code) errors.push(`Kode patok tidak valid: "${rawCode}" (bentuk HJP-PTK-000123)`);
    const seq = parseSequenceCell(pick(rec, mapping, "sequenceNo"));
    if (seq.error) errors.push(seq.error);
    const lat = parseCoordCell(pick(rec, mapping, "latitude"), "Lintang", -90, 90);
    const lon = parseCoordCell(pick(rec, mapping, "longitude"), "Bujur", -180, 180);
    // Riau: lintang −2..3, bujur 99..106 — nilai tertukar ketahuan sebelum kirim,
    // dan pesannya menggantikan "di luar rentang" (lintang 101 memang di luar 90).
    const rawLat = rawNumber(pick(rec, mapping, "latitude"));
    const rawLon = rawNumber(pick(rec, mapping, "longitude"));
    if (rawLat != null && rawLon != null && Math.abs(rawLat) > 12 && Math.abs(rawLon) <= 12) {
      errors.push("Lintang dan Bujur tampak tertukar");
    } else {
      if (lat.error) errors.push(lat.error);
      if (lon.error) errors.push(lon.error);
    }
    const condition = parseMarkerCondition(pick(rec, mapping, "condition"));
    if (condition.error) errors.push(condition.error);
    const type = parseMarkerType(pick(rec, mapping, "type"));
    if (type.error) errors.push(type.error);
    const installedAt = parseDateCell(pick(rec, mapping, "installedAt"), "Tanggal Pemasangan");
    if (installedAt.error) errors.push(installedAt.error);
    const installedBy = cleanFreeTextCell(pick(rec, mapping, "installedBy")) || null;
    if (installedBy && installedBy.length > 200) errors.push("Dipasang oleh melebihi 200 karakter");
    const notes = cleanFreeTextCell(pick(rec, mapping, "notes")) || null;
    if (notes && notes.length > 500) errors.push("Keterangan melebihi 500 karakter");

    if (ref && seq.value != null) {
      const key = `${ref.id}#${seq.value}`;
      const prev = seen.get(key);
      if (prev) errors.push(`No Patok ${seq.value} untuk lahan ini sudah ada di baris ${prev}`);
      else seen.set(key, rowNumber);
    }

    const action: MarkerUploadValidatedRow["action"] = !ref ? null : code ? "update" : seq.value != null && ref.sequenceNos.includes(seq.value) ? "update" : "create";
    const ok = errors.length === 0 && ref && lat.value != null && lon.value != null;
    return {
      rowNumber,
      parcelId,
      landParcelId: ref?.id ?? null,
      farmerName: ref?.farmerName ?? null,
      action,
      errors,
      row: ok
        ? {
            rowNumber,
            parcelId,
            farmerCode,
            code,
            sequenceNo: seq.value,
            latitude: lat.value!,
            longitude: lon.value!,
            condition: condition.value,
            type: type.value,
            installedAt: installedAt.value,
            installedBy,
            notes,
          }
        : null,
    };
  });
}

/** Bentuk payload `landMarkerUploadRowSchema` dari baris valid. */
export function toUploadPayload(rows: MarkerUploadValidatedRow[]) {
  return rows
    .filter((r) => r.row && r.landParcelId)
    .map((r) => ({
      landParcelId: r.landParcelId!,
      code: r.row!.code,
      sequenceNo: r.row!.sequenceNo,
      longitude: r.row!.longitude,
      latitude: r.row!.latitude,
      condition: r.row!.condition,
      type: r.row!.type,
      installedAt: r.row!.installedAt,
      installedBy: r.row!.installedBy,
      notes: r.row!.notes,
    }));
}

/** Kolom template unduhan (urutan = MARKER_UPLOAD_FIELDS). */
export const MARKER_UPLOAD_TEMPLATE_COLUMNS = MARKER_UPLOAD_FIELDS.map((f) => ({ header: f.label, key: f.key, width: f.key === "notes" ? 32 : 18 }));
export const MARKER_UPLOAD_TEMPLATE_EXAMPLE: Record<MarkerUploadFieldKey, string | number> = {
  parcelId: "ICS-XXXX-01.0001.A",
  farmerCode: "",
  code: "",
  sequenceNo: 1,
  latitude: 0.523456,
  longitude: 101.191234,
  condition: "Ada",
  type: "Beton",
  installedAt: "2026-09-01",
  installedBy: "Tim survei",
  notes: "di tepi jalan",
};
