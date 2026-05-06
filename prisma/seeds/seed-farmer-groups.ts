import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import Papa from "papaparse";

export async function seedFarmerGroups(prisma: PrismaClient) {
  console.log("Seeding farmer groups...");
  const filePath = path.resolve(__dirname, "data/farmer-groups.csv");
  const { data } = Papa.parse(fs.readFileSync(filePath, "utf8"), {
    header: true,
    skipEmptyLines: true,
  });

  for (const row of data as any[]) {
    await prisma.farmerGroup.upsert({
      where: { id: row.id },
      update: {
        name: row.name,
        code: row.code || null,
        abrv: row.abrv || null,
        locationLat: row.locationLat ? parseFloat(row.locationLat) : null,
        locationLong: row.locationLong ? parseFloat(row.locationLong) : null,
      },
      create: {
        id: row.id,
        districtId: row.districtId,
        code: row.code || null,
        abrv: row.abrv || null,
        name: row.name,
        locationLat: row.locationLat ? parseFloat(row.locationLat) : null,
        locationLong: row.locationLong ? parseFloat(row.locationLong) : null,
      },
    });
  }
  console.log(`Seeded ${data.length} farmer groups.`);
}
