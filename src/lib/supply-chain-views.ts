import {
  CHANNEL_ORDER,
  UL_FILTER_LABEL,
  isUlDestination,
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
/** Label tingkat Offtaker untuk TBS tanpa offtaker — satu konstanta untuk tab Jalur & Tabel Pohon. */
export const DIRECT_LABEL = "Langsung ke Mill";

const pathStepLabel = (r: PathRow, key: Exclude<PathSortKey, "TON">) =>
  key === "ORIGIN" ? r.steps[0]?.label ?? "" : key === "DEST" ? r.steps[r.steps.length - 1]?.label ?? "" : r.steps.length === 3 ? r.steps[1].label : "";

/**
 * Urut baris tab Jalur per kolom (header bisa diklik, owner 2026-10-09). Seri nama
 * diurut tonase terbesar dulu, jadi "Lembaga A–Z" tetap menampilkan jalur terbesar tiap
 * Lembaga di atas. Jalur tanpa offtaker selalu paling bawah saat diurut per Offtaker —
 * sama dengan Tabel Pohon (bukan nama offtaker yang ikut abjad).
 */
export function sortPathRows(rows: PathRow[], key: PathSortKey, dir: SortDir): PathRow[] {
  const sign = dir === "asc" ? 1 : -1;
  if (key === "TON") return [...rows].sort((a, b) => sign * (a.ton - b.ton) || a.key.localeCompare(b.key));
  const direct = (r: PathRow) => (key === "OFFTAKER" && r.steps.length < 3 ? 1 : 0);
  return [...rows].sort((a, b) => direct(a) - direct(b) || sign * pathStepLabel(a, key).localeCompare(pathStepLabel(b, key), "id") || b.ton - a.ton);
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
  /** `false` = tingkat Offtaker disembunyikan (toggle Offtaker = Sembunyikan); bawaan tampil. */
  withOfftaker?: boolean;
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
      : { nodeId: DIRECT_NODE_ID, level: "OFFTAKER", label: DIRECT_LABEL, sub: "tanpa offtaker", isUl: false, groupCode: null };
    const mill = fromNode(dest, "MILL");
    const ulStep = (u: UlFilter): Step => ({ nodeId: `U:${u}`, level: "UL", label: UL_FILTER_LABEL[u], sub: "", isUl: u === "UL", groupCode: null });
    // Mill tak diketahui tidak punya status UL yang bermakna — sama dengan Sankey, tetap terpisah.
    const portions: [Step | null, number][] =
      opts.byUl && dest.id !== UNKNOWN_MILL_ID ? [[ulStep("UL"), p.toUlTon], [ulStep("NON_UL"), p.ton - p.toUlTon]] : [[null, p.ton]];
    for (const [ul, ton] of portions) {
      if (!(ton > 0)) continue;
      const offStep = opts.withOfftaker === false ? null : off;
      const hulu = [opts.byDistrict ? dist : null, lembaga, offStep, ul, mill];
      const hilir = [ul, mill, offStep, opts.byDistrict ? dist : null, lembaga];
      add((opts.direction === "HULU" ? hulu : hilir).filter((s): s is Step => !!s), ton, p.channel);
    }
  }

  // Urut tonase; "Mill tidak diketahui" & "Langsung ke Mill" selalu paling bawah di tingkatnya;
  // tingkat UL/Mill: yang UL selalu di atas (fokus ke Mill UL, owner 2026-10-17).
  const tail = (n: SupplyTreeNode) => (n.nodeId === UNKNOWN_MILL_ID || n.nodeId === DIRECT_NODE_ID ? 1 : 0);
  const ulRank = (n: SupplyTreeNode) => ((n.level === "UL" || n.level === "MILL") && !tail(n) ? (n.isUl ? 0 : 1) : 0);
  const finish = (m: Map<string, Building>): SupplyTreeNode[] =>
    [...m.values()]
      .map(({ index, ...n }) => ({ ...n, children: finish(index) }))
      .sort((a, b) => tail(a) - tail(b) || ulRank(a) - ulRank(b) || b.ton - a.ton || a.label.localeCompare(b.label));
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
    for (const l of links) {
      let g = groups.get(l[side]);
      if (!g) groups.set(l[side], (g = []));
      g.push(l);
    }
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
  for (const it of items) {
    const k = Math.round(it.x / 8);
    let col = byX.get(k);
    if (!col) byX.set(k, (col = []));
    col.push(it);
  }
  for (const col of byX.values()) {
    col.sort((a, b) => a.y - b.y || a.key.localeCompare(b.key));
    const ys: number[] = [];
    col.forEach((it, i) => ys.push(i === 0 ? it.y : Math.max(it.y, ys[i - 1] + gap)));
    const drift = col.reduce((a, it, i) => a + (ys[i] - it.y), 0) / col.length;
    col.forEach((it, i) => out.set(it.key, { x: it.x, y: ys[i] - drift }));
  }
  return out;
}

/**
 * Titik pada kurva bezier React Flow (sisi kanan → kiri: titik kendali di x tengah,
 * y masing-masing ujung) di posisi `x` — untuk label garis yang melompati kolom
 * (Lembaga langsung ke Mill) agar tidak jatuh di atas kotak kolom tengah.
 */
