import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { parse } from "csv-parse/sync";
import { describe, expect, it } from "vitest";
import { readMenuSeed, validateMenuSeedRows } from "../../prisma/seeds/seed-menu";

/**
 * Penjaga drift seed ↔ katalog produk (kandidat dari retro #347, dipasang di
 * review pra-rilis #352): setiap key menu di `prisma/seeds/data/menu.csv`
 * harus disebut di `docs/product/pages/**` — menu baru tanpa katalog halaman
 * pernah lolos dua review inkremental (#347).
 */
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith(".md") ? [p] : [];
  });
}

const menuRows = (parse(readFileSync("prisma/seeds/data/menu.csv", "utf8"), { columns: true, skip_empty_lines: true }) as Record<string, string>[]).map(
  (r) => ({ key: r.key, parentKey: r.parent_key, title: r.title, order: Number(r.order) }),
);

const catalog = walk("docs/product/pages").map((p) => readFileSync(p, "utf8")).join("\n");

describe("menu.csv ↔ docs/product/pages", () => {
  it("setiap key menu disebut di katalog halaman produk", () => {
    const missing = menuRows.filter((r) => !catalog.includes(r.key)).map((r) => r.key);
    expect(missing).toEqual([]);
  });

  it("keluarga Ketersediaan Data (#416 K1): induk level 2 + anak Semua Lembaga · Per Lembaga · Produksi, tertulis di katalog", () => {
    const byKey = Object.fromEntries(menuRows.map((r) => [r.key, r]));
    expect(byKey["data-analyst-availability"]).toMatchObject({ title: "Ketersediaan Data", parentKey: "data-analyst", order: 2 });
    // Key & URL dua menu lama tetap (#352 P4 / #364); hanya induk + judul yang berubah (owner 2026-10-11).
    expect(byKey["data-analyst-data-availability"]).toMatchObject({ title: "Semua Lembaga", parentKey: "data-analyst-availability", order: 1 });
    expect(byKey["data-analyst-data-completeness"]).toMatchObject({ title: "Per Lembaga", parentKey: "data-analyst-availability", order: 2 });
    expect(byKey["data-analyst-availability-production"]).toMatchObject({ title: "Produksi", parentKey: "data-analyst-availability", order: 3 });
    expect(catalog).toContain("| 2.1 | Semua Lembaga |");
    expect(catalog).toContain("| 2.2 | Per Lembaga |");
    expect(catalog).toContain("| 2.3 | Produksi |");
  });

  it("order unik per induk (dua menu sejajar tidak berebut posisi)", () => {
    const seen = new Map<string, string>();
    const clashes: string[] = [];
    for (const r of menuRows) {
      const slot = `${r.parentKey}#${r.order}`;
      if (seen.has(slot)) clashes.push(`${seen.get(slot)} vs ${r.key} (${slot})`);
      seen.set(slot, r.key);
    }
    expect(clashes).toEqual([]);
  });
});

describe("readMenuSeed (seeder menu)", () => {
  it("membaca semua baris CSV dengan key unik; induk Ketersediaan Data terbaca; seed memperbarui kolom struktural baris yang ada", () => {
    const rows = readMenuSeed();
    expect(rows.length).toBe(menuRows.length);
    expect(new Set(rows.map((r) => r.key)).size).toBe(rows.length);
    const avail = rows.find((r) => r.key === "data-analyst-data-availability")!;
    expect(avail).toMatchObject({ title: "Semua Lembaga", order: 1, parentKey: "data-analyst-availability", isActive: true, isVisible: true });
    // Kontrak sumber kebenaran: seedMenu mem-upsert kolom struktural (bukan `update: {}`).
    const src = readFileSync("prisma/seeds/seed-menu.ts", "utf8");
    expect(src).toMatch(/update:\s*\{\s*parentKey: row\.parentKey, title: row\.title, url: row\.url, icon: row\.icon, order: row\.order\s*\}/);
  });
});

describe("validateMenuSeedRows — invarian struktur menu (CSV satu-satunya jalur sejak #364)", () => {
  const r = (key: string, parentKey: string | null) => ({ key, parentKey, title: key, url: `/${key}`, icon: null });
  const ok = [r("a", null), r("a-b", "a"), r("a-b-c", "a-b")];

  it("3 level valid → lolos", () => {
    expect(() => validateMenuSeedRows(ok)).not.toThrow();
  });
  it("level 4 → melempar", () => {
    expect(() => validateMenuSeedRows([...ok, r("a-b-c-d", "a-b-c")])).toThrow(/melebihi 3 level/);
  });
  it("induk salah ketik (tidak ada di CSV) → melempar sebelum menulis apa pun", () => {
    expect(() => validateMenuSeedRows([...ok, r("x", "aa")])).toThrow(/induk "aa" dari "x" tidak ada/);
  });
  it("induk = dirinya sendiri → pesan jelas, bukan stack overflow", () => {
    expect(() => validateMenuSeedRows([...ok, r("x", "x")])).toThrow(/induk dirinya sendiri/);
  });
});

