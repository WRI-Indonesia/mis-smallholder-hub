import { describe, expect, it } from "vitest";
import { buildSupplyChainSankey, type ScRecord, type SupplyChainData } from "@/lib/supply-chain-flow";
import { DIRECT_NODE_ID, buildPathRows, buildSupplyChainTree, bezierPointAtX, dodgeLabels, sortPathRows, spreadEdgeEnds, treeBranchKeys, type SupplyTreeNode } from "@/lib/supply-chain-views";

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

describe("sortPathRows (header tab Jalur)", () => {
  const rows = buildPathRows(treeGraph);
  it("tonase naik/turun", () => {
    expect(sortPathRows(rows, "TON", "asc").map((r) => r.ton)).toEqual([4, 5, 20, 40]);
    expect(sortPathRows(rows, "TON", "desc").map((r) => r.ton)).toEqual([40, 20, 5, 4]);
  });
  it("per nama; seri diurut tonase terbesar; jalur tanpa offtaker = 'langsung ke Mill'", () => {
    expect(sortPathRows(rows, "ORIGIN", "asc").map((r) => [r.steps[0].label, r.ton])).toEqual([["L1", 40], ["L2", 20], ["L3", 5], ["L3", 4]]);
    // Tanpa offtaker (L3 → Mill) selalu paling bawah, arah apa pun.
    expect(sortPathRows(rows, "OFFTAKER", "asc").map((r) => r.ton)).toEqual([40, 20, 5, 4]);
    expect(sortPathRows(rows, "OFFTAKER", "desc").map((r) => r.ton)).toEqual([20, 40, 5, 4]);
    expect(sortPathRows(rows, "DEST", "asc").map((r) => r.steps[r.steps.length - 1].label)[0]).toBe("Karya Cipta");
  });
});

describe("tata letak Diagram Alur", () => {
  it("spreadEdgeEnds membagi ujung garis rata menurut posisi ujung lainnya", () => {
    const links = [
      { key: "a", source: "S", target: "T2", value: 1 },
      { key: "b", source: "S", target: "T1", value: 1 },
      { key: "c", source: "X", target: "T1", value: 1 },
    ];
    const y = { S: 0, X: 100, T1: 0, T2: 50 } as Record<string, number>;
    const { sourceOffset, targetOffset } = spreadEdgeEnds(links, (id) => y[id], 20);
    expect([sourceOffset.get("b"), sourceOffset.get("a"), sourceOffset.get("c")]).toEqual([-10, 10, 0]);
    expect([targetOffset.get("b"), targetOffset.get("c"), targetOffset.get("a")]).toEqual([-10, 10, 0]);
  });
  it("bezierPointAtX: ujung kurva = ujung garis; tengah x = tengah y", () => {
    expect(bezierPointAtX(0, 10, 100, 50, 0).y).toBeCloseTo(10);
    expect(bezierPointAtX(0, 10, 100, 50, 100).y).toBeCloseTo(50);
    expect(bezierPointAtX(0, 10, 100, 50, 50).y).toBeCloseTo(30);
    const q = bezierPointAtX(0, 10, 100, 50, 20).y;
    expect(q).toBeGreaterThan(10);
    expect(q).toBeLessThan(30);
  });
  it("dodgeLabels: label satu kolom berjarak ≥ gap dan tetap berpusat; kolom lain tak tersentuh", () => {
    const out = dodgeLabels([{ key: "a", x: 100, y: 50 }, { key: "b", x: 101, y: 52 }, { key: "c", x: 400, y: 50 }], 20);
    expect(out.get("b")!.y - out.get("a")!.y).toBe(20);
    expect((out.get("a")!.y + out.get("b")!.y) / 2).toBeCloseTo(51);
    expect(out.get("c")).toEqual({ x: 400, y: 50 });
  });
});
