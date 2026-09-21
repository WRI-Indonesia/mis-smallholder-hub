import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { parse } from "csv-parse/sync";
import { describe, expect, it } from "vitest";

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

  it("label & order Ketersediaan Data (#352 P4) sesuai keputusan owner dan tertulis di katalog", () => {
    const byKey = Object.fromEntries(menuRows.map((r) => [r.key, r]));
    expect(byKey["data-analyst-data-availability"]).toMatchObject({ title: "Ketersediaan Data — Semua Lembaga", order: 2 });
    expect(byKey["data-analyst-data-completeness"]).toMatchObject({ title: "Ketersediaan Data — Per Lembaga", order: 3 });
    expect(catalog).toContain("Ketersediaan Data — Semua Lembaga");
    expect(catalog).toContain("Ketersediaan Data — Per Lembaga");
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
