import { PrismaClient } from "@prisma/client";
import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";
import { join } from "path";

export async function seedMenu(prisma: PrismaClient) {
  const csv = readFileSync(join(__dirname, "data/menu.csv"), "utf-8");
  const records = parse(csv, { columns: true, skip_empty_lines: true });

  // Seed parents first (no parent_key), then children
  const parents = records.filter((r: Record<string, string>) => !r.parent_key);
  const children = records.filter((r: Record<string, string>) => r.parent_key);

  for (const row of [...parents, ...children]) {
    await prisma.menuItem.upsert({
      where: { key: row.key },
      update: {},
      create: {
        key: row.key,
        parentKey: row.parent_key || null,
        title: row.title,
        url: row.url,
        icon: row.icon || null,
        order: parseInt(row.order, 10),
        isActive: row.is_active === "TRUE",
        isVisible: row.is_visible === "TRUE",
      },
    });
  }

  console.log(`  ✓ Menu items: ${records.length} records`);
}
