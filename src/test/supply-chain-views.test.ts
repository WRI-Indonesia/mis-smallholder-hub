import { describe, expect, it } from "vitest";
import { buildSupplyChainSankey, type ScRecord, type SupplyChainData } from "@/lib/supply-chain-flow";
import { DIRECT_NODE_ID, buildPathRows, buildSupplyChainTree, treeBranchKeys, type SupplyTreeNode } from "@/lib/supply-chain-views";

const rec = (over: Partial<ScRecord>): ScRecord => ({
  id: "r", year: 2025, level: "LAHAN", groupCode: "G1", surveyId: null, offtakerId: null, nextOfftakerId: null,
  millText: null, millId: "M1", millStatus: "PKS_PASTI", millBasis: "NAMA_PKS", supplyTon: 10, toUl: false, ulTon: null, flags: [],
  ...over,
});

const data: SupplyChainData = {
  groups: [
    { code: "G1", name: "Lembaga Satu", abrv: "L1", category: "SWADAYA", districtName: "Siak", lat: null, lon: null },
    { code: "G2", name: "Lembaga Dua", abrv: "L2", category: "EX_PLASMA", districtName: "Rokan Hulu", lat: null, lon: null },
    { code: "G3", name: "Lembaga Tiga", abrv: "L3", category: "SWADAYA", districtName: "Siak", lat: null, lon: null },
  ],
  mills: [
    { id: "M1", umlId: null, name: "SEI BUATAN", company: "PERKEBUNAN NUSANTARA V", district: "Siak", lat: null, lon: null, rspoStatus: null, source: "UML", buyerPrograms: ["UL"] },
    { id: "M2", umlId: null, name: "Karya Cipta", company: "KARYA CIPTA", district: null, lat: null, lon: null, rspoStatus: null, source: "MANUAL", buyerPrograms: [] },
  ],
  offtakers: [
    { id: "AGN-1", name: "Agen A", type: "AGEN", district: "Rokan Hulu", lat: null, lon: null, farmerGroupCode: null },
    { id: "RMP-1", name: "RAMP B", type: "RAMP", district: "Rokan Hulu", lat: null, lon: null, farmerGroupCode: null },
  ],
  records: [],
};

const records = [
  rec({ id: "a", groupCode: "G1", offtakerId: "AGN-1", millId: "M1", supplyTon: 30, toUl: true }),
  rec({ id: "b", groupCode: "G1", offtakerId: "AGN-1", millId: "M1", supplyTon: 10, toUl: false }),
  rec({ id: "c", groupCode: "G2", offtakerId: "RMP-1", millId: "M2", supplyTon: 20 }),
  rec({ id: "d", groupCode: "G3", millId: "M1", supplyTon: 5, toUl: true }),
  rec({ id: "e", groupCode: "G3", millId: null, millStatus: "TIDAK_DIKETAHUI", supplyTon: 4 }),
];
const treeGraph = buildSupplyChainSankey(data, records, { maxPerColumn: Infinity });
const sumTon = (nodes: SupplyTreeNode[]) => nodes.reduce((a, n) => a + n.ton, 0);
const find = (nodes: SupplyTreeNode[], id: string) => nodes.find((n) => n.nodeId === id);

describe("jalur Sankey bertonase", () => {
  it("menjumlah tonase & tonase bertanda UL per jalur unik", () => {
    const p = treeGraph.paths.find((x) => x.nodes.join() === "L:G1,G:AGEN,M:M1");
    expect(p).toMatchObject({ channel: "AGEN", ton: 40, toUlTon: 30 });
    expect(treeGraph.paths.reduce((a, x) => a + x.ton, 0)).toBe(treeGraph.totalTon);
  });
});

