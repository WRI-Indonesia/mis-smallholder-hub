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


/** Nilai sel yang berarti "tidak ada" pada data sumber. */
const EMPTY_TOKENS = new Set(["", "-", "0", "n/a", "na", "null", "belum dapat", "belum ada", "tidak ada"]);

export function cleanCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const s = String(value).trim().replace(/\s+/g, " ");
  return EMPTY_TOKENS.has(s.toLowerCase()) ? "" : s;
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
  number: string;
  /** Diturunkan dari segmen terakhir bila berpola ".../M/YYYY" atau ".../YYYY". */
  issuedYear: number | null;
}

export function parseStdbNumber(raw: unknown): ParsedStdb | null {
  const text = cleanCell(raw);
  if (!text) return null;
  const m = text.match(/\/(\d{4})$/);
  const year = m ? Number(m[1]) : NaN;
  return { number: text, issuedYear: year >= 1990 && year <= 2100 ? year : null };
}

/** Luas tertera (ha): angka > 0; koma desimal diterima; 0/kosong → null. */
export function parseStatedArea(raw: unknown): { value: number | null; error: string | null } {
  const text = cleanCell(raw);
  if (!text) return { value: null, error: null };
  const n = Number(text.replace(",", "."));
  if (!Number.isFinite(n)) return { value: null, error: `Luas tertera tidak valid: "${text}"` };
  if (n <= 0) return { value: null, error: null };
  return { value: n, error: null };
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
}

export interface ParcelDetailValidatedRow {
  _rowNum: number;
  _isValid: boolean;
  _errors: string[];
  _raw: Record<ParcelDetailFieldKey, string>;
  _farmerName: string;
  /** Kelompok Tani yang sudah ada di DB untuk lahan ini (pratinjau "tidak akan ditimpa"). */
  _dbSubGroupLv2: string | null;
  data: ParcelDetailRow | null;
}

type RawRow = Record<string, unknown>;
type Mapping = Partial<Record<ParcelDetailFieldKey, string>>;

function readRaw(row: RawRow, mapping: Mapping): Record<ParcelDetailFieldKey, string> {
  const out = {} as Record<ParcelDetailFieldKey, string>;
  for (const f of PARCEL_DETAIL_TARGET_FIELDS) {
    const col = mapping[f.key];
    out[f.key] = col ? cleanCell(row[col]) : "";
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
 */
export function validateParcelDetailRows(
  rows: RawRow[],
  mapping: Mapping,
  parcels: ParcelRef[],
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
    if (stdb && r.farmerId) {
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
    if (stdb && (farmersPerStdb.get(lower(stdb.number))?.size ?? 0) > 1) {
      errors.push(`Nomor STDB "${stdb.number}" dipakai ID Petani berbeda di file — STDB terbit per petani`);
    }
    const externalCode = r.externalCode || null;
    if (externalCode && (pairsPerCode.get(lower(externalCode))?.size ?? 0) > 1) {
      errors.push(`UL Parcel Code "${externalCode}" dipakai lebih dari satu lahan di file — kode unik per lahan`);
    }
    const subGroupLv2 = r.subGroupLv2 || null;

    // Nomor/nama/luas terisi tanpa jenis (1.046 baris di data sumber): jenisnya
    // tak diketahui, bukan tak ada — simpan sebagai OTHER (typeRaw null) agar
    // datanya tidak terbuang; UI menampilkannya sebagai "Lainnya".
    const hasDocFields = Boolean(r.documentNumber || r.holderName || area.value !== null);
    const docType: LandDocumentTypeCode | null = doc.type ?? (hasDocFields && !doc.custodyNote ? "OTHER" : null);
    const hasAny = Boolean(docType || doc.custodyNote || stdb || externalCode || subGroupLv2);
    if (!hasAny) errors.push("Tidak ada data detail (surat, STDB, UL Parcel Code, atau kelompok tani) untuk disimpan");

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
          }
        : null;

    return {
      _rowNum: idx + 2,
      _isValid: isValid,
      _errors: errors,
      _raw: r,
      _farmerName: pair?.farmerName ?? farmerRef?.farmerName ?? "",
      _dbSubGroupLv2: pair?.subGroupLv2 ?? null,
      data,
    };
  });
}
