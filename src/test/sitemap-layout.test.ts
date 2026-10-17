import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SITEMAP_FILES, parseSitemapMarkdown, type SitemapGraph } from "@/lib/sitemap-mermaid";
import { COLUMN_ORDER, buildSpanningForest, columnLayout, countTree, estimateNodeSize, toDot } from "@/lib/sitemap-layout";

/**
 * Penjaga helper tata letak Peta Fitur (tab Graphviz · Kolom · Pohon · Peta
 * pikiran · Sunburst · Daftar) atas SELURUH diagram `docs/product/sitemap/`:
 * hutan rentang memuat tiap node tepat sekali, DOT valid secara struktur,
 * tata letak kolom tanpa tumpang tindih.
 */
const DIR = join(__dirname, "../../docs/product/sitemap");
const graphs: { where: string; graph: SitemapGraph }[] = SITEMAP_FILES.flatMap((f) => {
  const doc = parseSitemapMarkdown(f.key, readFileSync(join(DIR, f.file), "utf8"));
  return doc.sections.filter((s) => s.graph).map((s) => ({ where: `${f.key} › ${s.heading}`, graph: s.graph! }));
});

describe("buildSpanningForest", () => {
  it("memuat setiap node tepat sekali dan membagi semua edge ke cabang atau rujukan silang", () => {
    for (const { where, graph } of graphs) {
      const forest = buildSpanningForest(graph);
      const total = forest.roots.reduce((acc, r) => acc + countTree(r), 0);
      expect(total, where).toBe(graph.nodes.length);
      const treeEdges = graph.nodes.length - forest.roots.length;
      expect(treeEdges + forest.crossEdges.length, where).toBe(graph.edges.length);
    }
  });

  it("menjadikan node tanpa edge masuk sebagai akar urut dokumen; garis putus-putus tidak merebut node dari induk penuhnya", () => {
    const g: SitemapGraph = {
      nodes: ["a", "b", "c", "d"].map((id) => ({ id, label: id, lines: [id], shape: "rect", classes: [] })),
      edges: [
        { id: "e1", source: "a", target: "c", kind: "dotted" },
        { id: "e2", source: "b", target: "c", kind: "solid" },
        { id: "e3", source: "c", target: "d", kind: "solid" },
      ],
    };
    const f = buildSpanningForest(g);
    expect(f.roots.map((r) => r.node.id)).toEqual(["a", "b"]);
    // Walau `a` dikunjungi dulu, `c` menunggu induk penuhnya (`b`); garis putus-putus `a → c` jadi rujukan silang.
    expect(f.roots[0].children).toEqual([]);
    expect(f.roots[1].children.map((c) => c.node.id)).toEqual(["c"]);
    expect(f.roots[1].children[0].children.map((c) => c.node.id)).toEqual(["d"]);
    expect(f.crossEdges.map((e) => e.id)).toEqual(["e1"]);
  });

  it("node yang hanya tercapai lewat garis putus-putus tetap tersambung (bukan akar baru)", () => {
    const g: SitemapGraph = {
      nodes: ["menu", "pageA", "btn", "pageB"].map((id) => ({ id, label: id, lines: [id], shape: "rect", classes: [] })),
      edges: [
        { id: "e1", source: "menu", target: "pageA", kind: "solid" },
        { id: "e2", source: "pageA", target: "btn", kind: "solid" },
        { id: "e3", source: "btn", target: "pageB", kind: "dotted", label: "Lihat" },
      ],
    };
    const f = buildSpanningForest(g);
    expect(f.roots.map((r) => r.node.id)).toEqual(["menu"]);
    expect(f.roots[0].children[0].children[0].children.map((c) => c.node.id)).toEqual(["pageB"]);
    expect(f.crossEdges).toEqual([]);
  });

  it("menangani siklus tanpa node berderajat-masuk nol", () => {
    const g: SitemapGraph = {
      nodes: ["x", "y"].map((id) => ({ id, label: id, lines: [id], shape: "rect", classes: [] })),
      edges: [
        { id: "e1", source: "x", target: "y", kind: "solid" },
        { id: "e2", source: "y", target: "x", kind: "solid" },
      ],
    };
    const f = buildSpanningForest(g);
    expect(f.roots).toHaveLength(1);
    expect(countTree(f.roots[0])).toBe(2);
    expect(f.crossEdges).toHaveLength(1);
  });
});

