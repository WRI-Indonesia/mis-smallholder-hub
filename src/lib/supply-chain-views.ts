import {
  CHANNEL_ORDER,
  UL_FILTER_LABEL,
  type ScGroup,
  type SankeyGraph,
  type SankeyNode,
  type SupplyChannel,
  type UlFilter,
} from "@/lib/supply-chain-flow";

// ---------------------------------------------------------------------------
// Tampilan alternatif Sankey di Dashboard Rantai Pasok (owner 2026-10-09:
// sebagian pembaca bingung dengan pita Sankey yang saling tumpang tindih).
// Semuanya diturunkan dari `SankeyGraph` yang sama → angka keempat tab identik.
// ---------------------------------------------------------------------------

/** Satu jalur utuh asal → (offtaker) → tujuan, untuk tab Jalur. */
export interface PathRow {
  key: string;
  steps: SankeyNode[];
  channel: SupplyChannel;
  ton: number;
}

/** Jalur graf diurut tonase terbesar — tiap baris berdiri sendiri, tanpa garis yang bersilangan. */
export function buildPathRows(graph: SankeyGraph): PathRow[] {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  return graph.paths
    .filter((p) => p.ton > 0)
    .map((p) => ({ key: p.links.join("|"), steps: p.nodes.map((id) => byId.get(id)!).filter(Boolean), channel: p.channel, ton: p.ton }))
    .sort((a, b) => b.ton - a.ton || a.key.localeCompare(b.key));
}

export type TreeDirection = "HULU" | "HILIR";
export type TreeLevel = "DISTRIK" | "LEMBAGA" | "OFFTAKER" | "UL" | "MILL";
export const TREE_LEVEL_LABEL: Record<TreeLevel, string> = { DISTRIK: "Distrik", LEMBAGA: "Lembaga", OFFTAKER: "Offtaker", UL: "UL / Non-UL", MILL: "Mill" };

/** Node pseudo tingkat Offtaker untuk TBS yang langsung ke Mill (tanpa offtaker). */
export const DIRECT_NODE_ID = "-:LANGSUNG";
const UNKNOWN_MILL_ID = "M:?";

export interface SupplyTreeNode {
  /** Unik di seluruh pohon (jalur dari akar) — kunci buka/tutup. */
  key: string;
  /** Id node Sankey (`D:`, `L:`, `G:`, `O:`, `C:`, `U:`, `M:`) — dasar klik-filter; `-:` = tak bisa difilter. */
  nodeId: string;
  level: TreeLevel;
  label: string;
  sub: string;
  isUl: boolean;
  groupCode: string | null;
  ton: number;
  tonByChannel: Record<SupplyChannel, number>;
  children: SupplyTreeNode[];
}

export interface TreeOptions {
  direction: TreeDirection;
  /** Tambah tingkat Distrik di atas Lembaga (toggle Dari = Distrik). */
  byDistrict: boolean;
  /** Tambah tingkat Ke Mill UL / Bukan ke Mill UL di atas Mill (toggle Ke = UL / Non-UL). */
  byUl: boolean;
}

/**
 * Tabel pohon agregasi. Hulu → hilir: [Distrik] › Lembaga › Offtaker › [UL] › Mill;
 * hilir → hulu: [UL] › Mill › Offtaker › [Distrik] › Lembaga — tingkat pengelompok
 * (Distrik, UL) selalu tepat di atas anggotanya. `graph` WAJIB dibangun per Lembaga
 * & per Mill tanpa pelipatan (`origin: "LEMBAGA"`, `destination: "MILL"`,
 * `maxPerColumn: Infinity`) — tingkat Distrik/UL ditambahkan di sini. UL mengikuti
 * definisi node Sankey Ke Mill UL (record bertanda "Supply to UL"), jadi satu jalur
 * bisa terbelah ke dua cabang.
 */
