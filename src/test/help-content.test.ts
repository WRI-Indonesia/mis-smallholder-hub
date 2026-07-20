import { describe, it, expect } from "vitest";
import {
  parseFrontmatter,
  parseInline,
  parseBlocks,
  parseMarkdown,
  blocksToPlainText,
  embedUrl,
} from "@/lib/markdown-lite";

describe("parseFrontmatter", () => {
  it("memisahkan frontmatter dari body & melepas kutip", () => {
    const { frontmatter, body } = parseFrontmatter(
      '---\ntitle: "Bulk Upload"\nicon: Upload\n---\nParagraf pertama.\n',
    );
    expect(frontmatter).toEqual({ title: "Bulk Upload", icon: "Upload" });
    expect(body).toBe("Paragraf pertama.");
  });

  it("tanpa frontmatter → objek kosong, body utuh (CRLF dinormalisasi)", () => {
    const { frontmatter, body } = parseFrontmatter("Baris A\r\nBaris B");
    expect(frontmatter).toEqual({});
    expect(body).toBe("Baris A\nBaris B");
  });
});

describe("parseInline", () => {
  it("mengenali tebal, kode, dan tautan di antara teks biasa", () => {
    expect(parseInline("Klik **Simpan** lalu `npm test` di [docs](https://x.id).")).toEqual([
      { type: "text", value: "Klik " },
      { type: "strong", value: "Simpan" },
      { type: "text", value: " lalu " },
      { type: "code", value: "npm test" },
      { type: "text", value: " di " },
      { type: "link", value: "docs", href: "https://x.id" },
      { type: "text", value: "." },
    ]);
  });

  it("teks polos → satu bagian teks", () => {
    expect(parseInline("Tanpa format")).toEqual([{ type: "text", value: "Tanpa format" }]);
  });
});

describe("parseBlocks", () => {
  it("heading, definisi, list, dan paragraf multi-baris", () => {
    const blocks = parseBlocks(
      [
        "## Sub-judul",
        "",
        "**Istilah** — penjelasan singkat.",
        "",
        "- item satu",
        "- item dua",
        "",
        "Paragraf baris pertama",
        "dan baris kedua digabung.",
      ].join("\n"),
    );
    expect(blocks.map((b) => b.type)).toEqual([
      "heading",
      "definition",
      "list",
      "paragraph",
    ]);
    const def = blocks[1] as { type: "definition"; term: string };
    expect(def.term).toBe("Istilah");
    const list = blocks[2] as { type: "list"; items: unknown[] };
    expect(list.items).toHaveLength(2);
    const para = blocks[3] as { type: "paragraph"; inline: { value: string }[] };
    expect(para.inline[0].value).toBe("Paragraf baris pertama dan baris kedua digabung.");
  });

  it("definisi menerima em dash, en dash, hyphen, dan titik dua", () => {
    for (const sep of ["—", "–", "-", ":"]) {
      const blocks = parseBlocks(`**Istilah** ${sep} penjelasan.`);
      expect(blocks[0].type).toBe("definition");
    }
  });

  it("input kosong → tanpa blok", () => {
    expect(parseBlocks("")).toEqual([]);
  });
});

describe("parseMarkdown + blocksToPlainText", () => {
  it("dokumen utuh ter-parse dan teks polos memuat istilah & isi (untuk pencarian)", () => {
    const doc = parseMarkdown(
      "---\ntitle: Peta\n---\n## Peta BMP\n\n**Cetak peta** — hasilkan PDF sesuai layer aktif.\n\n- Excel juga tersedia\n",
    );
    expect(doc.frontmatter.title).toBe("Peta");
    const plain = blocksToPlainText(doc.blocks).toLowerCase();
    expect(plain).toContain("peta bmp");
    expect(plain).toContain("cetak peta");
    expect(plain).toContain("pdf sesuai layer aktif");
    expect(plain).toContain("excel juga tersedia");
  });
});

describe("media (gambar & video)", () => {
  it("menebak jenis media dari sumbernya", () => {
    const blocks = parseBlocks(
      [
        "![Formulir petani](/help/form.png)",
        "",
        "![Cara unggah](/help/unggah.mp4)",
        "",
        "![Pengenalan](https://youtu.be/abc123XYZ)",
      ].join("\n"),
    );
    expect(blocks.map((b) => (b.type === "media" ? b.kind : b.type))).toEqual([
      "image",
      "video",
      "embed",
    ]);
    const first = blocks[0];
    if (first.type !== "media") throw new Error("blok pertama harus media");
    expect(first.src).toBe("/help/form.png");
    expect(first.caption).toBe("Formulir petani");
  });

  it("URL embed dinormalisasi ke pemutar sematan", () => {
    expect(embedUrl("https://youtu.be/abc123XYZ")).toBe(
      "https://www.youtube-nocookie.com/embed/abc123XYZ",
    );
    expect(embedUrl("https://www.youtube.com/watch?v=abc123XYZ")).toBe(
      "https://www.youtube-nocookie.com/embed/abc123XYZ",
    );
    expect(embedUrl("https://vimeo.com/76979871")).toBe("https://player.vimeo.com/video/76979871");
  });

  it("media di tengah kalimat tetap paragraf biasa", () => {
    expect(parseBlocks("Lihat ![ini](/help/x.png) pada formulir.")[0].type).toBe("paragraph");
  });

  it("caption media ikut terindeks pencarian", () => {
    expect(blocksToPlainText(parseBlocks("![Cara unggah Shapefile](/help/unggah.mp4)"))).toContain(
      "Cara unggah Shapefile",
    );
  });
});
