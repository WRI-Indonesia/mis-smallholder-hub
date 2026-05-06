import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import Papa from "papaparse";

export async function seedSubdistricts(prisma: PrismaClient) {
  console.log("Seeding subdistricts...");
  const csvFilePath = path.resolve(__dirname, "data/subdistricts.csv");
  const fileContent = fs.readFileSync(csvFilePath, "utf8");

  const { data } = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
  });

  for (const row of data as any[]) {
    await prisma.subdistrict.upsert({
      where: { code: row.code },
      update: {
        name: row.name,
        districtId: row.districtId,
      },
      create: {
        id: row.id,
        code: row.code,
        name: row.name,
        districtId: row.districtId,
      },
    });
  }
  console.log(`Seeded ${data.length} subdistricts.`);
}
