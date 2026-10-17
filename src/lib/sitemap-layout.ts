import { SITEMAP_CLASS_STYLE, primaryClass, type SitemapEdge, type SitemapGraph, type SitemapNode, type SitemapShape } from "./sitemap-mermaid";

/**
 * Peta Fitur — helper tata letak **murni** (tanpa DOM/pustaka gambar) yang
 * dipakai bersama oleh tab-tab non-Mermaid: ukuran node taksiran (dagre/ELK/
 * kolom), hutan rentang (pohon · peta pikiran · sunburst · daftar), DOT untuk
 * Graphviz, dan tata letak kolom per jenis. Dipisah dari komponen agar bisa
 * diuji vitest atas seluruh `docs/product/sitemap/*.md` (`sitemap-layout.test.ts`).
 */

export interface NodeSize {
  width: number;
  height: number;
}

/** Lebar/tinggi node ditaksir dari teksnya — mesin tata letak butuh ukuran sebelum render. */
export function estimateNodeSize(n: SitemapNode): NodeSize {
  const longest = Math.max(...n.lines.map((l) => l.length), 4);
  const cls = primaryClass(n);
  const charW = cls === "content" ? 6.4 : 7.2;
  const width = Math.min(440, Math.max(120, Math.round(longest * charW) + 36));
  // Baris panjang melipat di lebar maksimum.
  const wrapped = n.lines.reduce((acc, l) => acc + Math.max(1, Math.ceil((l.length * charW) / (width - 36))), 0);
  const height = wrapped * 18 + 22;
  // Bentuk ber-clip-path memotong sudut — beri ruang ekstra agar teks tidak terpotong.
  if (n.shape === "diamond") return { width: Math.round(width * 1.7), height: Math.round(height * 2.2) };
  if (n.shape === "hexagon") return { width: width + 48, height: height + 8 };
  if (n.shape === "parallelogram") return { width: width + 32, height };
  return { width, height };
}

/** Taksiran kotak label edge (font 11 px) — dagre/ELK menyisakan ruang agar label tak menimpa garis. */
export function estimateEdgeLabelSize(label: string): NodeSize {
  return { width: Math.round(label.length * 6.2) + 8, height: 16 };
}

// ─── Hutan rentang ───────────────────────────────────────────────────────────

export interface SitemapTreeNode {
  node: SitemapNode;
  /** Edge yang membawa ke node ini (kosong untuk akar). */
  via?: SitemapEdge;
  children: SitemapTreeNode[];
}

export interface SitemapForest {
  roots: SitemapTreeNode[];
  /** Edge yang tidak jadi cabang pohon (target sudah punya induk) — digambar sebagai rujukan silang. */
  crossEdges: SitemapEdge[];
}

/**
 * Ubah graf berarah menjadi hutan: akar = node tanpa edge masuk (urutan
 * dokumen). **Dua lintasan**: (1) DFS hanya lewat garis penuh/tebal — struktur
 * "berisi"; (2) node yang belum punya induk disambungkan lewat garis putus-putus
 * (pindah halaman) dari node yang sudah terpasang, lalu DFS garis penuh dari
 * sana. Garis putus-putus tidak pernah merebut node dari induk penuhnya
 * (review 2026-10-17). Node yang hanya tercapai lewat siklus jadi akar
 * tambahan. Setiap node muncul tepat satu kali; edge sisa = `crossEdges`.
 */