export function buildSupplyChainTree(graph: SankeyGraph, groups: ScGroup[], opts: TreeOptions): SupplyTreeNode[] {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const district = new Map(groups.map((g) => [g.code, g.districtName]));
  type Step = Pick<SupplyTreeNode, "nodeId" | "level" | "label" | "sub" | "isUl" | "groupCode">;
  const fromNode = (n: SankeyNode, level: TreeLevel): Step => ({ nodeId: n.id, level, label: n.label, sub: n.sub, isUl: n.isUl, groupCode: n.groupCode });

  type Building = Omit<SupplyTreeNode, "children"> & { index: Map<string, Building> };
  const roots = new Map<string, Building>();
  const add = (steps: Step[], ton: number, channel: SupplyChannel) => {
    let siblings = roots;
    let parentKey = "";
    for (const s of steps) {
      const key = `${parentKey}/${s.nodeId}`;
      let node = siblings.get(s.nodeId);
      if (!node) {
        node = { ...s, key, ton: 0, tonByChannel: { AGEN: 0, RAMP: 0, KT_KOPERASI: 0, LANGSUNG: 0 }, index: new Map() };
        siblings.set(s.nodeId, node);
      }
      node.ton += ton;
      node.tonByChannel[channel] += ton;
      siblings = node.index;
      parentKey = key;
    }
  };

  for (const p of graph.paths) {
    const origin = byId.get(p.nodes[0]);
    const dest = byId.get(p.nodes[p.nodes.length - 1]);
    if (!origin || !dest) continue;
    const mid = p.nodes.length === 3 ? byId.get(p.nodes[1]) : undefined;
    const lembaga = fromNode(origin, "LEMBAGA");
    const districtName = district.get(origin.groupCode ?? "") ?? "?";
    const dist: Step = { nodeId: `D:${districtName}`, level: "DISTRIK", label: districtName, sub: "", isUl: false, groupCode: null };
    const off: Step = mid
      ? fromNode(mid, "OFFTAKER")
      : { nodeId: DIRECT_NODE_ID, level: "OFFTAKER", label: "Langsung ke Mill", sub: "tanpa offtaker", isUl: false, groupCode: null };
    const mill = fromNode(dest, "MILL");
    const ulStep = (u: UlFilter): Step => ({ nodeId: `U:${u}`, level: "UL", label: UL_FILTER_LABEL[u], sub: "", isUl: u === "UL", groupCode: null });
    // Mill tak diketahui tidak punya status UL yang bermakna — sama dengan Sankey, tetap terpisah.
    const portions: [Step | null, number][] =
      opts.byUl && dest.id !== UNKNOWN_MILL_ID ? [[ulStep("UL"), p.toUlTon], [ulStep("NON_UL"), p.ton - p.toUlTon]] : [[null, p.ton]];
    for (const [ul, ton] of portions) {
      if (!(ton > 0)) continue;
      const hulu = [opts.byDistrict ? dist : null, lembaga, off, ul, mill];
      const hilir = [ul, mill, off, opts.byDistrict ? dist : null, lembaga];
      add((opts.direction === "HULU" ? hulu : hilir).filter((s): s is Step => !!s), ton, p.channel);
    }
  }

  // Urut tonase; "Mill tidak diketahui" & "Langsung ke Mill" selalu paling bawah di tingkatnya.
  const tail = (n: SupplyTreeNode) => (n.nodeId === UNKNOWN_MILL_ID || n.nodeId === DIRECT_NODE_ID ? 1 : 0);
  const finish = (m: Map<string, Building>): SupplyTreeNode[] =>
    [...m.values()]
      .map(({ index, ...n }) => ({ ...n, children: finish(index) }))
      .sort((a, b) => tail(a) - tail(b) || b.ton - a.ton || a.label.localeCompare(b.label));
  return finish(roots);
}

/** Semua kunci node yang punya anak — untuk "Buka semua". */
export function treeBranchKeys(nodes: SupplyTreeNode[], maxDepth = Infinity, depth = 0): string[] {
  if (depth >= maxDepth) return [];
  return nodes.flatMap((n) => (n.children.length > 0 ? [n.key, ...treeBranchKeys(n.children, maxDepth, depth + 1)] : []));
}

/** Urutan kanal tetap (sama dengan legenda) untuk batang komposisi. */
export const channelSegments = (n: Pick<SupplyTreeNode, "tonByChannel">) => CHANNEL_ORDER.map((c) => ({ channel: c, ton: n.tonByChannel[c] })).filter((s) => s.ton > 0);