describe("toDot", () => {
  it("menulis satu pernyataan per node & edge dengan kurung seimbang dan label ter-escape", () => {
    for (const { where, graph } of graphs) {
      const dot = toDot(graph);
      const lines = dot.split("\n");
      expect(lines[0]).toBe("digraph sitemap {");
      expect(lines.at(-1)).toBe("}");
      const nodeLines = lines.filter((l) => /^ {2}"[\w]+" \[/.test(l));
      const edgeLines = lines.filter((l) => /^ {2}"[\w]+" -> "[\w]+"/.test(l));
      expect(nodeLines.length, where).toBe(graph.nodes.length);
      expect(edgeLines.length, where).toBe(graph.edges.length);
      // Tanda kutip di label harus ter-escape: jumlah `"` yang tidak didahului `\` genap per baris.
      for (const l of lines) expect((l.replace(/\\"/g, "").match(/"/g) ?? []).length % 2, `${where}: ${l}`).toBe(0);
    }
  });

  it("memakai bentuk & palet per class, dashed untuk prototipe", () => {
    const g: SitemapGraph = {
      nodes: [
        { id: "m", label: "Menu", lines: ["Menu"], shape: "stadium", classes: ["menu"] },
        { id: "p", label: 'Say "hi"', lines: ['Say "hi"'], shape: "rect", classes: ["page", "proto"] },
      ],
      edges: [{ id: "e", source: "m", target: "p", kind: "dotted", label: "Lihat" }],
    };
    const dot = toDot(g);
    expect(dot).toContain('"m" [label="Menu", shape=box, style="rounded,filled"');
    expect(dot).toContain('fillcolor="#166534"');
    expect(dot).toContain('"p" [label="Say \\"hi\\"", shape=box, style="filled,dashed"');
    expect(dot).toContain('"m" -> "p" [label="Lihat", style="dashed"];');
  });
});

describe("columnLayout", () => {
  it("menempatkan semua node, kolom urut kiri → kanan, tanpa tumpang tindih vertikal dalam kolom", () => {
    for (const { where, graph } of graphs) {
      const lay = columnLayout(graph);
      expect(lay.nodes.length, where).toBe(graph.nodes.length);
      const xs = lay.columns.map((c) => c.x);
      expect([...xs].sort((a, b) => a - b), where).toEqual(xs);
      const order = lay.columns.map((c) => c.cls);
      expect(order, where).toEqual(COLUMN_ORDER.filter((c) => order.includes(c)));
      for (const col of lay.columns) {
        const inCol = lay.nodes.filter((n) => n.cls === col.cls).sort((a, b) => a.y - b.y);
        for (let i = 1; i < inCol.length; i++) expect(inCol[i].y, `${where}: ${col.cls}`).toBeGreaterThanOrEqual(inCol[i - 1].y + inCol[i - 1].height);
      }
    }
  });
});

describe("estimateNodeSize", () => {
  it("melebar dengan teks, dibatasi 440 px, dan bentuk ber-clip-path diberi ruang ekstra", () => {
    const short = estimateNodeSize({ id: "a", label: "Ab", lines: ["Ab"], shape: "rect", classes: ["page"] });
    const long = estimateNodeSize({ id: "b", label: "x".repeat(200), lines: ["x".repeat(200)], shape: "rect", classes: ["content"] });
    expect(short.width).toBe(120);
    expect(long.width).toBe(440);
    expect(long.height).toBeGreaterThan(short.height);
    const diamond = estimateNodeSize({ id: "c", label: "Ya?", lines: ["Ya?"], shape: "diamond", classes: [] });
    expect(diamond.width).toBeGreaterThan(short.width);
  });
});
