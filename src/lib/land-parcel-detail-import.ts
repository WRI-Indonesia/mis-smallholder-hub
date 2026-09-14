/**
 * Import detail lahan dari Excel (`MIS_<KAB>_data-lahan.xlsx`, #296):
 * surat kepemilikan, STDB, dan UL Parcel Code (`parcel_code`) per
 * lahan. Modul ini MURNI (tanpa Prisma/DOM) agar bisa dipakai klien
 * (validasi pratinjau) maupun server, dan diuji langsung.
 *
 * Fakta data sumber yang membentuk aturan di sini (Decision Log 2026-08-27,
 * 7.177 baris, 3 kabupaten):
 * - jenis surat ditulis dalam 19 ejaan; sebagian nilai BUKAN jenis surat
 *   melainkan status penguasaan ("Lahan sudah dijual", "Surat lahan di bank");
 * - nomor surat tidak unik (nomor pendek berulang antar desa);
 * - STDB adalah dokumen per petani yang menutup beberapa persil; format
 *   dominan "1637/53/1401/6/2025" (…/bulan/tahun), tapi ada "3475",
 *   "Belum dapat", "n/a";
 * - 20 `ID Lahan` muncul dua kali dengan `ID Petani` berbeda, 64 nomor STDB
 *   dipakai petani berbeda — keduanya salah ketik sumber, wajib DILAPORKAN,
 *   bukan dipilih diam-diam.
 */
import { autoMatchColumns } from "@/lib/parcel-bulk-mapping";
import { LAND_BORDER_SIDES, LAND_BORDER_SIDE_LABELS, type LandStdbStageCode } from "@/lib/land-parcel-satellite-format";

/** Cermin enum Prisma `LandDocumentType` — literal agar aman di bundle klien. */
export const LAND_DOCUMENT_TYPES = [
  "SHM",
  "SKT",
  "SKGR",
  "SK",
  "SKST",
  "SKTC",
  "SKGK",
  "SPPT",
  "SKRPT",
  "SKKT",
  "SKTB",
  "HIBAH",
  "JUAL_BELI",
  "OTHER",
] as const;
export type LandDocumentTypeCode = (typeof LAND_DOCUMENT_TYPES)[number];

export const LAND_DOCUMENT_TYPE_LABELS: Record<LandDocumentTypeCode, string> = {
  SHM: "SHM (Sertifikat Hak Milik)",
  SKT: "SKT (Surat Keterangan Tanah)",
  SKGR: "SKGR (Surat Keterangan Ganti Rugi)",
  SK: "SK (Surat Keterangan)",
  SKST: "SKST (Surat Kesaksian Sempadan Tanah)",
  SKTC: "SKTC (Surat Keterangan Camat)",
  SKGK: "SKGK",
  SPPT: "SPPT (Surat Pernyataan Pemilik Tanah)",
  SKRPT: "SKRPT",
  SKKT: "SKKT",
  SKTB: "SKTB (Surat Keterangan Tidak Bersengketa)",
  HIBAH: "Surat Keterangan Hibah",
  JUAL_BELI: "Surat Jual Beli",
  OTHER: "Lainnya",
};


/**
 * Nilai sel yang berarti "tidak ada" pada data sumber.
 *
 * Sejak #306 daftar ini dipecah dua. `PENDING_TOKENS` sebelumnya ikut dianggap
 * sel kosong, sehingga **329 baris** yang secara eksplisit menyatakan "belum
 * ada STDB" (327 `n/a` di Rohul + 2 `Belum dapat` di Kampar) hilang tanpa jejak
 * saat import — pernyataan "sedang diurus" diperlakukan sama dengan sel yang
 * memang tak diisi. Untuk kolom STDB keduanya kini dibedakan; untuk kolom lain
 * (jenis/nomor surat, luas) tidak ada tahapan, jadi keduanya tetap = kosong.
 */
const PENDING_TOKENS = new Set(["n/a", "na", "belum dapat", "belum ada", "belum", "tidak ada", "dalam proses", "sedang diurus", "proses"]);
const BLANK_TOKENS = new Set(["", "-", "0", "null", "nil", "none"]);
const EMPTY_TOKENS = new Set([...BLANK_TOKENS, ...PENDING_TOKENS]);

export function cleanCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const s = String(value).trim().replace(/\s+/g, " ");
  return EMPTY_TOKENS.has(s.toLowerCase()) ? "" : s;
}

