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
    // Find batch by code to get the ID
    const batch = await prisma.batch.findUnique({
      where: { code: row.batch },
      select: { id: true },
    });

    if (!batch) {
      console.warn(`Batch with code ${row.batch} not found for farmer group ${row.id}, skipping batch assignment...`);
    }

    await prisma.farmerGroup.upsert({
      where: { id: row.id },
      update: {
        name: row.name,
        code: row.code || null,
        abrv: row.abrv || null,
        abrv3id: row.abrv_3id || null,
        batchId: batch?.id || null,
        locationLat: row.locationLat ? parseFloat(row.locationLat) : null,
        locationLong: row.locationLong ? parseFloat(row.locationLong) : null,
      },
      create: {
        id: row.id,
        districtId: row.districtId,
        batchId: batch?.id || null,
        code: row.code || null,
        abrv: row.abrv || null,
        abrv3id: row.abrv_3id || null,
        name: row.name,
        locationLat: row.locationLat ? parseFloat(row.locationLat) : null,
        locationLong: row.locationLong ? parseFloat(row.locationLong) : null,
      },
    });
  }
  console.log(`Seeded ${data.length} farmer groups.`);
}
