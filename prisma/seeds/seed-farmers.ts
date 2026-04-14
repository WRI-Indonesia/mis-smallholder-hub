import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import Papa from "papaparse";

export async function seedFarmers(prisma: PrismaClient) {
  console.log("Seeding farmers...");
  const csvFilePath = path.resolve(__dirname, "data/farmers.csv");
  const fileContent = fs.readFileSync(csvFilePath, "utf8");

  const { data } = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
  });

  for (const row of data as any[]) {
    // Look up the batch by code to get the actual ID
    let batchId: string | null = null;
    if (row.batchId) {
      const batch = await prisma.batch.findUnique({
        where: { code: row.batchId },
      });
      batchId = batch?.id ?? null;
    }

    await prisma.farmer.upsert({
      where: { nik: row.nik },
      update: {
        name: row.name,
        gender: row.gender,
        status: row.status || null,
        farmerGroupId: row.farmerGroupId,
        batchId,
      },
      create: {
        id: row.id,
        farmerGroupId: row.farmerGroupId,
        batchId,
        wriFarmerId: row.wriFarmerId || null,
        uiFarmerId: row.uiFarmerId || null,
        name: row.name,
        nik: row.nik,
        gender: row.gender,
        birthdate: new Date(row.birthdate),
        status: row.status || null,
      },
    });
  }
  console.log(`Seeded ${data.length} farmers.`);
}