/**
 * Pembersih untuk sel TEKS BEBAS (sepadan, #326): hanya token benar-benar
 * kosong ("", "-", "null", …) yang dibuang. `cleanCell` juga membuang
 * "tidak ada"/"belum ada" karena itu placeholder kolom STDB — pada sepadan,
 * "Tidak ada" adalah jawaban yang sah ("tidak ada tetangga di sisi ini") dan
 * tidak boleh hilang diam-diam (review 2026-09-14).
 */
export function cleanFreeTextCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const s = String(value).trim().replace(/\s+/g, " ");
  return BLANK_TOKENS.has(s.toLowerCase()) ? "" : s;
}

/** `true` bila sel menyatakan "belum ada, sedang diurus" — bukan sel yang dibiarkan kosong. */
export function isPendingCell(value: unknown): boolean {
  if (value === null || value === undefined || value instanceof Date) return false;
  return PENDING_TOKENS.has(String(value).trim().replace(/\s+/g, " ").toLowerCase());
}

export interface NormalizedDocumentType {
  type: LandDocumentTypeCode | null;
  /** Teks asli (untuk audit / OTHER). */
  typeRaw: string | null;
  /** Diisi bila teks sumber sebenarnya status penguasaan, bukan jenis surat. */
  custodyNote: string | null;
}

/** Pola status penguasaan yang sering ditulis di kolom jenis surat. */
const CUSTODY_PATTERNS = [/dijual/i, /di\s*bank/i, /digadai/i, /jaminan/i, /hilang/i];

/**
 * Normalisasi 19+ ejaan jenis surat ke enum. Cocokkan pada AKRONIM di awal
 * teks ("SHM (Sertifikat Hak Milik)", "SHM (Surat Hak Milik)", "SKT Desa"),
 * lalu kata kunci untuk yang tanpa akronim ("Surat Keterangan Hibah").
 */
export function normalizeDocumentType(raw: unknown): NormalizedDocumentType {
  const text = cleanCell(raw);
  if (!text) return { type: null, typeRaw: null, custodyNote: null };

  if (CUSTODY_PATTERNS.some((re) => re.test(text))) {
    return { type: null, typeRaw: text, custodyNote: text };
  }

  const upper = text.toUpperCase();
  const acronym = upper.match(/^([A-Z]+)\b/)?.[1] ?? "";
  const byAcronym: Record<string, LandDocumentTypeCode> = {
    SHM: "SHM",
    SKT: "SKT",
    SKGR: "SKGR",
    SKST: "SKST",
    SKTC: "SKTC",
    SKGK: "SKGK",
    SPPT: "SPPT",
    SKRPT: "SKRPT",
    SKKT: "SKKT",
    SKTB: "SKTB",
    SK: "SK",
  };
  if (acronym in byAcronym) return { type: byAcronym[acronym], typeRaw: text, custodyNote: null };

  if (/HIBAH/.test(upper)) return { type: "HIBAH", typeRaw: text, custodyNote: null };
  if (/JUAL\s*BELI/.test(upper)) return { type: "JUAL_BELI", typeRaw: text, custodyNote: null };
  if (/SERTIFIKAT HAK MILIK|SURAT HAK MILIK/.test(upper)) return { type: "SHM", typeRaw: text, custodyNote: null };

  return { type: "OTHER", typeRaw: text, custodyNote: null };
}

export interface ParsedStdb {
  /** `null` saat tahapnya pra-terbit (sel bertuliskan "belum ada"/"n/a"). */
  number: string | null;
  /** Diturunkan dari segmen terakhir bila berpola ".../M/YYYY" atau ".../YYYY". */
  issuedYear: number | null;
  stage: LandStdbStageCode;
}

/**
 * Sel STDB → baris STDB. Tiga hasil (#306):
 * - bernomor → `TERBIT`;
 * - "belum ada"/"n/a"/"belum dapat" → `PERSIAPAN_DATA` tanpa nomor, **bukan
 *   dibuang** seperti sebelum #306;
 * - sel kosong/`-`/`0` → `null` (tidak ada baris sama sekali).
 */
export function parseStdbNumber(raw: unknown): ParsedStdb | null {
  const text = cleanCell(raw);
  if (!text) return isPendingCell(raw) ? { number: null, issuedYear: null, stage: "PERSIAPAN_DATA" } : null;
  const m = text.match(/\/(\d{4})$/);
  const year = m ? Number(m[1]) : NaN;
  return { number: text, issuedYear: year >= 1990 && year <= 2100 ? year : null, stage: "TERBIT" };
}

/** Luas tertera (ha): angka > 0; koma desimal diterima; 0/kosong → null. Satu parser dengan Luas NKT. */
export function parseStatedArea(raw: unknown): { value: number | null; error: string | null } {
  return parsePositiveNumber(raw, "Luas tertera");
}

