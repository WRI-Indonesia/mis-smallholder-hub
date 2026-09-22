/**
 * Monev BMP (#344) — helper MURNI (tanpa Prisma/DOM) yang dipakai klien
 * (pratinjau import, badge kategori) maupun server (validasi, agregasi),
 * dan diuji langsung.
 *
 * Rubrik dari sheet `Kategori` rekap Rokan Hulu (2026-09-18): skor rerata
 * skala 0–3 dipetakan ke 4 tingkat. Rekap menulis `> 2,50` Teladan dan
 * `1,50–2,49` Praktisi; skor tepat 2,50 (KPUD Intan Makmur) diberi label
 * Praktisi oleh tim lapangan, jadi `>` dibaca KETAT: pada presisi 2 desimal
 * Teladan = ≥ 2,51. Batas bawah tingkat lain inklusif (1,50 dan 1,00).
 * Kategori tidak disimpan di DB; selalu dihitung dari skor lewat konstanta ini.
 */

export const BMP_ASSESSMENT_CATEGORY_KEYS = ["TELADAN", "PRAKTISI", "PERINTIS", "BELUM"] as const;
export type BmpAssessmentCategoryKey = (typeof BMP_ASSESSMENT_CATEGORY_KEYS)[number];

export interface BmpAssessmentCategory {
  key: BmpAssessmentCategoryKey;
  label: string;
  /** Batas bawah inklusif; `BELUM` = 0. */
  min: number;
  /** Teks rentang untuk legenda/tabel rubrik. */
  range: string;
  /**
   * Arti tingkat dalam praktik — tooltip ubin dashboard (#360). Rekap & form
   * survei hanya memuat rentang skor; narasi diturunkan dari pola rubrik
   * indikator (0 belum · 1 tahu/rencana · 2 ada belum penuh · 3 diterapkan).
   */
  description: string;
  /**
   * Warna seri (dashboard, badge). Skala ordinal: abu untuk "belum" (tanpa
   * praktik), lalu satu hue hijau makin gelap = adopsi makin tinggi. Divalidasi
   * (skill dataviz, 2026-09-18): CVD ΔE ≥ 8, normal ≥ 15; kontras hijau muda
   * < 3:1 ditopang label langsung + tabel per Lembaga.
   */
  color: string;
}

/** Urutan TERTINGGI → terendah, sama dengan tabel rubrik rekap. */
export const BMP_ASSESSMENT_CATEGORIES: readonly BmpAssessmentCategory[] = [
  {
    key: "TELADAN",
    label: "Teladan",
    min: 2.51,
    range: "> 2,50",
    color: "#166534",
    description: "Hampir semua praktik BMP dijalankan sesuai standar secara konsisten; layak jadi contoh bagi petani lain (champion).",
  },
  {
    key: "PRAKTISI",
    label: "Praktisi",
    min: 1.5,
    range: "1,50 – 2,50",
    color: "#16a34a",
    description: "Sebagian besar praktik BMP sudah dijalankan, meski belum semuanya sesuai standar atau konsisten.",
  },
  {
    key: "PERINTIS",
    label: "Perintis",
    min: 1.0,
    range: "1,00 – 1,49",
    color: "#84cc16",
    description: "Mulai menerapkan sebagian praktik BMP; kebanyakan masih tahap tahu atau rencana, belum konsisten.",
  },
  {
    key: "BELUM",
    label: "Belum Implementasi",
    min: 0,
    range: "< 1,00",
    color: "#9ca3af",
    description: "Praktik BMP belum dijalankan — petani belum tahu atau baru tahu, belum ada yang diterapkan.",
  },
] as const;

export const BMP_SCORE_MIN = 0;
export const BMP_SCORE_MAX = 3;
/** Tahun survei paling awal yang masuk akal (program mulai 2024). */
export const BMP_SURVEY_YEAR_MIN = 2020;

const CATEGORY_BY_KEY = new Map(BMP_ASSESSMENT_CATEGORIES.map((c) => [c.key, c]));

export function bmpAssessmentCategoryByKey(key: BmpAssessmentCategoryKey): BmpAssessmentCategory {
  return CATEGORY_BY_KEY.get(key)!;
}

/** Kategori dari skor — batas bawah inklusif. Skor di luar 0–3 tetap dipetakan (tak melempar). */
export function bmpAssessmentCategory(score: number): BmpAssessmentCategory {
  // Skor disimpan 2 desimal; bandingkan pada presisi yang sama supaya 2,499999
  // hasil float tidak jatuh ke tingkat di bawahnya.
  const s = roundScore(score);
  for (const c of BMP_ASSESSMENT_CATEGORIES) {
    if (s >= c.min) return c;
  }
  return BMP_ASSESSMENT_CATEGORIES[BMP_ASSESSMENT_CATEGORIES.length - 1];
}

