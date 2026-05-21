import { PrismaClient } from "@prisma/client";
import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";
import { join } from "path";

export async function seedMenu(prisma: PrismaClient) {
  const csv = readFileSync(join(__dirname, "data/menu.csv"), "utf-8");
  const records = parse(csv, { columns: true, skip_empty_lines: true });

  for (const row of records) {
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
        isActive: row.is_active === "true",
        isVisible: row.is_visible === "true",
      },
    });
  }

  console.log(`  ✓ Menu items: ${records.length} records`);
}
