import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Pembaca tabel CSV prototipe Supply Chain (#379): folder lokal dulu, lalu S3
 * privat; berkas yang tidak lengkap = "data belum tersedia" (null), bukan error.
 */
const s3 = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("@/lib/s3", () => ({ s3, S3_BUCKET: "bucket-uji" }));

const { loadSupplyChainTables, parseSupplyChainTables } = await import("@/lib/supply-chain-tables");

const CSV: Parameters<typeof parseSupplyChainTables>[0] = {
  "mill.csv": "mill_id,uml_id,mill_name,company,district,province,lat,lon,rspo_status,source\nUML-1,PO1,SEI BUATAN,PERKEBUNAN NUSANTARA V,Siak,Riau,0.65,101.86,RSPO Certified,UML\n",
  "mill_buyer_program.csv": "mill_id,buyer_program_id\nUML-1,BP-UL\n",
  "offtaker.csv": "offtaker_id,name,type,district,lat,lon,farmer_group_code,farmer_group_codes,names,source\nAGN-0001,Agen,AGEN,Siak,,,,ISH-1,Agen,LAHAN\n",
  "supply_chain_record.csv":
    "record_id,year,level,farmer_group_code,survey_id,offtaker_id,next_offtaker_id,mill_text,mill_id,mill_status,mill_basis,supply_ton,supply_to_ul,ul_supply_ton,secondary_mill_text,flags,source_sheet,source_row\n" +
    "RC-1,2025,LAHAN,ISH-1,SV-1,AGN-0001,,PTPN,UML-1,PKS_PASTI,NAMA_PKS,12.5,Y,,,DUA_MILL;X,sheet,11\n",
  "supply_chain_survey.csv":
    "survey_id,year,farmer_group_code,farmer_id,farmer_id_file,parcel_id,parcel_id_file,ffb_produced_ton,area_claim_ha,area_mapping_ha,planting_year,replanting,land_right,lat,lon,village,subdistrict,flags,source_row\n" +
    "SV-1,2025,ISH-1,F1,F1,P1,P1,12.5,1.2,,2010,,SHM,0.5,101.5,Desa,Kec,,11\n",
};

let dir: string;
beforeEach(() => {
  vi.clearAllMocks();
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "sc-tables-"));
  process.env.SUPPLY_CHAIN_TABLES_DIR = dir;
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
  delete process.env.SUPPLY_CHAIN_TABLES_DIR;
});

const writeAll = (only?: string[]) => {
  for (const [f, text] of Object.entries(CSV)) if (!only || only.includes(f)) fs.writeFileSync(path.join(dir, f), text);
};

describe("parseSupplyChainTables", () => {
  it("memetakan kolom CSV ke tipe (angka, null, flag, program buyer)", () => {
    const t = parseSupplyChainTables(CSV, "uji");
    expect(t.mills[0]).toMatchObject({ id: "UML-1", lat: 0.65, buyerPrograms: ["UL"] });
    expect(t.records[0]).toMatchObject({ supplyTon: 12.5, toUl: true, ulTon: null, nextOfftakerId: null, flags: ["DUA_MILL", "X"] });
    expect(t.surveys[0]).toMatchObject({ farmerId: "F1", areaClaimHa: 1.2, plantingYear: 2010 });
  });
});

describe("loadSupplyChainTables", () => {
  it("membaca folder lokal bila lengkap, tanpa menyentuh S3", async () => {
    writeAll();
    const t = await loadSupplyChainTables();
    expect(t?.records).toHaveLength(1);
    expect(t?.source).toContain("lokal:");
    expect(s3.send).not.toHaveBeenCalled();
  });

  it("folder lokal tidak lengkap → null (data belum tersedia), bukan error", async () => {
    writeAll(["supply_chain_record.csv"]);
    await expect(loadSupplyChainTables()).resolves.toBeNull();
  });

  it("tanpa folder lokal → membaca S3 privat di prefix prototype/supply-chain/", async () => {
    s3.send.mockImplementation(async (cmd: { input: { Key: string } }) => {
      const f = cmd.input.Key.replace("prototype/supply-chain/", "") as keyof typeof CSV;
      if (cmd.constructor.name === "HeadObjectCommand") return { ETag: '"etag-1"' };
      return { Body: { transformToString: async () => CSV[f] } };
    });
    const t = await loadSupplyChainTables();
    expect(t?.source).toBe("s3:bucket-uji/prototype/supply-chain/");
    expect(t?.mills[0].id).toBe("UML-1");
  });

  it("S3 belum diunggah (404) → null", async () => {
    s3.send.mockRejectedValue(Object.assign(new Error("NotFound"), { $metadata: { httpStatusCode: 404 } }));
    await expect(loadSupplyChainTables()).resolves.toBeNull();
  });
});