/** Skor indikator di luar rubrik 0–3 (mis. 4 dari form survei yang diterima + ditandai). */
export function isOutOfRubric(score: number | null | undefined): boolean {
  return score != null && (score < BMP_SCORE_MIN || score > BMP_SCORE_MAX);
}

/**
 * Tanggal survei disimpan UTC tengah malam → tampilkan komponen UTC-nya
 * ("07 Jun 2026") supaya tidak mundur sehari di zona WIB/WITA/WIT. Satu
 * pemformat untuk daftar, detail, tab Petani, dialog import, dan form.
 */
export function formatUtcDate(d: Date | string | null | undefined, empty = "—"): string {
  if (!d) return empty;
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return empty;
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

/** Kalender memberi Date lokal; simpan sebagai UTC tengah malam agar tak bergeser hari (pola import). */
export const toUtcDay = (d: Date) => new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
/** Kebalikannya untuk tampilan kalender: UTC tengah malam → Date lokal tanggal yang sama. */
export const fromUtcDay = (d: Date) => new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

/** Pembulatan skor ke 2 desimal (half-up), aman dari artefak float. */
export function roundScore(score: number): number {
  return Math.round((score + Number.EPSILON) * 100) / 100;
}

/** Skor tampilan id-ID, 2 desimal (mis. "1,83"). */
export const formatScore = (n: number) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

/**
 * Nama pendek kegiatan untuk label sumbu radar & judul kolom sempit:
 * "Knowledge (Petani dan Pekerja)" → "Knowledge", "Pengendalian Hama Penyakit
 * Terpadu (PHPT)" → "PHPT". Satu sumber untuk SVG layar dan PDF (#343).
 */
export const bmpActivityShortName = (name: string) =>
  name.replace(/\s*\(.*\)$/, "").replace("Pengendalian ", "").replace("Hama Penyakit Terpadu", "PHPT");

// ── Tanggal survei ────────────────────────────────────────────────────────

const MONTHS_ID: Record<string, number> = {
  jan: 0, januari: 0, january: 0,
  feb: 1, februari: 1, february: 1, pebruari: 1,
  mar: 2, maret: 2, march: 2,
  apr: 3, april: 3,
  mei: 4, may: 4,
  jun: 5, juni: 5, june: 5,
  jul: 6, juli: 6, july: 6,
  agu: 7, agt: 7, ags: 7, agustus: 7, aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  okt: 9, oktober: 9, oct: 9, october: 9,
  nov: 10, november: 10, nop: 10, nopember: 10,
  des: 11, desember: 11, dec: 11, december: 11,
};

/**
 * Parser tanggal toleran untuk kolom "Tgl Survey" rekap. Format yang ada di
 * berkas sumber: sel Date Excel, `26 Juni 26`, `25Juni 26` (tanpa spasi),
 * `7 Juli 2026`, `20 Agustus 2026`, `2026-08-09`; ditambah `dd/mm/yyyy` dan
 * `dd-mm-yyyy` yang lazim di berkas lain. Tahun 2 digit → 20xx.
 *
 * Mengembalikan tanggal UTC tengah malam (konsisten dengan `trainingDate`),
 * atau `null` bila tak terbaca — pemanggil yang memutuskan (kosongkan +
 * peringatan), bukan parser yang menebak.
 */
export function parseSurveyDate(value: unknown): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    return isNaN(value.getTime())
      ? null
      : new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }
  if (typeof value === "number") {
    // Serial Excel (hari sejak 1899-12-30) — exceljs biasanya sudah memberi Date,
    // tapi CSV/format sel "General" bisa lolos sebagai angka.
    if (value > 20000 && value < 80000) {
      return new Date(Date.UTC(1899, 11, 30) + Math.round(value) * 86_400_000);
    }
    return null;
  }
  const s = String(value).trim().toLowerCase();
  if (!s) return null;

  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[t ].*)?$/);
  if (m) return utcDate(Number(m[1]), Number(m[2]) - 1, Number(m[3]));

  m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (m) return utcDate(fullYear(m[3]), Number(m[2]) - 1, Number(m[1]));

  // "26 Juni 26", "25Juni 26", "7 Juli 2026", "20-Agustus-2026"
  m = s.match(/^(\d{1,2})\s*[-/ ]?\s*([a-z]+)\.?\s*[-/ ]?\s*(\d{2,4})$/);
  if (m) {
    const month = MONTHS_ID[m[2]];
    if (month == null) return null;
    return utcDate(fullYear(m[3]), month, Number(m[1]));
  }
  return null;
}

