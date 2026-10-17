import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SITEMAP_FILES,
  SITEMAP_KNOWN_CLASSES,
  crossFileIssues,
  parseMermaidFlowchart,
  parseSitemapMarkdown,
  primaryClass,
} from "@/lib/sitemap-mermaid";

/**
 * Penjaga Peta Fitur (Platform Developer › Peta Fitur): semua blok Mermaid di
 * `docs/product/sitemap/*.md` harus lolos parser subset (tab React Flow) dan
 * konsisten lintas berkas. Tanpa ini, diagram yang rusak baru terlihat di
 * halaman aplikasi — tidak ada test lain yang membaca sintaks Mermaid.
 */
const DIR = join(__dirname, "../../docs/product/sitemap");
const docs = SITEMAP_FILES.map((f) => parseSitemapMarkdown(f.key, readFileSync(join(DIR, f.file), "utf8")));

describe("parser subset flowchart", () => {
  it("mengenali delapan bentuk node, class, dan tiga jenis edge berlabel", () => {
    const g = parseMermaidFlowchart(`
      %%{init: {"flowchart": {"wrappingWidth": 420}}}%%
      flowchart LR
        a(["Menu"]):::menu
        b[["Sub"]]:::sub
        c["Page"]:::page
        d("Section"):::section
        e["Baris 1<br/>Baris 2"]:::content
        f{{"Dialog"}}:::dialog
        g{"Tanya?"}:::decision
        h[("Data")]:::data
        i[/"Luar"/]:::external
        a --> b --> c
        c -.->|Lihat| d
        d ==>|Generate| h
        c --> e & f
        class c,g proto
        classDef menu fill:#166534
    `);
    const byId = Object.fromEntries(g.nodes.map((n) => [n.id, n]));
    expect(Object.keys(byId)).toHaveLength(9);
    expect(byId.a.shape).toBe("stadium");
    expect(byId.b.shape).toBe("subroutine");
    expect(byId.d.shape).toBe("rounded");
    expect(byId.f.shape).toBe("hexagon");
    expect(byId.g.shape).toBe("diamond");
    expect(byId.h.shape).toBe("cylinder");
    expect(byId.i.shape).toBe("parallelogram");
    expect(byId.e.lines).toEqual(["Baris 1", "Baris 2"]);
    expect(byId.c.classes).toEqual(["page", "proto"]);
    expect(primaryClass(byId.c)).toBe("page");
    expect(g.edges.map((e) => [e.source, e.target, e.kind, e.label])).toEqual([
      ["a", "b", "solid", undefined],
      ["b", "c", "solid", undefined],
      ["c", "d", "dotted", "Lihat"],
      ["d", "h", "thick", "Generate"],
      ["c", "e", "solid", undefined],
      ["c", "f", "solid", undefined],
    ]);
  });

  it("menolak label tanpa kutip, rujukan tanpa definisi, dan subgraph", () => {
    expect(() => parseMermaidFlowchart("flowchart LR\n  a[Tanpa kutip]")).toThrow(/tanda kutip/);
    expect(() => parseMermaidFlowchart('flowchart LR\n  a["A"] --> b')).toThrow(/tanpa definisi/);
    expect(() => parseMermaidFlowchart('flowchart LR\n  subgraph x\n  a["A"]\n  end')).toThrow(/subset/);
    expect(() => parseMermaidFlowchart('a["A"]')).toThrow(/flowchart LR/);
  });

  it("operator panah di dalam label node bukan edge", () => {
    const g = parseMermaidFlowchart('flowchart LR\n  a["Tombol: Panduan --> Bantuan"] --> b["B"]');
    expect(g.nodes[0].label).toBe("Tombol: Panduan --> Bantuan");
    expect(g.edges).toHaveLength(1);
  });
});

describe("docs/product/sitemap — isi", () => {
  it("daftar berkas di SITEMAP_FILES = berkas ber-diagram di folder", () => {
    const withDiagram = readdirSync(DIR)
      .filter((f) => f.endsWith(".md") && readFileSync(join(DIR, f), "utf8").includes("```mermaid"))
      .sort();
    expect(withDiagram).toEqual([...SITEMAP_FILES.map((f) => f.file)].sort());
    expect(existsSync(join(DIR, "README.md")) && existsSync(join(DIR, "legend.md"))).toBe(true);
  });

  it.each(SITEMAP_FILES.map((f) => f.key))("%s: judul, ringkasan, pohon navigasi, dan tiap blok Mermaid lolos parser", (key) => {
    const doc = docs.find((d) => d.key === key)!;
    expect(doc.title).not.toBe("");
    expect(doc.summary).not.toBe("");
    expect(doc.sections.some((s) => /pohon navigasi|wilayah halaman/i.test(s.heading))).toBe(true);
    const md = readFileSync(join(DIR, `${key}.md`), "utf8");
    const blocks = md.split("```mermaid").length - 1;
    const withGraph = doc.sections.filter((s) => s.mermaid !== null);
    expect(withGraph.length, "satu diagram per bagian ##").toBe(blocks);
    for (const s of withGraph) {
      // Panggil langsung supaya pesan galat parser ikut tampil.
      const g = parseMermaidFlowchart(s.mermaid!);
      expect(s.graph, `${key} › ${s.heading}`).not.toBeNull();
      const ids = new Set(g.nodes.map((n) => n.id));
      for (const e of g.edges) {
        expect(ids.has(e.source), `${key} › ${s.heading}: ${e.source}`).toBe(true);
        expect(ids.has(e.target), `${key} › ${s.heading}: ${e.target}`).toBe(true);
      }
      for (const n of g.nodes) {
        expect(/^[a-z][a-z0-9_]*$/.test(n.id), `${key} › ${s.heading}: id ${n.id} harus huruf kecil`).toBe(true);
        for (const c of n.classes) expect(SITEMAP_KNOWN_CLASSES, `${key} › ${s.heading}: class ${c}`).toContain(c);
      }
      expect(g.nodes.length, `${key} › ${s.heading}`).toBeGreaterThan(0);
    }
  });

  it("id lintas berkas memakai definisi & label berkas asalnya (legend.md §Penamaan)", () => {
    expect(crossFileIssues(docs)).toEqual([]);
  });

  it("tabel route di bawah pohon navigasi terbaca", () => {
    const tools = docs.find((d) => d.key === "tools")!;
    const nav = tools.sections.find((s) => s.heading === "Pohon navigasi")!;
    expect(nav.table?.header).toEqual(["Halaman", "Route", "Katalog"]);
    expect(nav.table?.rows.map((r) => r[1])).toContain("/admin/tools/snapshot");
  });
});

describe("bagian tanpa diagram", () => {
  it("tiap berkas menyimpan 'Urutan demo yang disarankan' sebagai bagian tanpa mermaid dengan catatan — ditampilkan halaman sebagai kartu teks", () => {
    for (const d of docs) {
      const demo = d.sections.find((s) => s.heading === "Urutan demo yang disarankan");
      expect(demo, d.key).toBeDefined();
      expect(demo!.mermaid, d.key).toBeNull();
      expect(demo!.notes.length, d.key).toBeGreaterThan(0);
    }
  });
});