// ─── NKT (#328) ───

export type NktStatusCode = "INCLUDED" | "AFFECTED" | "NOT_AFFECTED";

/**
 * Sel Status NKT → enum. Ejaan lapangan beragam; NEGASI dicek lebih dulu di
 * mana pun letaknya ("Lahan tidak terdampak", "not included", "unaffected")
 * supaya tidak terbalik jadi positif, lalu termasuk vs terdampak dibedakan.
 * Boolean Excel / 1 / 0 / ya / tidak diterima. Sel tak dikenal → error (bukan
 * diam-diam dianggap terdampak); kosong → null (bawaan berkas yang memutuskan).
 */
export function parseNktStatus(raw: unknown): { status: NktStatusCode | null; error: string | null } {
  if (typeof raw === "boolean") return { status: raw ? "AFFECTED" : "NOT_AFFECTED", error: null };
  const rawText = raw === null || raw === undefined ? "" : String(raw).trim().toLowerCase();
  if (rawText === "0") return { status: "NOT_AFFECTED", error: null };
  if (rawText === "1") return { status: "AFFECTED", error: null };
  const text = cleanFreeTextCell(raw).toLowerCase();
  if (!text) return { status: null, error: null };
  if (/\b(tidak|bukan|tdk|non|no|not)\b|\bun(affected|included)\b|bersih|aman|bebas/.test(text)) return { status: "NOT_AFFECTED", error: null };
  if (/termasuk|included|di dalam|dalam area|inside/.test(text)) return { status: "INCLUDED", error: null };
  if (/terdampak|affected|kena|berbatasan|sempadan|\bya\b|\byes\b|\by$|\btrue\b/.test(text)) return { status: "AFFECTED", error: null };
  return { status: null, error: `Status NKT tidak dikenal: "${cleanFreeTextCell(raw)}" (isi: termasuk / terdampak / tidak)` };
}

/** "1,4" / "NKT 1; NKT 4" / "1 4" / "NKT_1" → ["NKT_1","NKT_4"]; angka di luar 1–6 → error. */
export function parseNktCategories(raw: unknown): { categories: string[]; error: string | null } {
  const text = cleanFreeTextCell(raw);
  if (!text) return { categories: [], error: null };
  const nums = [...text.matchAll(/(\d)/g)].map((m) => Number(m[1]));
  if (nums.length === 0) return { categories: [], error: `Kategori NKT tidak dikenal: "${text}" (isi angka 1–6, mis. "1,4")` };
  const bad = nums.filter((n) => n < 1 || n > 6);
  if (bad.length) return { categories: [], error: `Kategori NKT di luar 1–6: "${text}"` };
  return { categories: [...new Set(nums)].sort().map((n) => `NKT_${n}`), error: null };
}

/**
 * Angka desimal positif: koma desimal Indonesia ("0,088") maupun titik ("0.088")
 * diterima; "1.234,5" = seribu (titik ribuan hanya dibuang bila ada koma).
 * 0/kosong → null; NEGATIF → error (salah ketik tanda, bukan sel kosong);
 * di atas `max` → error (batas skema server, supaya batch tidak ditolak utuh).
 */
export function parsePositiveNumber(raw: unknown, label: string, max = 10_000): { value: number | null; error: string | null } {
  const text = cleanCell(raw);
  if (!text) return { value: null, error: null };
  const n = Number(text.replace(/\./g, (m, i, str) => (str.indexOf(",") > -1 ? "" : m)).replace(",", "."));
  if (!Number.isFinite(n)) return { value: null, error: `${label} tidak valid: "${text}"` };
  if (n < 0) return { value: null, error: `${label} negatif: "${text}"` };
  if (n === 0) return { value: null, error: null };
  if (n > max) return { value: null, error: `${label} terlalu besar: "${text}" (maks ${max})` };
  return { value: n, error: null };
}

/** yyyy-mm-dd (termasuk Date Excel via cleanCell) atau dd/mm/yyyy · dd-mm-yyyy → ISO yyyy-mm-dd. */
export function parseDateCell(raw: unknown, label: string): { value: string | null; error: string | null } {
  const text = cleanCell(raw);
  if (!text) return { value: null, error: null };
  let m = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  let y: number, mo: number, d: number;
  if (m) [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  else if ((m = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/))) [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  else return { value: null, error: `${label} tidak valid: "${text}" (pakai yyyy-mm-dd atau dd/mm/yyyy)` };
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d || y < 1990 || y > 2100) return { value: null, error: `${label} tidak valid: "${text}"` };
  if (date.getTime() > Date.now() + 24 * 3600 * 1000) return { value: null, error: `${label} di masa depan: "${text}"` };
  return { value: date.toISOString().slice(0, 10), error: null };
}