function fullYear(raw: string): number {
  const n = Number(raw);
  return raw.length <= 2 ? 2000 + n : n;
}

/** Date UTC yang menolak tanggal tak valid (31 Februari → null). */
function utcDate(y: number, m: number, d: number): Date | null {
  if (m < 0 || m > 11 || d < 1 || d > 31) return null;
  const date = new Date(Date.UTC(y, m, d));
  return date.getUTCMonth() === m && date.getUTCDate() === d ? date : null;
}

// ── Import Excel format rekap ─────────────────────────────────────────────

/**
 * Struktur rekap (`rekap-monev-bmp-rokan-hulu.xlsx`): header DUA baris —
 * baris 1 memuat tahun pada sel ter-merge (`2025 | 2026 | 2027 | 2028`), baris
 * 2 sub-kolom `Tgl Survey · Skor · Kriteria` di bawah tiap tahun, plus kolom
 * identitas `No · Nama Petani · Id Petani · Lokasi Kebun · Blok · Luas Lahan`.
 * Sel merge hanya terisi di sel kiri-atas (exceljs), jadi tahun "dirambatkan"
 * ke kanan sampai ketemu tahun berikutnya.
 */
export interface BmpImportRawRow {
  rowNumber: number;
  values: unknown[];
}

export interface BmpImportParsedRow {
  rowNumber: number;
  farmerCode: string;
  farmerName: string | null;
  /** ID lahan dari kolom "Lokasi Kebun" — null bila kosong atau = ID petani. */
  parcelId: string | null;
  surveyYear: number;
  surveyDate: Date | null;
  /** Nilai mentah tanggal yang gagal diparse, untuk peringatan. */
  surveyDateRaw: string | null;
  score: number;
}

export interface BmpImportParseResult {
  rows: BmpImportParsedRow[];
  /** Tahun yang ditemukan di header, urut naik. */
  years: number[];
  /** Nomor baris fisik header tahun; 0 bila tak ditemukan. */
  headerRowNumber: number;
  /** Baris yang dilewati beserta alasannya (tanpa ID petani, skor tak valid, ...). */
  skipped: { rowNumber: number; reason: string }[];
}

const FARMER_CODE_HEADERS = ["id petani", "idpetani", "farmer_id", "farmerid", "kode petani", "id_petani"];
const FARMER_NAME_HEADERS = ["nama petani", "nama", "farmer_name", "petani"];
const PARCEL_HEADERS = ["lokasi kebun", "id lahan", "idlahan", "parcel_id", "parcelid", "kode lahan", "id_lahan"];
const DATE_HEADERS = ["tgl survey", "tgl survei", "tanggal survey", "tanggal survei", "tanggal", "tgl", "survey_date"];
const SCORE_HEADERS = ["skor", "score", "nilai", "skor akhir"];
const CRITERIA_HEADERS = ["kriteria", "kategori", "category"];
const SUB_HEADERS = new Set([...DATE_HEADERS, ...SCORE_HEADERS, ...CRITERIA_HEADERS]);

const norm = (v: unknown) => (v == null ? "" : String(v).trim().toLowerCase().replace(/\s+/g, " "));

function isYearCell(v: unknown): boolean {
  if (typeof v === "number") return Number.isInteger(v) && v >= 2000 && v <= 2100;
  if (typeof v === "string") return /^\d{4}$/.test(v.trim()) && Number(v) >= 2000 && Number(v) <= 2100;
  return false;
}

/**
 * Parse baris mentah satu sheet → penilaian per (petani, tahun). Satu baris
 * Excel × N blok tahun berisi skor = N penilaian; blok tahun kosong dilewati.
 *
 * Aturan (keputusan owner 2026-09-18):
 * - baris tanpa `Id Petani` dilewati — otomatis membuang blok baseline 2024
 *   (skala 0–100, tanpa ID) di sheet KPUD Sawit Sejahtera;
 * - `Lokasi Kebun` kosong atau sama dengan Id Petani → tanpa lahan;
 * - kolom `Kriteria`, `Blok`, `Luas Lahan` diabaikan (turunan / atribut lahan);
 * - skor di luar 0–3 → baris-tahun dilewati dengan alasan (bukan diam-diam).
 */