export function buildSpanningForest(graph: SitemapGraph): SitemapForest {
  const indeg = new Map<string, number>(graph.nodes.map((n) => [n.id, 0]));
  for (const e of graph.edges) indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1);
  const out = new Map<string, SitemapEdge[]>();
  for (const e of graph.edges) {
    if (!out.has(e.source)) out.set(e.source, []);
    out.get(e.source)!.push(e);
  }

  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const tnOf = new Map<string, SitemapTreeNode>();
  const usedEdges = new Set<string>();
  const roots: SitemapTreeNode[] = [];

  const place = (id: string, via?: SitemapEdge): SitemapTreeNode => {
    const tn: SitemapTreeNode = { node: byId.get(id)!, via, children: [] };
    tnOf.set(id, tn);
    return tn;
  };
  /** Lintasan 1: hanya garis penuh/tebal. */
  const dfsSolid = (id: string) => {
    for (const e of out.get(id) ?? []) {
      if (e.kind === "dotted" || tnOf.has(e.target)) continue;
      usedEdges.add(e.id);
      tnOf.get(id)!.children.push(place(e.target, e));
      dfsSolid(e.target);
    }
  };
  /** Lintasan 2: sambungkan node tanpa induk lewat garis putus-putus, ulangi sampai tak ada perubahan. */
  const attachDotted = () => {
    let changed = true;
    while (changed) {
      changed = false;
      for (const n of graph.nodes) {
        if (!tnOf.has(n.id)) continue;
        for (const e of out.get(n.id) ?? []) {
          if (e.kind !== "dotted" || tnOf.has(e.target)) continue;
          usedEdges.add(e.id);
          tnOf.get(n.id)!.children.push(place(e.target, e));
          dfsSolid(e.target);
          changed = true;
        }
      }
    }
  };

  for (const n of graph.nodes)
    if ((indeg.get(n.id) ?? 0) === 0 && !tnOf.has(n.id)) {
      roots.push(place(n.id));
      dfsSolid(n.id);
    }
  attachDotted();
  // Komponen bersiklus tanpa node berderajat-masuk nol.
  for (const n of graph.nodes)
    if (!tnOf.has(n.id)) {
      roots.push(place(n.id));
      dfsSolid(n.id);
      attachDotted();
    }

  return { roots, crossEdges: graph.edges.filter((e) => !usedEdges.has(e.id)) };
}

/** Jumlah node dalam sebuah pohon (termasuk akarnya). */
export function countTree(t: SitemapTreeNode): number {
  return 1 + t.children.reduce((acc, c) => acc + countTree(c), 0);
}

// ─── Graphviz DOT ────────────────────────────────────────────────────────────

const DOT_SHAPE: Record<SitemapShape, string> = {
  stadium: 'shape=box, style="rounded,filled", margin="0.25,0.12"',
  subroutine: 'shape=box, style="filled", peripheries=2',
  rect: 'shape=box, style="filled"',
  rounded: 'shape=box, style="rounded,filled"',
  hexagon: 'shape=hexagon, style="filled"',
  diamond: 'shape=diamond, style="filled"',
  cylinder: 'shape=cylinder, style="filled"',
  parallelogram: 'shape=parallelogram, style="filled"',
};

function dotEscape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * Graf → DOT (rankdir LR) dengan bentuk & palet `legend.md`. Label Isi rata
 * kiri (`\l`), node lain di tengah. Rujukan silang tetap edge biasa — Graphviz
 * merutekan spline melingkari node, itulah nilai tab ini.
 */
export function toDot(graph: SitemapGraph): string {
  const lines: string[] = [
    "digraph sitemap {",
    '  graph [rankdir=LR, bgcolor="transparent", nodesep=0.3, ranksep=0.7, splines=spline, fontname="Helvetica"];',
    '  node [fontname="Helvetica", fontsize=11, penwidth=1.2];',
    '  edge [fontname="Helvetica", fontsize=9, color="#64748b", fontcolor="#334155", arrowsize=0.7];',
  ];
  for (const n of graph.nodes) {
    const cls = primaryClass(n);
    const style = SITEMAP_CLASS_STYLE[cls] ?? SITEMAP_CLASS_STYLE.content;
    const dashed = n.classes.includes("proto") || n.classes.includes("planned");
    const base = dashed ? DOT_SHAPE[n.shape].replace(/style="([^"]*)"/, 'style="$1,dashed"') : DOT_SHAPE[n.shape];
    const label =
      cls === "content"
        ? n.lines.map((l) => dotEscape(l) + "\\l").join("")
        : n.lines.map(dotEscape).join("\\n");
    const bold = cls === "menu" || cls === "page" ? ', fontname="Helvetica-Bold"' : "";
    lines.push(
      `  "${n.id}" [label="${label}", ${base}, fillcolor="${style.fill}", color="${style.stroke}", fontcolor="${style.color}"${bold}];`
    );
  }
  for (const e of graph.edges) {
    const attrs: string[] = [];
    if (e.label) attrs.push(`label="${dotEscape(e.label)}"`);
    if (e.kind === "dotted") attrs.push('style="dashed"');
    if (e.kind === "thick") attrs.push("penwidth=2.2");
    lines.push(`  "${e.source}" -> "${e.target}"${attrs.length ? ` [${attrs.join(", ")}]` : ""};`);
  }
  lines.push("}");
  return lines.join("\n");
}