/** Nilai bawaan per berkas untuk daftar "terdampak NKT" yang tak punya kolom status/kategori (Lampiran HJP). */
export interface NktFileDefaults {
  status: NktStatusCode | null;
  categories: string[];
  assessedAt: string | null;
  assessor: string | null;
}

export const PARCEL_DETAIL_TARGET_FIELDS = [
  { key: "parcelId", label: "ID Lahan", required: true, desc: "ID Lahan yang sudah terdaftar (contoh: APSS.0001.A.14.01.10.2012)" },
  { key: "farmerId", label: "ID Petani", required: true, desc: "ID Petani pemilik lahan — harus cocok dengan pasangan lahan di sistem" },
  { key: "documentType", label: "Jenis Surat Tanah", required: false, desc: "SHM / SKT / SKGR / … (ejaan bebas, dinormalkan)" },
  { key: "documentNumber", label: "Nomor Surat", required: false, desc: "Nomor sebagaimana tertulis di surat" },
  { key: "holderName", label: "Nama tertera di Surat", required: false, desc: "Nama pemegang di surat (boleh ≠ nama petani)" },
  { key: "statedArea", label: "Luas tertera di Surat (ha)", required: false, desc: "Angka desimal; terpisah dari luas poligon" },
  { key: "stdbNumber", label: "Nomor STDB", required: false, desc: "Per petani; satu nomor boleh menutup beberapa lahan" },
  { key: "externalCode", label: "UL Parcel Code (parcel_code)", required: false, desc: "Kode hasil pemetaan pihak ketiga" },
  { key: "subGroupLv2", label: "Nama Kelompok Tani", required: false, desc: "Mengisi Kelompok Tani lahan HANYA bila di sistem masih kosong (tidak menimpa)" },
  // Sepadan (#326): sel terisi MENIMPA nilai lama, sel kosong dibiarkan (tidak mengosongkan).
  { key: "borderNorth", label: "Sepadan Utara", required: false, desc: "Tetangga/batas di sisi utara — teks bebas; sel terisi menimpa, sel kosong dibiarkan" },
  { key: "borderEast", label: "Sepadan Timur", required: false, desc: "Tetangga/batas di sisi timur — teks bebas" },
  { key: "borderSouth", label: "Sepadan Selatan", required: false, desc: "Tetangga/batas di sisi selatan — teks bebas" },
  { key: "borderWest", label: "Sepadan Barat", required: false, desc: "Tetangga/batas di sisi barat — teks bebas" },
  // Blok kebun: isi HANYA bila di sistem masih kosong (aturan sama dengan Kelompok Tani) —
  // Lembaga plasma memakai Blok, Lembaga swadaya memakai Kelompok Tani (#328).
  { key: "blok", label: "Blok", required: false, desc: "Mengisi Blok lahan HANYA bila di sistem masih kosong (tidak menimpa)" },
  // NKT (#328): status asesmen per lahan. Sel terisi menimpa (asesmen terbaru menang);
  // berkas daftar "terdampak" tanpa kolom status memakai nilai bawaan per berkas.
  { key: "nktStatus", label: "Status NKT", required: false, desc: "termasuk / terdampak / tidak (ejaan bebas); kosong → nilai bawaan berkas" },
  { key: "nktCategories", label: "Kategori NKT", required: false, desc: "1,4 / NKT 1; NKT 4 — boleh lebih dari satu" },
  { key: "nktAreaHa", label: "Luas NKT Area (ha)", required: false, desc: "Luas area NKT di dalam lahan (desimal, ha)" },
  { key: "nktLengthM", label: "Panjang NKT (m)", required: false, desc: "Panjang segmen NKT di lahan, mis. sempadan sungai (meter)" },
  { key: "nktAssessedAt", label: "Tanggal Asesmen NKT", required: false, desc: "yyyy-mm-dd atau dd/mm/yyyy" },
  { key: "nktAssessor", label: "Asesor / Sumber NKT", required: false, desc: "Asesor, lembaga penilai, atau nama laporan" },
] as const;

export type ParcelDetailFieldKey = (typeof PARCEL_DETAIL_TARGET_FIELDS)[number]["key"];

