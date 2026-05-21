import { PrismaClient } from "@prisma/client";
import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";
import { join } from "path";

export async function seedSubdistricts(prisma: PrismaClient) {
  const csv = readFileSync(join(__dirname, "data/subdistricts.csv"), "utf-8");
  const records = parse(csv, { columns: true, skip_empty_lines: true });

  for (const row of records) {
    await prisma.subdistrict.upsert({
      where: { id: row.id },
      update: {},
      create: {
        id: row.id,
        districtId: row.district_id,
        code: row.code,
        name: row.name,
      },
    });
  }

  console.log(`  ✓ Subdistricts: ${records.length} records`);
}
