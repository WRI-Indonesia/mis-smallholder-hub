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

export type PathSortKey = "ORIGIN" | "OFFTAKER" | "DEST" | "TON";
export type SortDir = "asc" | "desc";
/** Label kolom Offtaker untuk jalur tanpa offtaker (langsung ke Mill). */
export const DIRECT_PATH_LABEL = "langsung ke Mill";

const pathStepLabel = (r: PathRow, key: Exclude<PathSortKey, "TON">) =>
  key === "ORIGIN" ? r.steps[0]?.label ?? "" : key === "DEST" ? r.steps[r.steps.length - 1]?.label ?? "" : r.steps.length === 3 ? r.steps[1].label : DIRECT_PATH_LABEL;

/**
 * Urut baris tab Jalur per kolom (header bisa diklik, owner 2026-10-09). Seri nama
 * diurut tonase terbesar dulu, jadi "Lembaga A–Z" tetap menampilkan jalur terbesar tiap
 * Lembaga di atas. `rows` diasumsikan sudah urut tonase (`buildPathRows`).
 */
export function sortPathRows(rows: PathRow[], key: PathSortKey, dir: SortDir): PathRow[] {
  const sign = dir === "asc" ? 1 : -1;
  if (key === "TON") return [...rows].sort((a, b) => sign * (a.ton - b.ton) || a.key.localeCompare(b.key));
  return [...rows].sort((a, b) => sign * pathStepLabel(a, key).localeCompare(pathStepLabel(b, key), "id") || b.ton - a.ton);
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

/**
 * Sebar ujung garis sepanjang sisi kotak (Diagram Alur): garis yang keluar/masuk satu
 * kotak diurut menurut posisi ujung lainnya, lalu dibagi rata di `span` piksel — tanpa
 * ini semua garis bertemu di satu titik dan label tonasenya bertumpuk (owner 2026-10-09).
 * Hasil: offset y relatif tengah kotak, per kunci garis, untuk sisi sumber & target.
 */
export function spreadEdgeEnds<L extends { key: string; source: string; target: string; value: number }>(
  links: L[],
  centerY: (nodeId: string) => number,
  span: number,
): { sourceOffset: Map<string, number>; targetOffset: Map<string, number> } {
  const spread = (side: "source" | "target") => {
    const other = side === "source" ? "target" : "source";
    const groups = new Map<string, L[]>();
    for (const l of links) groups.set(l[side], [...(groups.get(l[side]) ?? []), l]);
    const out = new Map<string, number>();
    for (const ls of groups.values()) {
      ls.sort((a, b) => centerY(a[other]) - centerY(b[other]) || b.value - a.value || a.key.localeCompare(b.key));
      ls.forEach((l, i) => out.set(l.key, ls.length === 1 ? 0 : -span / 2 + (span * i) / (ls.length - 1)));
    }
    return out;
  };
  return { sourceOffset: spread("source"), targetOffset: spread("target") };
}

/**
 * Geser label agar tidak saling tindih: label dengan x (dibulatkan) yang sama diurut
 * menurut y lalu didorong ke bawah sampai berjarak ≥ `gap`; kelompok yang terdorong
 * digeser balik setengah total dorongannya supaya tetap berpusat di posisi asalnya.
 */
export function dodgeLabels(items: { key: string; x: number; y: number }[], gap: number): Map<string, { x: number; y: number }> {
  const out = new Map<string, { x: number; y: number }>();
  const byX = new Map<number, { key: string; x: number; y: number }[]>();
  for (const it of items) byX.set(Math.round(it.x / 8), [...(byX.get(Math.round(it.x / 8)) ?? []), it]);
  for (const col of byX.values()) {
    col.sort((a, b) => a.y - b.y || a.key.localeCompare(b.key));
    const ys: number[] = [];
    col.forEach((it, i) => ys.push(i === 0 ? it.y : Math.max(it.y, ys[i - 1] + gap)));
    const drift = col.reduce((a, it, i) => a + (ys[i] - it.y), 0) / col.length;
    col.forEach((it, i) => out.set(it.key, { x: it.x, y: ys[i] - drift }));
  }
  return out;
}
