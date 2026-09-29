import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { describe, expect, it } from "vitest";
import { extractBlock, renderBlocks } from "../../scripts/docs-gen";

/**
 * Dua penjaga `docs/` (keputusan docs/decisions/0007):
 * 1. **Kesegaran** — blok GENERATED sama dengan hasil `renderBlocks()`
 *    (enum, menu, angka ringkasan dihitung dari repo, bukan ditulis tangan).
 * 2. **Lint** — tautan relatif hidup, riwayat migrasi lengkap & urut, tiap
 *    berkas ber-H1. Murni `fs`, tanpa jaringan/DB.
 */

const REGENERATE = "jalankan `npm run build:docs` lalu commit ulang docs";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith(".md") ? [p] : [];
  });
}

const docs = walk("docs");

describe("docs — blok turunan kode", () => {
  for (const block of renderBlocks()) {
    it(`${block.file} [${block.id}] segar`, () => {
      const current = extractBlock(readFileSync(block.file, "utf8"), block.id);
      expect(current, `penanda GENERATED:${block.id} hilang dari ${block.file}`).not.toBeNull();
      expect(current, REGENERATE).toBe(block.body);
    });
  }
});

describe("docs — lint", () => {
  it("setiap tautan relatif menunjuk berkas/folder yang ada", () => {
    const broken: string[] = [];
    for (const file of docs) {
      const text = readFileSync(file, "utf8")
        .replace(/```[\s\S]*?```/g, "")
        .replace(/`[^`\n]*`/g, "");
      for (const m of text.matchAll(/\]\(([^)\s]+)\)/g)) {
        const target = m[1].split("#")[0];
        if (!target || /^[a-z]+:/i.test(target) || target.startsWith("/")) continue;
        if (!existsSync(normalize(join(dirname(file), decodeURIComponent(target))))) broken.push(`${file} → ${m[1]}`);
      }
    }
    expect(broken).toEqual([]);
  });

  it("setiap berkas diawali judul H1", () => {
    expect(docs.filter((f) => !readFileSync(f, "utf8").startsWith("# "))).toEqual([]);
  });

  it("setiap berkas (kecuali indeks akar) punya baris kepala di baris ke-3", () => {
    const header = (f: string) => readFileSync(f, "utf8").split("\n")[2] ?? "";
    const tanpa = docs.filter((f) => f !== join("docs", "README.md")).filter((f) => !/^(> Bagian dari|\[←)/.test(header(f)));
    expect(tanpa, "tambahkan `> Bagian dari dokumentasi **Area**. Indeks: …` (lihat docs/README.md §Konvensi docs)").toEqual([]);
  });

  it("heading tidak dinomori, kecuali daftar berurutan yang disengaja", () => {
    const allowed = new Set([join("docs", "standards", "principles.md"), join("docs", "standards", "versioning.md")]);
    const numbered = docs
      .filter((f) => !allowed.has(f) && !f.includes(`${join("docs", "qa")}/`) && !f.includes(join("project", "changelog")))
      .flatMap((f) => readFileSync(f, "utf8").split("\n").filter((l) => /^#{2,4} \d+\. /.test(l)).map((l) => `${f}: ${l}`));
    expect(numbered).toEqual([]);
  });

  it("riwayat migrasi di database/migrations.md lengkap dan urut", () => {
    const folders = readdirSync("prisma/migrations").filter((d) => statSync(join("prisma/migrations", d)).isDirectory());
    const documented = [...readFileSync("docs/database/migrations.md", "utf8").matchAll(/^\| `(\d{14}_[a-z0-9_]+)` \|/gm)].map((m) => m[1]);
    expect(documented, "tambahkan baris migrasi baru ke docs/database/migrations.md §Riwayat Migrasi").toEqual([...folders].sort());
  });
});
