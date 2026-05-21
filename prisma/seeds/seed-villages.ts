import { PrismaClient } from "@prisma/client";
import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";
import { join } from "path";

export async function seedVillages(prisma: PrismaClient) {
  const csv = readFileSync(join(__dirname, "data/villages.csv"), "utf-8");
  const records = parse(csv, { columns: true, skip_empty_lines: true });

  for (const row of records) {
    await prisma.village.upsert({
      where: { id: row.id },
      update: {},
      create: {
        id: row.id,
        subdistrictId: row.subdistrict_id,
        code: row.code,
        name: row.name,
      },
    });
  }

  console.log(`  ✓ Villages: ${records.length} records`);
}
