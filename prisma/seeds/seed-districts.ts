import { PrismaClient } from "@prisma/client";
import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";
import { join } from "path";

export async function seedDistricts(prisma: PrismaClient) {
  const csv = readFileSync(join(__dirname, "data/districts.csv"), "utf-8");
  const records = parse(csv, { columns: true, skip_empty_lines: true });

  for (const row of records) {
    await prisma.district.upsert({
      where: { id: row.id },
      update: {},
      create: {
        id: row.id,
        provinceId: row.province_id,
        code: row.code,
        name: row.name,
      },
    });
  }

  console.log(`  ✓ Districts: ${records.length} records`);
}