describe("buildPathRows (tab Jalur)", () => {
  it("urut tonase terbesar; jalur langsung ke Mill hanya dua langkah", () => {
    const rows = buildPathRows(treeGraph);
    expect(rows.map((r) => r.ton)).toEqual([40, 20, 5, 4]);
    expect(rows[0].steps.map((s) => s.label)).toEqual(["L1", "Agen", "PTPN V · Sei Buatan"]);
    expect(rows[2].steps.map((s) => s.id)).toEqual(["L:G3", "M:M1"]);
  });
});

describe("buildSupplyChainTree (tab Tabel Pohon)", () => {
  it("hulu → hilir: Lembaga › Offtaker › Mill; tanpa offtaker = node Langsung ke Mill", () => {
    const tree = buildSupplyChainTree(treeGraph, data.groups, { direction: "HULU", byDistrict: false, byUl: false });
    expect(tree.map((n) => [n.nodeId, n.level, n.ton])).toEqual([["L:G1", "LEMBAGA", 40], ["L:G2", "LEMBAGA", 20], ["L:G3", "LEMBAGA", 9]]);
    const g3 = find(tree, "L:G3")!;
    expect(g3.children).toHaveLength(1);
    expect(g3.children[0]).toMatchObject({ nodeId: DIRECT_NODE_ID, level: "OFFTAKER", ton: 9 });
    // "Mill tidak diketahui" selalu paling bawah di tingkatnya.
    expect(g3.children[0].children.map((n) => n.nodeId)).toEqual(["M:M1", "M:?"]);
    expect(sumTon(tree)).toBe(treeGraph.totalTon);
  });

  it("toggle Distrik menambah tingkat Distrik di atas Lembaga", () => {
    const tree = buildSupplyChainTree(treeGraph, data.groups, { direction: "HULU", byDistrict: true, byUl: false });
    expect(tree.map((n) => [n.label, n.ton])).toEqual([["Siak", 49], ["Rokan Hulu", 20]]);
    expect(find(tree, "D:Siak")!.children.map((n) => n.nodeId)).toEqual(["L:G1", "L:G3"]);
  });

  it("hilir → hulu dengan UL: UL › Mill › Offtaker › Distrik › Lembaga; satu jalur terbelah sesuai tanda UL", () => {
    const tree = buildSupplyChainTree(treeGraph, data.groups, { direction: "HILIR", byDistrict: true, byUl: true });
    expect(tree.map((n) => [n.nodeId, n.ton])).toEqual([["U:UL", 35], ["U:NON_UL", 30], ["M:?", 4]]);
    const ulMill = find(tree, "U:UL")!.children[0];
    expect(ulMill).toMatchObject({ nodeId: "M:M1", level: "MILL", ton: 35, isUl: true });
    expect(ulMill.children.map((n) => [n.nodeId, n.ton])).toEqual([["G:AGEN", 30], [DIRECT_NODE_ID, 5]]);
    const lembaga = ulMill.children[0].children[0].children[0];
    expect(lembaga).toMatchObject({ nodeId: "L:G1", level: "LEMBAGA", ton: 30, tonByChannel: { AGEN: 30, RAMP: 0, KT_KOPERASI: 0, LANGSUNG: 0 } });
    // Bagian non-UL jalur yang sama tetap tercatat di cabang lain.
    expect(find(find(tree, "U:NON_UL")!.children, "M:M1")?.ton).toBe(10);
    expect(sumTon(tree)).toBe(treeGraph.totalTon);
  });

  it("kunci node unik per jalur dari akar; treeBranchKeys membatasi kedalaman", () => {
    const tree = buildSupplyChainTree(treeGraph, data.groups, { direction: "HILIR", byDistrict: false, byUl: false });
    const keys: string[] = [];
    const walk = (ns: SupplyTreeNode[]) => ns.forEach((n) => (keys.push(n.key), walk(n.children)));
    walk(tree);
    expect(new Set(keys).size).toBe(keys.length);
    expect(treeBranchKeys(tree, 1)).toEqual(tree.filter((n) => n.children.length > 0).map((n) => n.key));
    expect(treeBranchKeys(tree).length).toBeGreaterThan(treeBranchKeys(tree, 1).length);
  });
});
