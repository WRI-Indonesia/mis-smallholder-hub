import fs from "node:fs/promises";
import path from "node:path";
import Papa from "papaparse";
import type { MillStatus, OfftakerType, RecordLevel, ScMill, ScOfftaker, ScRecord, ScSurvey } from "@/lib/supply-chain-flow";

/**
 * Pembaca folder tabel CSV prototipe Supply Chain (#379) — satu berkas = satu
 * tabel (model #380). **Hanya untuk server** (memakai `node:fs`).
 *
 * Foldernya sengaja di luar repo yang ter-track (`scripts/local/…`, gitignored):
 * isinya nama petani & offtaker, sedangkan repo ini publik. Di lingkungan tanpa
 * folder itu, halaman prototipe menampilkan keadaan "data belum tersedia".
 * Lokasi bisa diganti lewat env `SUPPLY_CHAIN_TABLES_DIR`.
 */
const DEFAULT_DIR = "scripts/local/seed/data-supply-chain/tables";

export interface SupplyChainTables {
  dir: string;
  mills: ScMill[];
  offtakers: ScOfftaker[];
  records: ScRecord[];
  surveys: ScSurvey[];
}

type Row = Record<string, string>;

export function supplyChainTablesDir(): string {
  return path.resolve(process.cwd(), process.env.SUPPLY_CHAIN_TABLES_DIR ?? DEFAULT_DIR);
}

async function readTable(dir: string, name: string): Promise<Row[]> {
  const text = await fs.readFile(path.join(dir, name), "utf8");
  return Papa.parse<Row>(text, { header: true, skipEmptyLines: true }).data;
}

const n = (v: string | undefined) => {
  if (v == null || v.trim() === "") return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
};
const s = (v: string | undefined) => (v == null || v.trim() === "" ? null : v.trim());
const flags = (v: string | undefined) => (v ? v.split(";").filter(Boolean) : []);

let cache: { key: string; tables: SupplyChainTables } | null = null;

/** `null` bila folder/berkas tabel tidak ada. Di-cache per mtime berkas record. */
export async function loadSupplyChainTables(): Promise<SupplyChainTables | null> {
  const dir = supplyChainTablesDir();
  let stamp: string;
  try {
    stamp = String((await fs.stat(path.join(dir, "supply_chain_record.csv"))).mtimeMs);
  } catch {
    return null;
  }
  const key = `${dir}|${stamp}`;
  if (cache?.key === key) return cache.tables;

  const [millRows, bpRows, offRows, recRows, svRows] = await Promise.all([
    readTable(dir, "mill.csv"),
    readTable(dir, "mill_buyer_program.csv"),
    readTable(dir, "offtaker.csv"),
    readTable(dir, "supply_chain_record.csv"),
    readTable(dir, "supply_chain_survey.csv"),
  ]);
  const programs = new Map<string, string[]>();
  for (const r of bpRows) programs.set(r.mill_id, [...(programs.get(r.mill_id) ?? []), r.buyer_program_id.replace(/^BP-/, "")]);

  const tables: SupplyChainTables = {
    dir,
    mills: millRows.map((r) => ({
      id: r.mill_id, umlId: s(r.uml_id), name: r.mill_name, company: r.company ?? "", district: s(r.district),
      lat: n(r.lat), lon: n(r.lon), rspoStatus: s(r.rspo_status), source: r.source, buyerPrograms: programs.get(r.mill_id) ?? [],
    })),
    offtakers: offRows.map((r) => ({
      id: r.offtaker_id, name: r.name, type: r.type as OfftakerType, district: r.district,
      lat: n(r.lat), lon: n(r.lon), farmerGroupCode: s(r.farmer_group_code),
    })),
    records: recRows.map((r) => ({
      id: r.record_id, year: Number(r.year), level: r.level as RecordLevel, groupCode: r.farmer_group_code,
      surveyId: s(r.survey_id), offtakerId: s(r.offtaker_id), nextOfftakerId: s(r.next_offtaker_id),
      millText: s(r.mill_text), millId: s(r.mill_id), millStatus: r.mill_status as MillStatus, millBasis: r.mill_basis,
      supplyTon: n(r.supply_ton), toUl: r.supply_to_ul === "Y", ulTon: n(r.ul_supply_ton), flags: flags(r.flags),
    })),
    surveys: svRows.map((r) => ({
      id: r.survey_id, year: Number(r.year), groupCode: r.farmer_group_code, farmerId: s(r.farmer_id),
      parcelId: s(r.parcel_id), parcelIdFile: s(r.parcel_id_file), ffbTon: n(r.ffb_produced_ton),
      areaClaimHa: n(r.area_claim_ha), plantingYear: n(r.planting_year), landRight: s(r.land_right),
      lat: n(r.lat), lon: n(r.lon), flags: flags(r.flags),
    })),
  };
  cache = { key, tables };
  return tables;
}
