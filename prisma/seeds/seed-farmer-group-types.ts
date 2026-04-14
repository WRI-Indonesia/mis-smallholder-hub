import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import Papa from "papaparse";

export async function seedFarmerGroupTypes(prisma: PrismaClient) {
  console.log("Seeding farmer group types...");
  const filePath = path.resolve(__dirname, "data/farmer-group-types.csv");
  const { data } = Papa.parse(fs.readFileSync(filePath, "utf8"), {
    header: true,
    skipEmptyLines: true,
  });

  for (const row of data as any[]) {
    await prisma.farmerGroupType.upsert({
      where: { code: row.code },
      update: { name: row.name },
      create: { code: row.code, name: row.name },
    });
  }
  console.log(`Seeded ${data.length} farmer group types.`);
}