export const PARCEL_DETAIL_AUTO_MATCH_RULES: Record<ParcelDetailFieldKey, string[]> = {
  parcelId: ["id lahan", "id_lahan", "idlahan", "parcel_id", "parcelid", "kode lahan", "kode_lahan"],
  farmerId: ["id petani", "id_petani", "idpetani", "farmer_id", "farmerid", "kode petani", "kode_petani"],
  documentType: ["jenis surat tanah", "jenis surat", "jenis_surat", "jenis_surat_tanah", "document_type", "tipe surat"],
  documentNumber: ["nomor surat", "no surat", "no. surat", "nomor_surat", "no_surat", "document_number"],
  holderName: ["nama tertera di surat", "nama di surat", "nama_tertera", "nama_di_surat", "holder_name", "nama pemilik di surat"],
  statedArea: ["luas tertera di surat (ha)", "luas tertera di surat", "luas tertera", "luas_tertera", "luas surat", "stated_area"],
  stdbNumber: ["nomor stdb", "no stdb", "no. stdb", "nomor_stdb", "no_stdb", "stdb"],
  externalCode: ["parcel_code", "parcel code", "parcelcode", "ul parcel code", "parcel_cod", "external_code"],
  subGroupLv2: ["nama kelompok tani", "kelompok tani", "kelompok_tani", "nama_kelompok_tani", "group_name", "sub_group_lv2", "kt"],
  // Pencocokan header harus PERSIS (setelah lowercase/trim) — alias dibuat
  // lengkap supaya ejaan lapangan ("Batas Utara", "Sebelah Utara") terbaca.
  // Tanpa alias satu huruf: header "S"/"T"/"B" bisa berarti apa saja, dan sel
  // sepadan MENIMPA nilai lama saat unggah ulang (review 2026-09-14).
  borderNorth: ["sepadan utara", "sepadan_utara", "batas utara", "batas_utara", "sebelah utara", "sebelah_utara", "utara", "north"],
  borderEast: ["sepadan timur", "sepadan_timur", "batas timur", "batas_timur", "sebelah timur", "sebelah_timur", "timur", "east"],
  borderSouth: ["sepadan selatan", "sepadan_selatan", "batas selatan", "batas_selatan", "sebelah selatan", "sebelah_selatan", "selatan", "south"],
  borderWest: ["sepadan barat", "sepadan_barat", "batas barat", "batas_barat", "sebelah barat", "sebelah_barat", "barat", "west"],
  blok: ["blok", "block", "blok kebun", "blok_kebun"],
  // Header Lampiran HJP: "Luas NKT Area (ha)", "LENGTH"; sisanya ejaan umum laporan asesmen.
  nktStatus: ["status nkt", "status_nkt", "nkt", "terdampak nkt", "status hcv", "hcv"],
  nktCategories: ["kategori nkt", "kategori_nkt", "kategori", "nkt kategori", "kategori hcv", "hcv category", "nkt_category"],
  nktAreaHa: ["luas nkt area (ha)", "luas nkt area", "luas_nkt_area", "luas nkt", "luas_nkt", "luas area nkt", "nkt area", "nkt_area", "nkt area (ha)", "size nkt", "hcv area (ha)", "hcv_area"],
  nktLengthM: ["length", "length (m)", "length_m", "panjang", "panjang (m)", "panjang nkt", "panjang_nkt", "panjang nkt (m)"],
  nktAssessedAt: ["tanggal asesmen nkt", "tanggal asesmen", "tgl asesmen", "tanggal_asesmen", "assessed_at", "tanggal penilaian"],
  nktAssessor: ["asesor / sumber nkt", "asesor/sumber nkt", "asesor nkt", "asesor", "sumber nkt", "penilai", "assessor", "lembaga penilai"],
};

export function autoMatchParcelDetailColumns(headers: string[]): Partial<Record<ParcelDetailFieldKey, string>> {
  return autoMatchColumns(
    headers,
    PARCEL_DETAIL_TARGET_FIELDS.map((f) => f.key),
    PARCEL_DETAIL_AUTO_MATCH_RULES,
  ) as Partial<Record<ParcelDetailFieldKey, string>>;
}

/** Lahan aktif yang boleh menerima detail — dari server, sudah dalam scope user. */
export interface ParcelRef {
  parcelUid: string;
  parcelId: string;
  /** ID Petani manusia (Farmer.farmerId). */
  farmerCode: string;
  farmerName: string;
  /** Farmer.id (cuid). */
  farmerDbId: string;
  /** Kelompok Tani yang sudah tersimpan di lahan (LandParcel.subGroupLv2) — untuk pratinjau. */
  subGroupLv2?: string | null;
  /** Blok yang sudah tersimpan (LandParcel.blok) — pratinjau "(sudah ada)", aturan sama dengan KT (#328). */
  blok?: string | null;
}

