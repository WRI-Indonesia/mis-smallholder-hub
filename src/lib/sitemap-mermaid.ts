/**
 * Peta Fitur (Platform Developer › Peta Fitur) — parser murni untuk
 * `docs/product/sitemap/*.md`: memecah Markdown per bagian `##`, mengambil blok
 * ```mermaid, dan mem-parse subset `flowchart LR` yang dipakai sitemap
 * (konvensi `docs/product/sitemap/legend.md`) menjadi graf node/edge untuk tab
 * React Flow. Tab Mermaid memakai teks bloknya apa adanya.
 *
 * Tanpa import `.md` di sini supaya bisa diuji vitest (pola `release-plan.ts`
 * vs `release-plan-data.ts`); pemuat berkasnya ada di `sitemap-data.ts`.
 */

/** Berkas sitemap yang ditampilkan, urut episode (README sitemap). */
export const SITEMAP_FILES = [
  { key: "overview", file: "overview.md" },
  { key: "master-data", file: "master-data.md" },
  { key: "bulk-upload", file: "bulk-upload.md" },
  { key: "dashboard", file: "dashboard.md" },
  { key: "map", file: "map.md" },
  { key: "report", file: "report.md" },
  { key: "data-analyst", file: "data-analyst.md" },
  { key: "tools", file: "tools.md" },
  { key: "settings", file: "settings.md" },
  { key: "platform-developer", file: "platform-developer.md" },
  { key: "help", file: "help.md" },
] as const;

export type SitemapFileKey = (typeof SITEMAP_FILES)[number]["key"];

/** Awalan id node → berkas asal (legend.md §Penamaan). */
export const SITEMAP_ID_PREFIX: Record<string, SitemapFileKey> = {
  ov: "overview",
  md: "master-data",
  bu: "bulk-upload",
  db: "dashboard",
  mp: "map",
  rp: "report",
  da: "data-analyst",
  tl: "tools",
  st: "settings",
  pd: "platform-developer",
  hp: "help",
};

export type SitemapShape =
  | "stadium"
  | "subroutine"
  | "rect"
  | "rounded"
  | "hexagon"
  | "diamond"
  | "cylinder"
  | "parallelogram";

export type SitemapEdgeKind = "solid" | "dotted" | "thick";

export interface SitemapNode {
  id: string;
  /** Label mentah tanpa `<br/>` — baris dipisah `\n`. */
  label: string;
  lines: string[];
  shape: SitemapShape;
  classes: string[];
}

export interface SitemapEdge {
  id: string;
  source: string;
  target: string;
  kind: SitemapEdgeKind;
  label?: string;
}

export interface SitemapGraph {
  nodes: SitemapNode[];
  edges: SitemapEdge[];
}

export interface SitemapTable {
  header: string[];
  rows: string[][];
}

export interface SitemapSection {
  heading: string;
  /** Slug untuk anchor daftar isi. */
  slug: string;
  mermaid: string | null;
  graph: SitemapGraph | null;
  table: SitemapTable | null;
  /** Paragraf & daftar bernomor setelah diagram (Markdown ringan sudah dipolos). */
  notes: string[];
}

export interface SitemapDoc {
  key: SitemapFileKey;
  title: string;
  summary: string;
  sections: SitemapSection[];
}

/** Palet legend.md — dipakai node React Flow (classDef di blok Mermaid untuk tab Mermaid). */
export const SITEMAP_CLASS_STYLE: Record<
  string,
  { fill: string; stroke: string; color: string; bold?: boolean; dashed?: boolean }
> = {
  menu: { fill: "#166534", stroke: "#14532d", color: "#ffffff", bold: true },
  sub: { fill: "#dcfce7", stroke: "#166534", color: "#14532d" },
  page: { fill: "#dbeafe", stroke: "#1d4ed8", color: "#1e3a8a", bold: true },
  section: { fill: "#fef9c3", stroke: "#ca8a04", color: "#713f12" },
  content: { fill: "#f8fafc", stroke: "#94a3b8", color: "#0f172a" },
  dialog: { fill: "#fce7f3", stroke: "#be185d", color: "#831843" },
  decision: { fill: "#ffedd5", stroke: "#ea580c", color: "#7c2d12" },
  data: { fill: "#ede9fe", stroke: "#6d28d9", color: "#4c1d95" },
  external: { fill: "#e0f2fe", stroke: "#0369a1", color: "#0c4a6e" },
  planned: { fill: "#f1f5f9", stroke: "#94a3b8", color: "#64748b", dashed: true },
  proto: { fill: "", stroke: "", color: "", dashed: true },
};

