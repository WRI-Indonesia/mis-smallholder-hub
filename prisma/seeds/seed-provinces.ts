import { PrismaClient } from "@prisma/client";
import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";
import { join } from "path";

export async function seedProvinces(prisma: PrismaClient) {
  const csv = readFileSync(join(__dirname, "data/provinces.csv"), "utf-8");
  const records = parse(csv, { columns: true, skip_empty_lines: true });

  for (const row of records) {
    await prisma.province.upsert({
      where: { id: row.id },
      update: {},
      create: {
        id: row.id,
        code: row.code,
        name: row.name,
      },
    });
  }

  console.log(`  ✓ Provinces: ${records.length} records`);
}