/** Satu baris siap kirim ke server (sudah ternormalisasi). */
export interface ParcelDetailRow {
  parcelUid: string;
  farmerDbId: string;
  parcelId: string;
  document: {
    type: LandDocumentTypeCode;
    typeRaw: string | null;
    number: string | null;
    holderName: string | null;
    statedArea: number | null;
    custodyNote: string | null;
  } | null;
  /** Catatan penguasaan tanpa jenis surat (mis. "Lahan sudah dijual"). */
  custodyNote: string | null;
  stdb: ParsedStdb | null;
  externalCode: string | null;
  /** Diisi ke LandParcel.subGroupLv2 hanya bila DB kosong (server yang memutuskan). */
  subGroupLv2: string | null;
  /** Sepadan (#326): hanya sisi yang terisi di file; null = tidak ada sel sepadan sama sekali. */
  border: { north: string | null; east: string | null; south: string | null; west: string | null } | null;
  /** Blok: diisi ke LandParcel.blok hanya bila DB kosong (server yang memutuskan). */
  blok: string | null;
  /** NKT (#328): status hasil asesmen; null = baris tidak membawa data NKT. Field null = tidak disentuh. */
  nkt: {
    status: NktStatusCode;
    /** null = tidak disentuh (bawaan berkas pun kosong); [] hanya sah untuk NOT_AFFECTED. */
    categories: string[] | null;
    affectedAreaHa: number | null;
    affectedLengthM: number | null;
    assessedAt: string | null;
    assessor: string | null;
  } | null;
}

export interface ParcelDetailValidatedRow {
  _rowNum: number;
  _isValid: boolean;
  _errors: string[];
  _raw: Record<ParcelDetailFieldKey, string>;
  _farmerName: string;
  /** Kelompok Tani yang sudah ada di DB untuk lahan ini (pratinjau "tidak akan ditimpa"). */
  _dbSubGroupLv2: string | null;
  /** Blok yang sudah ada di DB untuk lahan ini (pratinjau "tidak akan ditimpa", #328). */
  _dbBlok: string | null;
  data: ParcelDetailRow | null;
}

type RawRow = Record<string, unknown>;
type Mapping = Partial<Record<ParcelDetailFieldKey, string>>;

const FREE_TEXT_KEYS: ReadonlySet<ParcelDetailFieldKey> = new Set(["borderNorth", "borderEast", "borderSouth", "borderWest", "nktAssessor", "nktStatus", "nktCategories"]);

function readRaw(row: RawRow, mapping: Mapping): Record<ParcelDetailFieldKey, string> {
  const out = {} as Record<ParcelDetailFieldKey, string>;
  for (const f of PARCEL_DETAIL_TARGET_FIELDS) {
    const col = mapping[f.key];
    out[f.key] = col ? (FREE_TEXT_KEYS.has(f.key) ? cleanFreeTextCell(row[col]) : cleanCell(row[col])) : "";
  }
  return out;
}

/**
 * Validasi seluruh baris. Aturan lintas-baris (dihitung dulu):
 * - `ID Lahan` yang sama dengan `ID Petani` berbeda → SEMUA barisnya error
 *   (bug sumber; jangan pilih salah satu diam-diam);
 * - nomor STDB yang sama dipakai `ID Petani` berbeda → semua barisnya error.
 * Per baris: pasangan (petani, lahan) harus ada di `parcels`; baris tanpa
 * detail apa pun (tanpa surat, STDB, kode) → error "tidak ada data".
 *
 * `rowNumbers` = nomor baris FISIK tiap entri `rows` (#301, dari
 * `readSpreadsheetFile`) — dipakai hanya untuk `_rowNum` yang ditampilkan ke
 * pengguna. Wajib diteruskan pembaca berkas: header tak lagi diasumsikan di
 * baris 1, **dan** baris kosong di tengah data dibuang, sehingga menghitung
 * ulang dari indeks akan menggeser "Baris Asal" sebanyak baris kosong di
 * atasnya. Tanpa argumen ini, jatuh ke asumsi lama (header di baris 1).
 */
