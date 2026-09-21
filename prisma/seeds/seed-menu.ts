import { PrismaClient } from "@prisma/client";
import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";
import { join } from "path";

export interface MenuSeedRow {
  key: string;
  parentKey: string | null;
  title: string;
  url: string;
  icon: string | null;
  order: number;
  isActive: boolean;
  isVisible: boolean;
}

/** Kolom yang DIKELOLA CSV (struktur & label). `isActive`/`isVisible` = pilihan admin lewat Menu Management, tidak disentuh seed. */
const STRUCTURAL = ["parentKey", "title", "url", "icon", "order"] as const;

export function readMenuSeed(): MenuSeedRow[] {
  const csv = readFileSync(join(__dirname, "data/menu.csv"), "utf-8");
  const records = parse(csv, { columns: true, skip_empty_lines: true }) as Record<string, string>[];
  return records.map((row) => ({
    key: row.key,
    parentKey: row.parent_key || null,
    title: row.title,
    url: row.url,
    icon: row.icon || null,
    order: parseInt(row.order, 10),
    isActive: row.is_active === "TRUE",
    isVisible: row.is_visible === "TRUE",
  }));
}

export interface MenuSeedDiff {
  create: MenuSeedRow[];
  /** Baris ada tetapi kolom struktural berbeda: `changes` = "kolom: lama → baru". */
  update: { key: string; changes: string[] }[];
  unchanged: number;
}

/**
 * Bandingkan CSV dengan DB tanpa menulis — dipakai dry-run `seed-menu-only.ts`
 * supaya perubahan label/order (mis. #352 P4) terlihat sebelum `--apply`.
 */
export async function diffMenuSeed(prisma: PrismaClient): Promise<MenuSeedDiff> {
  const rows = readMenuSeed();
  const existing = new Map((await prisma.menuItem.findMany()).map((m) => [m.key, m]));
  const diff: MenuSeedDiff = { create: [], update: [], unchanged: 0 };
  for (const row of rows) {
    const cur = existing.get(row.key);
    if (!cur) {
      diff.create.push(row);
      continue;
    }
    const changes = STRUCTURAL.filter((k) => (cur[k] ?? null) !== (row[k] ?? null)).map((k) => `${k}: ${String(cur[k] ?? "∅")} → ${String(row[k] ?? "∅")}`);
    if (changes.length) diff.update.push({ key: row.key, changes });
    else diff.unchanged++;
  }
  return diff;
}

/**
 * Upsert menu dari CSV. Baris baru dibuat utuh; baris yang sudah ada
 * DIPERBARUI kolom strukturalnya (judul, url, ikon, order, induk) — sampai
 * 2026-09-21 `update: {}` sehingga tukar label/order (#352 P4) tidak pernah
 * sampai ke DB yang sudah ter-seed (temuan QA lokal v0.37.0). `isActive`/
 * `isVisible` sengaja tidak ditimpa (pilihan admin lewat Menu Management).
 */
export async function seedMenu(prisma: PrismaClient) {
  const rows = readMenuSeed();
  // Induk dulu (tanpa parent_key), lalu anak.
  const ordered = [...rows.filter((r) => !r.parentKey), ...rows.filter((r) => r.parentKey)];
  let created = 0;
  let updated = 0;
  for (const row of ordered) {
    const before = await prisma.menuItem.findUnique({ where: { key: row.key }, select: { key: true } });
    await prisma.menuItem.upsert({
      where: { key: row.key },
      update: { parentKey: row.parentKey, title: row.title, url: row.url, icon: row.icon, order: row.order },
      create: {
        key: row.key,
        parentKey: row.parentKey,
        title: row.title,
        url: row.url,
        icon: row.icon,
        order: row.order,
        isActive: row.isActive,
        isVisible: row.isVisible,
      },
    });
    if (before) updated++;
    else created++;
  }

  console.log(`  ✓ Menu items: ${rows.length} records (${created} dibuat · ${updated} diperbarui/disamakan)`);
}
