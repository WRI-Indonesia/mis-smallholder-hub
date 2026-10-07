import fs from "node:fs/promises";
import path from "node:path";
import Papa from "papaparse";
import { GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { s3, S3_BUCKET } from "@/lib/s3";
import type { MillStatus, OfftakerType, RecordLevel, ScMill, ScOfftaker, ScRecord, ScSurvey } from "@/lib/supply-chain-flow";

/**
 * Pembaca tabel CSV prototipe Supply Chain (#379) — satu berkas = satu tabel
 * (model #380). **Hanya untuk server.**
 *
 * Isinya nama petani & offtaker, sedangkan repo ini publik, jadi tabel tidak
 * pernah masuk repo. Dua sumber, dicoba berurutan:
 * 1. **Folder lokal** `scripts/local/seed/data-supply-chain/tables` (gitignored,
 *    hasil `build-tables.mjs`) — dev. Bisa diganti env `SUPPLY_CHAIN_TABLES_DIR`.
 * 2. **S3 privat** `<bucket>/prototype/supply-chain/*.csv` — staging & prod; bucket
 *    ikut env (dev untuk local/staging, prod untuk prod). Diunggah dengan
 *    `scripts/seed/upload-supply-chain-tables.mjs`.
 * Tanpa keduanya, halaman prototipe menampilkan keadaan "data belum tersedia".
 */
const DEFAULT_DIR = "scripts/local/seed/data-supply-chain/tables";
export const SUPPLY_CHAIN_S3_PREFIX = "prototype/supply-chain/";
/** Berkas yang dibaca halaman (tabel lain di folder hanya untuk audit). */
export const SUPPLY_CHAIN_TABLE_FILES = ["mill.csv", "mill_buyer_program.csv", "offtaker.csv", "supply_chain_record.csv", "supply_chain_survey.csv"] as const;
type TableFile = (typeof SUPPLY_CHAIN_TABLE_FILES)[number];
/** Berkas penanda versi data (mtime lokal / ETag S3) untuk cache. */
const STAMP_FILE: TableFile = "supply_chain_record.csv";

export interface SupplyChainTables {
  /** Lokasi sumber yang terbaca — untuk keterangan di UI. */
  source: string;
  mills: ScMill[];
  offtakers: ScOfftaker[];
  records: ScRecord[];
  surveys: ScSurvey[];
}

type Row = Record<string, string>;

function localDir(): string {
  return path.resolve(process.cwd(), process.env.SUPPLY_CHAIN_TABLES_DIR ?? DEFAULT_DIR);
}

/** Keterangan sumber untuk keadaan kosong (relatif ke repo + lokasi S3). */
export function supplyChainTablesLocation(): string {
  return `${path.relative(process.cwd(), localDir())} atau S3 ${S3_BUCKET}/${SUPPLY_CHAIN_S3_PREFIX}`;
}

const n = (v: string | undefined) => {
  if (v == null || v.trim() === "") return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
};
const s = (v: string | undefined) => (v == null || v.trim() === "" ? null : v.trim());
const flags = (v: string | undefined) => (v ? v.split(";").filter(Boolean) : []);
const parse = (text: string) => Papa.parse<Row>(text, { header: true, skipEmptyLines: true }).data;

/** Teks CSV per berkas → tabel bertipe. Murni (tanpa I/O) agar bisa diuji. */
export function parseSupplyChainTables(texts: Record<TableFile, string>, source: string): SupplyChainTables {
  const programs = new Map<string, string[]>();
  for (const r of parse(texts["mill_buyer_program.csv"])) {
    programs.set(r.mill_id, [...(programs.get(r.mill_id) ?? []), r.buyer_program_id.replace(/^BP-/, "")]);
  }
  return {
    source,
    mills: parse(texts["mill.csv"]).map((r) => ({
      id: r.mill_id, umlId: s(r.uml_id), name: r.mill_name, company: r.company ?? "", district: s(r.district),
      lat: n(r.lat), lon: n(r.lon), rspoStatus: s(r.rspo_status), source: r.source, buyerPrograms: programs.get(r.mill_id) ?? [],
    })),
    offtakers: parse(texts["offtaker.csv"]).map((r) => ({
      id: r.offtaker_id, name: r.name, type: r.type as OfftakerType, district: r.district,
      lat: n(r.lat), lon: n(r.lon), farmerGroupCode: s(r.farmer_group_code),
    })),
    records: parse(texts["supply_chain_record.csv"]).map((r) => ({
      id: r.record_id, year: Number(r.year), level: r.level as RecordLevel, groupCode: r.farmer_group_code,
      surveyId: s(r.survey_id), offtakerId: s(r.offtaker_id), nextOfftakerId: s(r.next_offtaker_id),
      millText: s(r.mill_text), millId: s(r.mill_id), millStatus: r.mill_status as MillStatus, millBasis: r.mill_basis,
      supplyTon: n(r.supply_ton), toUl: r.supply_to_ul === "Y", ulTon: n(r.ul_supply_ton), flags: flags(r.flags),
    })),
    surveys: parse(texts["supply_chain_survey.csv"]).map((r) => ({
      id: r.survey_id, year: Number(r.year), groupCode: r.farmer_group_code, farmerId: s(r.farmer_id),
      parcelId: s(r.parcel_id), parcelIdFile: s(r.parcel_id_file), ffbTon: n(r.ffb_produced_ton),
      areaClaimHa: n(r.area_claim_ha), plantingYear: n(r.planting_year), landRight: s(r.land_right),
      lat: n(r.lat), lon: n(r.lon), flags: flags(r.flags),
    })),
  };
}

type Source = { label: string; stamp: string; read: (f: TableFile) => Promise<string> };

async function localSource(): Promise<Source | null> {
  const dir = localDir();
  try {
    const st = await fs.stat(path.join(dir, STAMP_FILE));
    return { label: `lokal:${dir}`, stamp: String(st.mtimeMs), read: (f) => fs.readFile(path.join(dir, f), "utf8") };
  } catch {
    return null;
  }
}

async function s3Source(): Promise<Source | null> {
  try {
    const head = await s3.send(new HeadObjectCommand({ Bucket: S3_BUCKET, Key: SUPPLY_CHAIN_S3_PREFIX + STAMP_FILE }));
    return {
      label: `s3:${S3_BUCKET}/${SUPPLY_CHAIN_S3_PREFIX}`,
      stamp: head.ETag ?? String(head.LastModified?.getTime() ?? ""),
      read: async (f) => {
        const obj = await s3.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: SUPPLY_CHAIN_S3_PREFIX + f }));
        return (await obj.Body?.transformToString("utf-8")) ?? "";
      },
    };
  } catch (e) {
    // Belum diunggah (404) = keadaan normal "data belum tersedia"; selain itu catat.
    const status = (e as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
    if (status !== 404) console.warn("[supply-chain] S3 tidak terbaca:", (e as Error).message);
    return null;
  }
}

let cache: { key: string; tables: SupplyChainTables } | null = null;

/** `null` bila tabel tidak ada di lokal maupun S3. Di-cache per versi berkas record. */
export async function loadSupplyChainTables(): Promise<SupplyChainTables | null> {
  const src = (await localSource()) ?? (await s3Source());
  if (!src) return null;
  const key = `${src.label}|${src.stamp}`;
  if (cache?.key === key) return cache.tables;

  let texts: Record<TableFile, string>;
  try {
    texts = Object.fromEntries(
      await Promise.all(SUPPLY_CHAIN_TABLE_FILES.map(async (f) => [f, await src.read(f)] as const)),
    ) as Record<TableFile, string>;
  } catch (e) {
    // Berkas pendukung belum lengkap (unggahan setengah jalan / folder parsial) →
    // "data belum tersedia", bukan halaman error.
    console.warn("[supply-chain] tabel tidak lengkap di", src.label, "—", (e as Error).message);
    return null;
  }
  const tables = parseSupplyChainTables(texts, src.label);
  cache = { key, tables };
  return tables;
}