export function validateParcelDetailRows(
  rows: RawRow[],
  mapping: Mapping,
  parcels: ParcelRef[],
  rowNumbers?: number[],
  /** Bawaan NKT per berkas (#328): bila `status` diisi, SEMUA baris valid mendapat NKT kecuali selnya sendiri menyatakan lain. */
  nktDefaults?: NktFileDefaults,
): ParcelDetailValidatedRow[] {
  const lower = (s: string) => s.toLowerCase();
  const byPair = new Map<string, ParcelRef>();
  // ID Petani hanya unik per Lembaga (TD-024): pasangan (ID Petani, ID Lahan)
  // yang cocok ke >1 lahan dalam scope user tidak boleh dipilih diam-diam.
  const ambiguousPairs = new Set<string>();
  const farmerByCode = new Map<string, ParcelRef>();
  for (const p of parcels) {
    const key = `${lower(p.farmerCode)}\u0000${lower(p.parcelId)}`;
    if (byPair.has(key)) ambiguousPairs.add(key);
    byPair.set(key, p);
    if (!farmerByCode.has(lower(p.farmerCode))) farmerByCode.set(lower(p.farmerCode), p);
  }

  const raws = rows.map((r) => readRaw(r, mapping));

  // Lintas-baris: ID Lahan → himpunan ID Petani; STDB → himpunan ID Petani.
  const farmersPerParcel = new Map<string, Set<string>>();
  const farmersPerStdb = new Map<string, Set<string>>();
  const pairsPerCode = new Map<string, Set<string>>();
  for (const r of raws) {
    if (r.externalCode) {
      const s = pairsPerCode.get(lower(r.externalCode)) ?? new Set();
      s.add(`${lower(r.farmerId ?? "")}\u0000${lower(r.parcelId ?? "")}`);
      pairsPerCode.set(lower(r.externalCode), s);
    }
    if (r.parcelId && r.farmerId) {
      const s = farmersPerParcel.get(lower(r.parcelId)) ?? new Set();
      s.add(lower(r.farmerId));
      farmersPerParcel.set(lower(r.parcelId), s);
    }
    const stdb = parseStdbNumber(r.stdbNumber);
    // Hanya baris BERNOMOR yang bisa bentrok antar petani; baris pra-terbit
    // memang tak punya nomor untuk ditabrakkan (#306).
    if (stdb?.number && r.farmerId) {
      const s = farmersPerStdb.get(lower(stdb.number)) ?? new Set();
      s.add(lower(r.farmerId));
      farmersPerStdb.set(lower(stdb.number), s);
    }
  }

  return raws.map((r, idx) => {
    const errors: string[] = [];
    const farmerRef = r.farmerId ? farmerByCode.get(lower(r.farmerId)) : undefined;
    const pairKey = r.parcelId && r.farmerId ? `${lower(r.farmerId)}\u0000${lower(r.parcelId)}` : null;
    const pair = pairKey ? byPair.get(pairKey) : undefined;

    if (!r.parcelId) errors.push("ID Lahan wajib diisi");
    if (!r.farmerId) errors.push("ID Petani wajib diisi");
    if (r.parcelId && r.farmerId) {
      if (!farmerRef) errors.push(`ID Petani "${r.farmerId}" tidak ditemukan dalam database atau akses Anda`);
      else if (!pair) errors.push(`ID Lahan "${r.parcelId}" tidak terdaftar untuk petani "${r.farmerId}"`);
      else if (pairKey && ambiguousPairs.has(pairKey)) {
        errors.push(`ID Petani "${r.farmerId}" + ID Lahan "${r.parcelId}" cocok ke lebih dari satu lahan (Lembaga berbeda) — persempit cakupan akses`);
      }
    }
    if (r.parcelId && (farmersPerParcel.get(lower(r.parcelId))?.size ?? 0) > 1) {
      errors.push(`ID Lahan "${r.parcelId}" muncul di file dengan ID Petani berbeda — perbaiki sumber`);
    }

    const doc = normalizeDocumentType(r.documentType);
    const area = parseStatedArea(r.statedArea);
    if (area.error) errors.push(area.error);
    const stdb = parseStdbNumber(r.stdbNumber);
    if (stdb?.number && (farmersPerStdb.get(lower(stdb.number))?.size ?? 0) > 1) {
      errors.push(`Nomor STDB "${stdb.number}" dipakai ID Petani berbeda di file — STDB terbit per petani`);
    }
    const externalCode = r.externalCode || null;
    if (externalCode && (pairsPerCode.get(lower(externalCode))?.size ?? 0) > 1) {
      errors.push(`UL Parcel Code "${externalCode}" dipakai lebih dari satu lahan di file — kode unik per lahan`);
    }
    const subGroupLv2 = r.subGroupLv2 || null;
    const borderSides = { north: r.borderNorth || null, east: r.borderEast || null, south: r.borderSouth || null, west: r.borderWest || null };
    const border = Object.values(borderSides).some(Boolean) ? borderSides : null;
    for (const side of LAND_BORDER_SIDES) {
      const v = borderSides[side];
      if (v && v.length > 200) errors.push(`Sepadan ${LAND_BORDER_SIDE_LABELS[side]} lebih dari 200 karakter`);
    }

    // Nomor/nama/luas terisi tanpa jenis (1.046 baris di data sumber): jenisnya
    // tak diketahui, bukan tak ada — simpan sebagai OTHER (typeRaw null) agar
    // datanya tidak terbuang; UI menampilkannya sebagai "Lainnya".
    const hasDocFields = Boolean(r.documentNumber || r.holderName || area.value !== null);
    const docType: LandDocumentTypeCode | null = doc.type ?? (hasDocFields && !doc.custodyNote ? "OTHER" : null);
    const blok = r.blok || null;

    // --- NKT (#328): sel baris menang atas bawaan berkas; bawaan berkas membuat SEMUA baris ber-NKT ---
    const nktStatusCell = parseNktStatus(r.nktStatus);
    if (nktStatusCell.error) errors.push(nktStatusCell.error);
    const nktCats = parseNktCategories(r.nktCategories);
    if (nktCats.error) errors.push(nktCats.error);
    const nktArea = parsePositiveNumber(r.nktAreaHa, "Luas NKT", 10_000);
    if (nktArea.error) errors.push(nktArea.error);
    const nktLength = parsePositiveNumber(r.nktLengthM, "Panjang NKT", 100_000);
    if (nktLength.error) errors.push(nktLength.error);
    const nktDate = parseDateCell(r.nktAssessedAt, "Tanggal asesmen NKT");
    if (nktDate.error) errors.push(nktDate.error);
    const nktAssessorCell = cleanFreeTextCell(r.nktAssessor) || null;
    // Batas panjang teks = batas skema server (`trimmed.max(200)`): dicek di sini
    // supaya satu sel kepanjangan tidak menolak seluruh batch tanpa nomor baris.
    if (nktAssessorCell && nktAssessorCell.length > 200) errors.push("Asesor / Sumber NKT lebih dari 200 karakter");
    if (blok && blok.length > 200) errors.push("Blok lebih dari 200 karakter");
    if (nktDefaults?.assessor && nktDefaults.assessor.length > 200) errors.push("Asesor / sumber bawaan berkas lebih dari 200 karakter");
    const hasNktCell = Boolean(nktStatusCell.status || nktCats.categories.length || nktArea.value !== null || nktLength.value !== null || nktDate.value || nktAssessorCell);
    let nkt: ParcelDetailRow["nkt"] = null;
    if (hasNktCell || nktDefaults?.status) {
      const status = nktStatusCell.status ?? nktDefaults?.status ?? null;
      if (!status) {
        errors.push("Status NKT wajib — isi kolom Status NKT atau pilih status bawaan berkas");
      } else {
        const categories = nktCats.categories.length ? nktCats.categories : nktDefaults?.categories.length ? nktDefaults.categories : null;
        if (status !== "NOT_AFFECTED" && !categories) {
          errors.push("Kategori NKT wajib untuk lahan yang termasuk/terdampak — isi kolom Kategori NKT atau kategori bawaan berkas");
        }
        nkt = {
          status,
          categories: status === "NOT_AFFECTED" ? [] : categories,
          affectedAreaHa: nktArea.value,
          affectedLengthM: nktLength.value,
          assessedAt: nktDate.value ?? nktDefaults?.assessedAt ?? null,
          assessor: nktAssessorCell ?? nktDefaults?.assessor ?? null,
        };
      }
    }

    const hasAny = Boolean(docType || doc.custodyNote || stdb || externalCode || subGroupLv2 || border || blok || nkt);
    if (!hasAny) errors.push("Tidak ada data detail (surat, STDB, UL Parcel Code, kelompok tani, blok, sepadan, atau NKT) untuk disimpan");

    const isValid = errors.length === 0 && Boolean(pair);
    const data: ParcelDetailRow | null =
      isValid && pair
        ? {
            parcelUid: pair.parcelUid,
            farmerDbId: pair.farmerDbId,
            parcelId: pair.parcelId,
            document: docType
              ? {
                  type: docType,
                  typeRaw: doc.typeRaw,
                  number: r.documentNumber || null,
                  holderName: r.holderName || null,
                  statedArea: area.value,
                  custodyNote: null,
                }
              : null,
            custodyNote: doc.custodyNote,
            stdb,
            externalCode,
            subGroupLv2,
            border,
            blok,
            nkt,
          }
        : null;

    return {
      _rowNum: rowNumbers?.[idx] ?? idx + 2,
      _isValid: isValid,
      _errors: errors,
      _raw: r,
      _farmerName: pair?.farmerName ?? farmerRef?.farmerName ?? "",
      _dbSubGroupLv2: pair?.subGroupLv2 ?? null,
      _dbBlok: pair?.blok ?? null,
      data,
    };
  });
}