export const SITEMAP_KNOWN_CLASSES = Object.keys(SITEMAP_CLASS_STYLE);

/** Bentuk bawaan bila node tak ber-class: menentukan warna dari bentuk saja. */
export const SHAPE_DEFAULT_CLASS: Record<SitemapShape, string> = {
  stadium: "menu",
  subroutine: "sub",
  rect: "content",
  rounded: "section",
  hexagon: "dialog",
  diamond: "decision",
  cylinder: "data",
  parallelogram: "external",
};

/** Class utama node (penentu warna): class pertama yang dikenal selain `proto`, kalau tidak dari bentuk. */
export function primaryClass(node: SitemapNode): string {
  return node.classes.find((c) => c !== "proto" && c in SITEMAP_CLASS_STYLE) ?? SHAPE_DEFAULT_CLASS[node.shape];
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

/** Buang Markdown inline ringan: `kode`, **tebal**, [teks](url). */
export function plainInline(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .trim();
}

// ─── Mermaid subset ──────────────────────────────────────────────────────────

const OPENERS: [string, string, SitemapShape][] = [
  ["([", "])", "stadium"],
  ["[[", "]]", "subroutine"],
  ["[(", ")]", "cylinder"],
  ["[/", "/]", "parallelogram"],
  ["{{", "}}", "hexagon"],
  ["[", "]", "rect"],
  ["(", ")", "rounded"],
  ["{", "}", "diamond"],
];

const ID_RE = /^[A-Za-z][\w]*/;
const EDGE_RE = /\s*(-\.->|==>|-->)\s*(?:\|([^|]*)\|)?\s*/g;

function decodeLabel(raw: string): string {
  return raw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/#quot;/g, '"')
    .replace(/&amp;/g, "&")
    .trim();
}

interface Segment {
  id: string;
  label?: string;
  shape?: SitemapShape;
  classes: string[];
}

/** Pecah dengan pemisah hanya di luar tanda kutip (label boleh memuat `&`). */
function splitOutsideQuotes(text: string, sep: string): string[] {
  const out: string[] = [];
  let buf = "";
  let inQuote = false;
  for (const ch of text) {
    if (ch === '"') inQuote = !inQuote;
    if (ch === sep && !inQuote) {
      out.push(buf);
      buf = "";
    } else buf += ch;
  }
  out.push(buf);
  return out;
}

/** Satu ruas antara operator edge: `id`, `id:::cls`, atau `id["label"]:::cls`. */
function parseSegment(seg: string, where: string): Segment {
  const s = seg.trim();
  const idMatch = ID_RE.exec(s);
  if (!idMatch) throw new Error(`${where}: ruas tidak diawali id node: "${s}"`);
  const id = idMatch[0];
  let rest = s.slice(id.length).trim();
  const out: Segment = { id, classes: [] };
  for (const [open, close, shape] of OPENERS) {
    if (!rest.startsWith(open)) continue;
    const afterOpen = rest.slice(open.length).trimStart();
    if (!afterOpen.startsWith('"')) throw new Error(`${where}: label node ${id} harus dalam tanda kutip ganda`);
    const endQuote = afterOpen.indexOf('"', 1);
    if (endQuote === -1) throw new Error(`${where}: tanda kutip label ${id} tidak ditutup`);
    const label = afterOpen.slice(1, endQuote);
    const afterLabel = afterOpen.slice(endQuote + 1).trimStart();
    if (!afterLabel.startsWith(close)) throw new Error(`${where}: penutup bentuk ${id} harus "${close}"`);
    out.label = decodeLabel(label);
    out.shape = shape;
    rest = afterLabel.slice(close.length).trim();
    break;
  }
  if (rest.startsWith(":::")) {
    out.classes = rest.slice(3).split(",").map((c) => c.trim()).filter(Boolean);
    rest = "";
  }
  if (rest) throw new Error(`${where}: sisa teks tak dikenal setelah node ${id}: "${rest}"`);
  return out;
}

/**
 * Parse subset flowchart sitemap. Dilempar Error bila ada sintaks di luar
 * subset — test `sitemap-mermaid.test.ts` menjaga semua blok di docs lolos.
 */
export function parseMermaidFlowchart(src: string): SitemapGraph {
  const nodes = new Map<string, SitemapNode>();
  const edges: SitemapEdge[] = [];
  const pendingClasses: { ids: string[]; classes: string[] }[] = [];

  const upsert = (seg: Segment, where: string) => {
    const existing = nodes.get(seg.id);
    if (existing && existing.lines.length === 0 && seg.label !== undefined) {
      // Dirujuk lebih dulu (mis. di rantai edge), baru didefinisikan.
      existing.label = seg.label;
      existing.lines = seg.label.split("\n");
      existing.shape = seg.shape ?? "rect";
      for (const c of seg.classes) if (!existing.classes.includes(c)) existing.classes.push(c);
      return;
    }
    if (existing) {
      if (seg.label !== undefined && seg.label !== existing.label)
        throw new Error(`${where}: node ${seg.id} didefinisikan dua kali dengan label berbeda`);
      for (const c of seg.classes) if (!existing.classes.includes(c)) existing.classes.push(c);
      return;
    }
    if (seg.label === undefined) {
      // Referensi sebelum definisi — simpan dulu, dicek di akhir.
      nodes.set(seg.id, { id: seg.id, label: "", lines: [], shape: "rect", classes: [...seg.classes] });
      return;
    }
    nodes.set(seg.id, {
      id: seg.id,
      label: seg.label,
      lines: seg.label.split("\n"),
      shape: seg.shape ?? "rect",
      classes: [...seg.classes],
    });
  };

  const lines = src.split("\n");
  let sawHeader = false;
  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();
    const where = `baris ${idx + 1}`;
    if (!line || line.startsWith("%%")) return;
    if (/^(flowchart|graph)\s+(LR|TD|TB|RL|BT)\b/.test(line)) {
      sawHeader = true;
      return;
    }
    if (!sawHeader) throw new Error(`${where}: blok harus diawali "flowchart LR"`);
    if (/^(classDef|linkStyle|style)\b/.test(line)) return;
    if (/^class\s/.test(line)) {
      const m = /^class\s+([\w,\s]+?)\s+([\w,]+)$/.exec(line);
      if (!m) throw new Error(`${where}: pernyataan class tidak dikenal: "${line}"`);
      pendingClasses.push({
        ids: m[1].split(",").map((s) => s.trim()).filter(Boolean),
        classes: m[2].split(",").map((s) => s.trim()).filter(Boolean),
      });
      return;
    }
    if (/^(subgraph|end|click|direction)\b/.test(line)) throw new Error(`${where}: "${line.split(" ")[0]}" di luar subset sitemap`);

    // Pecah menjadi ruas node dan operator edge.
    const segments: string[] = [];
    const ops: { kind: SitemapEdgeKind; label?: string }[] = [];
    let last = 0;
    EDGE_RE.lastIndex = 0;
    for (let m = EDGE_RE.exec(line); m; m = EDGE_RE.exec(line)) {
      // Operator di dalam tanda kutip label node bukan edge.
      const before = line.slice(0, m.index);
      if ((before.match(/"/g) ?? []).length % 2 === 1) continue;
      segments.push(line.slice(last, m.index));
      ops.push({
        kind: m[1] === "-.->" ? "dotted" : m[1] === "==>" ? "thick" : "solid",
        label: m[2]?.trim() || undefined,
      });
      last = m.index + m[0].length;
    }
    segments.push(line.slice(last));

    const parsed = segments.map((s) => {
      const parts = splitOutsideQuotes(s, "&").map((p) => p.trim()).filter(Boolean);
      if (parts.length === 0) throw new Error(`${where}: ruas kosong di "${line}"`);
      return parts.map((p) => parseSegment(p, where));
    });
    parsed.flat().forEach((seg) => upsert(seg, where));
    ops.forEach((op, i) => {
      for (const from of parsed[i])
        for (const to of parsed[i + 1])
          edges.push({ id: `e${edges.length}-${from.id}-${to.id}`, source: from.id, target: to.id, kind: op.kind, label: op.label });
    });
  });

  for (const pc of pendingClasses)
    for (const id of pc.ids) {
      const n = nodes.get(id);
      if (!n) throw new Error(`pernyataan class merujuk node yang tidak ada: ${id}`);
      for (const c of pc.classes) if (!n.classes.includes(c)) n.classes.push(c);
    }

  const undefinedIds = [...nodes.values()].filter((n) => n.lines.length === 0).map((n) => n.id);
  if (undefinedIds.length) throw new Error(`node dirujuk tanpa definisi label: ${undefinedIds.join(", ")}`);

  return { nodes: [...nodes.values()], edges };
}

// ─── Markdown sitemap ────────────────────────────────────────────────────────

function parseTable(lines: string[]): SitemapTable | null {
  const rows = lines.filter((l) => l.trim().startsWith("|"));
  if (rows.length < 2) return null;
  const cells = (l: string) =>
    l
      .trim()
      .replace(/^\||\|$/g, "")
      .split("|")
      .map((c) => plainInline(c));
  const header = cells(rows[0]);
  const body = rows.slice(1).filter((l) => !/^\|?\s*:?-{2,}/.test(l.trim()));
  return { header, rows: body.map(cells) };
}

/** Parse satu berkas `docs/product/sitemap/<menu>.md`. */
export function parseSitemapMarkdown(key: SitemapFileKey, md: string): SitemapDoc {
  const lines = md.split("\n");
  let title: string = key;
  let summary = "";
  const sections: SitemapSection[] = [];
  let cur: { heading: string; body: string[] } | null = null;

  for (const line of lines) {
    if (line.startsWith("# ")) {
      title = plainInline(line.slice(2).replace(/^Peta Fitur\s+—\s+/, ""));
      continue;
    }
    if (line.startsWith("> **Ringkasan:**")) {
      summary = plainInline(line.replace(/^> \*\*Ringkasan:\*\*\s*/, ""));
      continue;
    }
    if (line.startsWith("## ")) {
      if (cur) sections.push(finishSection(cur));
      cur = { heading: plainInline(line.slice(3)), body: [] };
      continue;
    }
    if (cur) cur.body.push(line);
  }
  if (cur) sections.push(finishSection(cur));
  return { key, title, summary, sections };
}

function finishSection(cur: { heading: string; body: string[] }): SitemapSection {
  let mermaid: string | null = null;
  const tableLines: string[] = [];
  const notes: string[] = [];
  let inMermaid = false;
  let inOtherFence = false;
  const buf: string[] = [];
  for (const line of cur.body) {
    if (inMermaid) {
      if (line.startsWith("```")) {
        inMermaid = false;
        if (mermaid === null) mermaid = buf.join("\n");
        buf.length = 0;
      } else buf.push(line);
      continue;
    }
    if (inOtherFence) {
      if (line.startsWith("```")) inOtherFence = false;
      continue;
    }
    if (line.startsWith("```mermaid")) {
      inMermaid = true;
      continue;
    }
    if (line.startsWith("```")) {
      inOtherFence = true;
      continue;
    }
    if (line.trim().startsWith("|")) {
      tableLines.push(line);
      continue;
    }
    const t = line.trim();
    if (!t || t.startsWith(">")) continue;
    notes.push(plainInline(t));
  }
  let graph: SitemapGraph | null = null;
  if (mermaid !== null) {
    try {
      graph = parseMermaidFlowchart(mermaid);
    } catch {
      graph = null; // tab Mermaid tetap tampil; React Flow menampilkan pesan — dijaga test agar tak terjadi
    }
  }
  return {
    heading: cur.heading,
    slug: slugify(cur.heading),
    mermaid,
    graph,
    table: parseTable(tableLines),
    notes,
  };
}

/**
 * Pemeriksaan lintas berkas untuk test: setiap node ber-awalan kode menu lain
 * harus didefinisikan (dengan label yang sama) di berkas asalnya.
 */
export function crossFileIssues(docs: SitemapDoc[]): string[] {
  const home = new Map<string, { key: string; label: string }>();
  for (const d of docs)
    for (const s of d.sections)
      for (const n of s.graph?.nodes ?? []) {
        const prefix = n.id.split("_")[0];
        if (SITEMAP_ID_PREFIX[prefix] === d.key && !home.has(n.id)) home.set(n.id, { key: d.key, label: n.label });
      }
  const issues: string[] = [];
  for (const d of docs)
    for (const s of d.sections)
      for (const n of s.graph?.nodes ?? []) {
        const prefix = n.id.split("_")[0];
        const owner = SITEMAP_ID_PREFIX[prefix];
        if (!owner || owner === d.key) continue;
        const h = home.get(n.id);
        if (!h) issues.push(`${d.key} › ${s.heading}: ${n.id} tidak didefinisikan di ${owner}.md`);
        else if (h.label !== n.label) issues.push(`${d.key} › ${s.heading}: label ${n.id} "${n.label}" ≠ ${owner}.md "${h.label}"`);
      }
  return issues;
}