// ─── Kolom per jenis ─────────────────────────────────────────────────────────

/** Urutan kolom kiri → kanan = urutan baca Menu → Sub menu → Halaman → Bagian → Isi, lalu pelengkap. */
export const COLUMN_ORDER = ["menu", "sub", "page", "section", "content", "dialog", "decision", "data", "external", "planned"] as const;

export interface ColumnLayoutNode {
  id: string;
  cls: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ColumnLayoutColumn {
  cls: string;
  x: number;
  width: number;
}

export interface ColumnLayout {
  nodes: ColumnLayoutNode[];
  columns: ColumnLayoutColumn[];
  width: number;
  height: number;
}

const COL_GAP = 90;
const ROW_GAP = 14;
const HEADER_H = 36;

/**
 * Tata letak kolom tetap per jenis node. Urutan vertikal dalam kolom: dua
 * lintasan barycenter (rata-rata y induk) agar garis antarkolom sesedikit
 * mungkin bersilang, dengan urutan dokumen sebagai pemecah seri. Node yang
 * jenisnya tak ada di `COLUMN_ORDER` masuk kolom `content`.
 */
export function columnLayout(graph: SitemapGraph): ColumnLayout {
  const cols = new Map<string, SitemapNode[]>();
  const clsOf = new Map<string, string>();
  for (const n of graph.nodes) {
    const c0 = primaryClass(n);
    const cls = (COLUMN_ORDER as readonly string[]).includes(c0) ? c0 : "content";
    clsOf.set(n.id, cls);
    if (!cols.has(cls)) cols.set(cls, []);
    cols.get(cls)!.push(n);
  }
  const order = COLUMN_ORDER.filter((c) => cols.has(c));
  const sizes = new Map(graph.nodes.map((n) => [n.id, estimateNodeSize(n)]));
  const preds = new Map<string, string[]>();
  for (const e of graph.edges) {
    if (!preds.has(e.target)) preds.set(e.target, []);
    preds.get(e.target)!.push(e.source);
  }
  const docIndex = new Map(graph.nodes.map((n, i) => [n.id, i]));

  // Posisi y sementara: urutan dokumen, lalu diperhalus barycenter per kolom (kiri → kanan, 2×).
  const yOf = new Map<string, number>();
  const place = (cls: string) => {
    let y = HEADER_H;
    for (const n of cols.get(cls)!) {
      const s = sizes.get(n.id)!;
      yOf.set(n.id, y + s.height / 2);
      y += s.height + ROW_GAP;
    }
  };
  for (const c of order) place(c);
  for (let pass = 0; pass < 2; pass++)
    for (const c of order) {
      const list = cols.get(c)!;
      const key = (n: SitemapNode) => {
        const ps = (preds.get(n.id) ?? []).filter((p) => clsOf.get(p) !== c);
        if (!ps.length) return yOf.get(n.id)!;
        return ps.reduce((acc, p) => acc + yOf.get(p)!, 0) / ps.length;
      };
      list.sort((a, b) => key(a) - key(b) || docIndex.get(a.id)! - docIndex.get(b.id)!);
      place(c);
    }

  const columns: ColumnLayoutColumn[] = [];
  const nodes: ColumnLayoutNode[] = [];
  let x = 0;
  let height = 0;
  for (const c of order) {
    const list = cols.get(c)!;
    const colW = Math.max(...list.map((n) => sizes.get(n.id)!.width));
    columns.push({ cls: c, x, width: colW });
    for (const n of list) {
      const s = sizes.get(n.id)!;
      nodes.push({ id: n.id, cls: c, x: x + (colW - s.width) / 2, y: yOf.get(n.id)! - s.height / 2, width: s.width, height: s.height });
      height = Math.max(height, yOf.get(n.id)! + s.height / 2);
    }
    x += colW + COL_GAP;
  }
  return { nodes, columns, width: Math.max(0, x - COL_GAP), height };
}
