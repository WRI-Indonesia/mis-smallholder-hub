import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * Registry Bantuan `src/lib/help-content.ts` ASLI (#184/#257). Vitest tak
 * punya loader webpack `asset/source` untuk `.md`, jadi tiap impor `.md` di
 * registry di-`doMock` dengan isi berkas aslinya (string) sebelum modul dimuat —
 * yang diuji adalah hasil parse sungguhan: bab/topik, navigasi, indeks cari.
 */
const SRC = join(__dirname, "..");
const REGISTRY = readFileSync(join(SRC, "lib/help-content.ts"), "utf-8");
const MD_IMPORTS = [...REGISTRY.matchAll(/^import \w+ from "(@\/content\/help\/[^"]+\.md)";$/gm)].map((m) => m[1]);

for (const spec of MD_IMPORTS) {
  const text = readFileSync(join(SRC, spec.slice(2)), "utf-8");
  vi.doMock(spec, () => ({ default: text }));
}

const help = await import("@/lib/help-content");
const { HELP_CHAPTERS } = help;

describe("HELP_CHAPTERS — konsistensi registry", () => {
  it("setiap impor .md terpasang tepat sekali sebagai topik", () => {
    const topicCount = HELP_CHAPTERS.reduce((n, c) => n + c.topics.length, 0);
    expect(MD_IMPORTS.length).toBeGreaterThan(0);
    expect(topicCount).toBe(MD_IMPORTS.length);
  });

  it("slug bab unik; id topik unik di seluruh Bantuan (dipakai anchor & pencarian)", () => {
    const slugs = HELP_CHAPTERS.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    const ids = HELP_CHAPTERS.flatMap((c) => c.topics.map((t) => t.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("tiap topik punya judul dari frontmatter (bukan fallback id), isi ter-parse, teks polos terisi", () => {
    for (const c of HELP_CHAPTERS) {
      for (const t of c.topics) {
        expect(t.title, `${c.slug}/${t.id}`).not.toBe(t.id);
        expect(t.blocks.length, `${c.slug}/${t.id}`).toBeGreaterThan(0);
        expect(t.plainText.length, `${c.slug}/${t.id}`).toBeGreaterThan(0);
        expect(t.icon).toBeTruthy();
      }
    }
  });

  it("topik bab tutorial membawa menuKey + href; duration bilangan bila ada", () => {
    for (const c of help.helpChaptersBySection("tutorial")) {
      for (const t of c.topics) {
        expect(t.menuKey, `${c.slug}/${t.id}`).toBeTruthy();
        expect(t.href, `${c.slug}/${t.id}`).toMatch(/^\/admin\//);
        if (t.duration !== undefined) expect(Number.isInteger(t.duration)).toBe(true);
      }
    }
  });

  it("helpChaptersBySection memecah tiga lapis tanpa sisa, urutan deklarasi terjaga", () => {
    const sections = ["tutorial", "konsep", "referensi"] as const;
    const parts = sections.map((s) => help.helpChaptersBySection(s));
    expect(parts.reduce((n, p) => n + p.length, 0)).toBe(HELP_CHAPTERS.length);
    for (const p of parts) expect(p.length).toBeGreaterThan(0);
    expect(parts[0].map((c) => c.slug)).toEqual(HELP_CHAPTERS.filter((c) => c.section === "tutorial").map((c) => c.slug));
  });
});

describe("lookup & navigasi", () => {
  it("getHelpChapter / getHelpTopic: slug dikenal → lokasi bernomor 1-based; tak dikenal → undefined", () => {
    const first = HELP_CHAPTERS[0];
    expect(help.getHelpChapter(first.slug)).toBe(first);
    expect(help.getHelpChapter("tidak-ada")).toBeUndefined();
    const loc = help.getHelpTopic(first.slug, first.topics[1].id)!;
    expect(loc).toMatchObject({ chapterIndex: 0, topicIndex: 1, number: "1.2", topic: first.topics[1] });
    expect(help.getHelpTopic(first.slug, "tidak-ada")).toBeUndefined();
    expect(help.getHelpTopic("tidak-ada", first.topics[0].id)).toBeUndefined();
  });

  it("flattenHelpTopics urut lintas bab; getAdjacentHelpTopics menyeberang batas bab", () => {
    const all = help.flattenHelpTopics();
    expect(all).toHaveLength(HELP_CHAPTERS.reduce((n, c) => n + c.topics.length, 0));
    const [c0, c1] = HELP_CHAPTERS;
    const lastOfFirst = c0.topics[c0.topics.length - 1];
    const adj = help.getAdjacentHelpTopics(c0.slug, lastOfFirst.id);
    expect(adj.next).toMatchObject({ chapterSlug: c1.slug, topicId: c1.topics[0].id, number: "2.1" });
    expect(help.getAdjacentHelpTopics(c0.slug, c0.topics[0].id).prev).toBeNull();
    const tail = all[all.length - 1];
    expect(help.getAdjacentHelpTopics(tail.chapterSlug, tail.topicId).next).toBeNull();
    expect(help.getAdjacentHelpTopics("x", "y")).toEqual({ prev: null, next: null });
  });

  it("buildHelpSearchIndex: satu entri per topik, haystack huruf kecil memuat judul bab & topik", () => {
    const idx = help.buildHelpSearchIndex();
    expect(idx).toHaveLength(help.flattenHelpTopics().length);
    const e = idx.find((x) => x.topicId === "menambah-petani")!;
    expect(e.haystack).toBe(e.haystack.toLowerCase());
    expect(e.haystack).toContain(e.topicTitle.toLowerCase());
    expect(e.haystack).toContain(e.chapterTitle.toLowerCase());
  });

  it("buildHelpNav: struktur ringan tanpa isi, nomor sama dengan flatten", () => {
    const nav = help.buildHelpNav();
    expect(nav.map((c) => c.slug)).toEqual(HELP_CHAPTERS.map((c) => c.slug));
    expect(nav.flatMap((c) => c.topics.map((t) => t.number))).toEqual(help.flattenHelpTopics().map((t) => t.number));
    expect(nav[0].topics[0]).not.toHaveProperty("blocks");
  });

  it("findTutorialForMenu menemukan tutorial untuk menuKey yang dirujuk frontmatter", () => {
    const chapter = help.helpChaptersBySection("tutorial")[0];
    const withMenu = chapter.topics[0];
    expect(help.findTutorialForMenu(withMenu.menuKey!)).toEqual({
      href: `/admin/help/${chapter.slug}/${withMenu.id}`,
      title: withMenu.title,
    });
    expect(help.findTutorialForMenu("menu-yang-tidak-ada")).toBeNull();
  });
});