export function parseBmpImportRows(raw: BmpImportRawRow[]): BmpImportParseResult {
  const empty: BmpImportParseResult = { rows: [], years: [], headerRowNumber: 0, skipped: [] };
  if (raw.length === 0) return empty;

  // Header tahun = baris pertama yang memuat ≥1 sel tahun 4 digit.
  const yearIdx = raw.slice(0, 10).findIndex((r) => r.values.some(isYearCell));
  if (yearIdx < 0) return empty;
  const yearRow = raw[yearIdx];
  // Baris sub-header = baris pertama (boleh baris tahun itu sendiri — template
  // satu-baris "2026 | Tgl Survey | Skor") yang memuat label "Skor".
  const subIdx = raw.findIndex((r, i) => i >= yearIdx && r.values.some((v) => SCORE_HEADERS.includes(norm(v))));
  if (subIdx < 0) return empty;
  const subRow = raw[subIdx];

  // Rambatkan tahun ke kanan (sel merge hanya terisi di kiri-atas). Label
  // sub-kolom (Tgl Survey/Skor/Kriteria) tidak memutus rambatan; label lain
  // (kolom identitas) memutusnya.
  const width = Math.max(yearRow.values.length, subRow.values.length);
  const yearAt: (number | null)[] = [];
  let current: number | null = null;
  for (let i = 0; i < width; i++) {
    const v = yearRow.values[i];
    const label = norm(v);
    if (isYearCell(v)) current = Number(typeof v === "string" ? v.trim() : v);
    else if (label !== "" && !SUB_HEADERS.has(label)) current = null;
    yearAt.push(current);
  }

  // Kolom identitas dari baris sub-header (atau baris tahun bila di-merge vertikal).
  const labelAt = (i: number) => norm(subRow.values[i]) || norm(yearRow.values[i]);
  const findCol = (aliases: string[]) => {
    for (let i = 0; i < width; i++) if (aliases.includes(labelAt(i))) return i;
    return -1;
  };
  const farmerCol = findCol(FARMER_CODE_HEADERS);
  if (farmerCol < 0) return { ...empty, headerRowNumber: yearRow.rowNumber };
  const nameCol = findCol(FARMER_NAME_HEADERS);
  const parcelCol = findCol(PARCEL_HEADERS);

  // Blok per tahun: kolom Skor + kolom Tgl Survey terdekat di kiri dalam tahun yang sama.
  const blocks: { year: number; scoreCol: number; dateCol: number }[] = [];
  for (let i = 0; i < width; i++) {
    const year = yearAt[i];
    if (year == null || !SCORE_HEADERS.includes(labelAt(i))) continue;
    let dateCol = -1;
    for (let j = i - 1; j >= 0 && yearAt[j] === year; j--) {
      if (DATE_HEADERS.includes(labelAt(j))) {
        dateCol = j;
        break;
      }
    }
    blocks.push({ year, scoreCol: i, dateCol });
  }
  const years = [...new Set(blocks.map((b) => b.year))].sort((a, b) => a - b);

  const rows: BmpImportParsedRow[] = [];
  const skipped: BmpImportParseResult["skipped"] = [];
  for (const r of raw.slice(subIdx + 1)) {
    const farmerCode = cleanId(r.values[farmerCol]);
    const farmerName = nameCol >= 0 ? cleanText(r.values[nameCol]) : null;
    const hasAnyScore = blocks.some((b) => !isBlank(r.values[b.scoreCol]));
    if (!farmerCode) {
      // Baris kosong sepenuhnya tidak perlu dilaporkan; baris ber-isi tanpa ID dilaporkan.
      if (farmerName || hasAnyScore) skipped.push({ rowNumber: r.rowNumber, reason: "Tanpa ID Petani" });
      continue;
    }
    const parcelRaw = parcelCol >= 0 ? cleanId(r.values[parcelCol]) : "";
    const parcelId = parcelRaw && parcelRaw !== farmerCode ? parcelRaw : null;

    let emitted = 0;
    for (const b of blocks) {
      const scoreRaw = r.values[b.scoreCol];
      if (isBlank(scoreRaw)) continue;
      const score = parseScore(scoreRaw);
      if (score == null) {
        skipped.push({ rowNumber: r.rowNumber, reason: `Skor ${b.year} tidak valid: "${String(scoreRaw).trim()}"` });
        continue;
      }
      if (score < BMP_SCORE_MIN || score > BMP_SCORE_MAX) {
        skipped.push({ rowNumber: r.rowNumber, reason: `Skor ${b.year} di luar 0–3: ${String(scoreRaw).trim()}` });
        continue;
      }
      const dateRaw = b.dateCol >= 0 ? r.values[b.dateCol] : null;
      const surveyDate = parseSurveyDate(dateRaw);
      rows.push({
        rowNumber: r.rowNumber,
        farmerCode,
        farmerName,
        parcelId,
        surveyYear: b.year,
        surveyDate,
        surveyDateRaw: surveyDate == null && !isBlank(dateRaw) ? String(dateRaw).trim() : null,
        score: roundScore(score),
      });
      emitted++;
    }
    if (emitted === 0 && !hasAnyScore) {
      skipped.push({ rowNumber: r.rowNumber, reason: "Tanpa skor di semua tahun" });
    }
  }

  return { rows, years, headerRowNumber: yearRow.rowNumber, skipped };
}

