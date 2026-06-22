import { PrismaClient, FarmerGroupCategory } from "@prisma/client";
import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";
import { join } from "path";

export async function seedFarmerGroups(prisma: PrismaClient) {
  const csv = readFileSync(join(__dirname, "data/farmer-groups.csv"), "utf-8");
  const records = parse(csv, { columns: true, skip_empty_lines: true });

  for (const row of records) {
    await prisma.farmerGroup.upsert({
      where: { id: row.id },
      update: {},
      create: {
        id: row.id,
        districtId: row.district_id,
        code: row.code || null,
        abrv: row.abrv || null,
        abrv3id: row.abrv_3id || null,
        name: row.name,
        category: row.category as FarmerGroupCategory,
        joinYear: row.join_year ? parseInt(row.join_year, 10) : null,
        locationLat: row.location_lat ? parseFloat(row.location_lat) : null,
        locationLong: row.location_long ? parseFloat(row.location_long) : null,
      },
    });
  }

  console.log(`  ✓ Farmer groups: ${records.length} records`);
}