export function bezierPointAtX(sx: number, sy: number, tx: number, ty: number, x: number): { x: number; y: number } {
  const xm = (sx + tx) / 2;
  const bx = (t: number) => (1 - t) ** 3 * sx + 3 * (1 - t) ** 2 * t * xm + 3 * (1 - t) * t ** 2 * xm + t ** 3 * tx;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (bx(mid) < x) lo = mid;
    else hi = mid;
  }
  const t = (lo + hi) / 2;
  return { x, y: (1 - t) ** 3 * sy + 3 * (1 - t) ** 2 * t * sy + 3 * (1 - t) * t ** 2 * ty + t ** 3 * ty };
}

// ---------------------------------------------------------------------------
// Tambahan tab (owner 2026-10-17: "tambahkan tab sunburst, boleh tab lain"):
// Sunburst · Partisi · Treemap memakai pohon `buildSupplyChainTree`; Matriks ·
// Chord · Batang bertumpuk memakai matriks Asal × Tujuan di bawah ini — semua
// dari `SankeyGraph` yang sama sehingga angkanya identik dengan tab lama.
// ---------------------------------------------------------------------------

/** Kolom Sankey tiap tingkat pohon — agar klik-filter memakai penangan yang sama dengan diagram. */
export const TREE_LEVEL_COLUMN: Record<TreeLevel, 0 | 1 | 3> = { DISTRIK: 0, LEMBAGA: 0, OFFTAKER: 1, UL: 3, MILL: 3 };

/** Node pohon → bentuk node Sankey (klik-filter, isFilterableNode/isGroupNode). */
export const treeNodeAsSankeyNode = (n: SupplyTreeNode): SankeyNode => ({
  id: n.nodeId,
  column: TREE_LEVEL_COLUMN[n.level],
  label: n.label,
  sub: n.sub,
  value: n.ton,
  folded: 0,
  isUl: n.isUl,
  millStatus: null,
  groupCode: n.groupCode,
});

export interface OriginDestMatrix {
  /** Asal (kolom 0 Sankey), urut tonase turun. */
  rows: SankeyNode[];
  /** Tujuan (kolom 3 Sankey), urut tonase turun; "Mill tidak diketahui" selalu terakhir. */
  cols: SankeyNode[];
  /** Tonase per sel, kunci `matrixKey(rowId, colId)`; sel tanpa aliran tidak ada. */
  cells: Map<string, number>;
  rowTotal: Map<string, number>;
  colTotal: Map<string, number>;
  total: number;
  /** Sel terbesar — skala warna/lebar. */
  max: number;
}

export const matrixKey = (rowId: string, colId: string) => `${rowId}|${colId}`;

/** Tukar baris ↔ kolom (Arah Hilir → Hulu di Matriks & Batang): baris = tujuan, kolom = asal. */
export function transposeOriginDestMatrix(m: OriginDestMatrix): OriginDestMatrix {
  const cells = new Map<string, number>();
  for (const r of m.rows)
    for (const c of m.cols) {
      const v = m.cells.get(matrixKey(r.id, c.id));
      if (v !== undefined) cells.set(matrixKey(c.id, r.id), v);
    }
  return { rows: m.cols, cols: m.rows, cells, rowTotal: m.colTotal, colTotal: m.rowTotal, total: m.total, max: m.max };
}

/**
 * Matriks Asal × Tujuan dari jalur Sankey (tingkat offtaker dilipat): dasar
 * tab Matriks (tabel panas), Chord (pita asal ↔ tujuan), dan Batang bertumpuk.
 * Mengikuti toggle Dari/Ke lewat graf yang diberikan (node `D:`/`L:` × `U:`/`M:`).
 */
export function buildOriginDestMatrix(graph: SankeyGraph): OriginDestMatrix {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const cells = new Map<string, number>();
  const rowTotal = new Map<string, number>();
  const colTotal = new Map<string, number>();
  let total = 0;
  for (const p of graph.paths) {
    if (!(p.ton > 0)) continue;
    const r = p.nodes[0];
    const c = p.nodes[p.nodes.length - 1];
    if (!byId.has(r) || !byId.has(c)) continue;
    const k = matrixKey(r, c);
    cells.set(k, (cells.get(k) ?? 0) + p.ton);
    rowTotal.set(r, (rowTotal.get(r) ?? 0) + p.ton);
    colTotal.set(c, (colTotal.get(c) ?? 0) + p.ton);
    total += p.ton;
  }
  const tail = (id: string) => (id === UNKNOWN_MILL_ID ? 1 : 0);
  // Tujuan UL selalu di depan (fokus ke Mill UL, owner 2026-10-17), lalu tonase; Mill tak diketahui terakhir.
  const ulRank = (n: SankeyNode) => (tail(n.id) ? 0 : isUlDestination(n) ? 0 : 1);
  const rows = [...rowTotal.keys()].map((id) => byId.get(id)!).sort((a, b) => rowTotal.get(b.id)! - rowTotal.get(a.id)! || a.label.localeCompare(b.label));
  const cols = [...colTotal.keys()]
    .map((id) => byId.get(id)!)
    .sort((a, b) => tail(a.id) - tail(b.id) || ulRank(a) - ulRank(b) || colTotal.get(b.id)! - colTotal.get(a.id)! || a.label.localeCompare(b.label));
  return { rows, cols, cells, rowTotal, colTotal, total, max: Math.max(0, ...cells.values()) };
}