function isBlank(v: unknown): boolean {
  return v == null || String(v).trim() === "";
}

function cleanText(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim().replace(/\s+/g, " ");
  return s || null;
}

/** ID petani/lahan: trim, satukan spasi, buang titik/spasi di ujung (`RAS.0012.A.14.06.09.2001.`). */
export function cleanId(v: unknown): string {
  if (v == null) return "";
  return String(v).trim().replace(/\s+/g, " ").replace(/[.\s]+$/, "");
}

/** Skor: angka, atau teks ber-koma desimal ("1,83"). */
export function parseScore(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  const s = v.trim().replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  return Number(s);
}


// ── Resolusi pratinjau import (klien) ─────────────────────────────────────

export interface BmpImportRefLike {
  farmerCode: string;
  farmerDbId: string;
  farmerName: string;
  parcels: { parcelId: string; parcelUid: string }[];
  assessedYears: number[];
}

export type BmpImportRowStatus = "CREATE" | "UPDATE" | "UNKNOWN_FARMER";

export interface BmpImportResolvedRow extends BmpImportParsedRow {
  status: BmpImportRowStatus;
  /** Nama petani menurut DB (bukan berkas) bila dikenal. */
  dbFarmerName: string | null;
  /** parcelUid bila `parcelId` dikenal sebagai lahan petani itu. */
  parcelUid: string | null;
  /** Peringatan non-fatal — baris tetap disimpan. */
  warnings: string[];
  /** Tanggal yang akan DIKIRIM (dikosongkan bila masa depan / beda tahun). */
  surveyDateToSave: Date | null;
}

/**
 * Cocokkan hasil parse dengan referensi Lembaga (petani, lahan, tahun yang
 * sudah dinilai). Murni supaya bisa diuji; server tetap meresolusi ulang.
 *
 * Tanggal masa depan atau tak sesuai tahun survei (ITM `2026-11-07` di rekap
 * adalah salah ketik) TIDAK menggagalkan baris — skornya tetap masuk, tanggal
 * dikosongkan, dan peringatannya tampil di pratinjau (tidak diam-diam).
 */
export function resolveBmpImportRows(
  rows: BmpImportParsedRow[],
  refs: BmpImportRefLike[],
  now: Date = new Date(),
): BmpImportResolvedRow[] {
  const byCode = new Map(refs.map((r) => [cleanId(r.farmerCode), r]));
  return rows.map((row) => {
    const ref = byCode.get(cleanId(row.farmerCode));
    const warnings: string[] = [];
    let surveyDateToSave = row.surveyDate;
    if (row.surveyDateRaw) warnings.push(`Tanggal "${row.surveyDateRaw}" tidak terbaca — dikosongkan`);
    // Toleransi 24 jam: tanggal UTC tengah malam vs `now` lokal WIB (lihat
    // SURVEY_DATE_FUTURE_TOLERANCE_MS di skema) — "hari ini" tidak boleh dianggap masa depan.
    if (surveyDateToSave && surveyDateToSave.getTime() > now.getTime() + 24 * 3600 * 1000) {
      warnings.push("Tanggal survei di masa depan — dikosongkan, periksa berkas");
      surveyDateToSave = null;
    } else if (surveyDateToSave && surveyDateToSave.getUTCFullYear() !== row.surveyYear) {
      warnings.push(`Tanggal survei bukan tahun ${row.surveyYear} — dikosongkan`);
      surveyDateToSave = null;
    }
    if (!ref) {
      return { ...row, status: "UNKNOWN_FARMER", dbFarmerName: null, parcelUid: null, warnings, surveyDateToSave };
    }
    let parcelUid: string | null = null;
    if (row.parcelId) {
      const p = ref.parcels.find((x) => cleanId(x.parcelId) === cleanId(row.parcelId!));
      if (p) parcelUid = p.parcelUid;
      else warnings.push(`Lahan "${row.parcelId}" tidak dikenal untuk petani ini — disimpan tanpa lahan`);
    }
    const status: BmpImportRowStatus = ref.assessedYears.includes(row.surveyYear) ? "UPDATE" : "CREATE";
    return { ...row, status, dbFarmerName: ref.farmerName, parcelUid, warnings, surveyDateToSave };
  });
}
