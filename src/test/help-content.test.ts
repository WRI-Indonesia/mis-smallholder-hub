import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
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
    expect(blocks.map((b) => b.type)).toEqual(["heading", "definition", "list", "paragraph"]);
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

describe("blok tutorial — langkah bernomor & callout", () => {
  it("mengubah baris bernomor jadi satu blok steps", () => {
    const blocks = parseBlocks("1. Buka menu Petani\n2. Klik Tambah Petani\n3. Isi form");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("steps");
    if (blocks[0].type === "steps") {
      expect(blocks[0].items).toHaveLength(3);
      expect(blocks[0].items[0].inline[0].value).toBe("Buka menu Petani");
    }
  });

  it("mengabaikan angka yang ditulis — penomoran diturunkan dari posisi", () => {
    // Menyisipkan langkah di tengah tidak boleh menuntut penomoran ulang berkas.
    const blocks = parseBlocks("1. Satu\n1. Dua\n5. Tiga");
    expect(blocks[0].type).toBe("steps");
    if (blocks[0].type === "steps") {
      expect(blocks[0].items.map((i) => i.inline[0].value)).toEqual(["Satu", "Dua", "Tiga"]);
    }
  });

  it("menerima gaya `1)` selain `1.`", () => {
    const blocks = parseBlocks("1) Satu\n2) Dua");
    expect(blocks[0].type).toBe("steps");
    if (blocks[0].type === "steps") expect(blocks[0].items).toHaveLength(2);
  });

  it("baris kosong memutus rangkaian langkah jadi dua blok", () => {
    const blocks = parseBlocks("1. Satu\n\n1. Lain");
    expect(blocks.filter((b) => b.type === "steps")).toHaveLength(2);
  });

  it("mengenali ketiga nada callout", () => {
    const blocks = parseBlocks(
      "> [!tip] Pakai bulk upload\n\n> [!penting] Wajib diisi\n\n> [!hati-hati] ID tidak boleh sama",
    );
    expect(blocks.map((b) => (b.type === "callout" ? b.tone : b.type))).toEqual([
      "tip",
      "penting",
      "hati-hati",
    ]);
  });

  it("inline di dalam langkah & callout tetap diproses", () => {
    const blocks = parseBlocks("1. Klik **Tambah Petani**");
    if (blocks[0].type === "steps") {
      expect(
        blocks[0].items[0].inline.some((p) => p.type === "strong" && p.value === "Tambah Petani"),
      ).toBe(true);
    }
  });

  it("isi langkah & callout ikut terindeks pencarian", () => {
    // Pencarian tutorial paling sering menyasar teks di dalam langkah, bukan judul.
    const text = blocksToPlainText(
      parseBlocks("1. Klik Tambah Petani\n\n> [!tip] Pakai bulk upload"),
    );
    expect(text).toContain("Klik Tambah Petani");
    expect(text).toContain("Pakai bulk upload");
  });

  it("daftar berpoin tidak tertukar dengan langkah", () => {
    const blocks = parseBlocks("- Poin satu\n- Poin dua");
    expect(blocks[0].type).toBe("list");
  });
});

describe("dua tingkat kedalaman — baris `+`", () => {
  it("baris + menempel sebagai detail langkah di atasnya", () => {
    const blocks = parseBlocks("1. Klik Tambah\n+ Tombolnya di kanan atas\n2. Isi nama");
    expect(blocks[0].type).toBe("steps");
    if (blocks[0].type === "steps") {
      expect(blocks[0].items).toHaveLength(2);
      expect(blocks[0].items[0].detail?.[0].value).toBe("Tombolnya di kanan atas");
      expect(blocks[0].items[1].detail).toBeUndefined();
    }
  });

  it("beberapa baris + berurutan digabung jadi satu detail", () => {
    const blocks = parseBlocks("1. Langkah\n+ Bagian satu\n+ Bagian dua");
    if (blocks[0].type === "steps") {
      const text = blocks[0].items[0].detail?.map((p) => p.value).join("");
      expect(text).toBe("Bagian satu Bagian dua");
    }
  });

  it("baris + tanpa langkah sebelumnya jadi paragraf tingkat detail", () => {
    const blocks = parseBlocks("Paragraf biasa.\n\n+ Penjelasan tambahan");
    const last = blocks[blocks.length - 1];
    expect(last.type).toBe("paragraph");
    if (last.type === "paragraph") expect(last.detail).toBe(true);
  });

  it("paragraf biasa tidak ditandai detail", () => {
    const blocks = parseBlocks("Paragraf biasa.");
    if (blocks[0].type === "paragraph") expect(blocks[0].detail).toBeUndefined();
  });

  it("isi detail tetap terindeks pencarian — mode Ringkas hanya menyembunyikan tampilan", () => {
    const text = blocksToPlainText(parseBlocks("1. Klik Tambah\n+ Tombolnya di kanan atas"));
    expect(text).toContain("Klik Tambah");
    expect(text).toContain("Tombolnya di kanan atas");
  });
});

describe("kelengkapan berkas tutorial", () => {
  // Berkas .md dibaca langsung dari disk: di runtime Next mereka di-bundle
  // webpack (`asset/source`), yang tidak tersedia di vitest.
  const dir = join(process.cwd(), "src/content/help/tutorial");
  const files = readdirSync(dir).filter((f) => f.endsWith(".md"));

  it("ada berkas tutorial yang dibaca", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)("%s punya frontmatter tutorial yang lengkap", (file) => {
    const { frontmatter } = parseMarkdown(readFileSync(join(dir, file), "utf-8"));
    // `menuKey` dipakai menandai tutorial di luar hak akses pembaca; `href`
    // menghasilkan tombol ke halaman terkait; `goal` tampil di kartu indeks.
    for (const key of ["title", "icon", "menuKey", "permission", "goal", "href"]) {
      expect(frontmatter[key], `${file} → ${key}`).toBeTruthy();
    }
    expect(Number.isInteger(Number(frontmatter.duration)), `${file} → duration`).toBe(true);
  });

  it.each(files)("%s punya langkah bernomor", (file) => {
    const { blocks } = parseMarkdown(readFileSync(join(dir, file), "utf-8"));
    const steps = blocks.filter((b) => b.type === "steps");
    expect(steps.length, `${file} tidak punya blok langkah`).toBeGreaterThan(0);
  });

  it.each(files)("%s punya bagian 'Kalau bermasalah'", (file) => {
    // Keputusan owner: troubleshooting tetap inline di tiap tutorial, bukan
    // dikumpulkan ke satu halaman terpisah.
    const source = readFileSync(join(dir, file), "utf-8");
    expect(source).toContain("## Kalau bermasalah");
  });

  it("href tiap tutorial menunjuk rute admin yang absolut", () => {
    for (const file of files) {
      const { frontmatter } = parseMarkdown(readFileSync(join(dir, file), "utf-8"));
      expect(frontmatter.href, file).toMatch(/^\/admin\//);
    }
  });
});
