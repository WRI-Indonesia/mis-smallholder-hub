import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import Papa from "papaparse";

export async function seedVillages(prisma: PrismaClient) {
  console.log("Seeding villages...");
  const csvFilePath = path.resolve(__dirname, "data/villages.csv");
  const fileContent = fs.readFileSync(csvFilePath, "utf8");

  const { data } = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
  });

  for (const row of data as any[]) {
    await prisma.village.upsert({
      where: { code: row.code },
      update: {
        name: row.name,
        subdistrictId: row.subdistrictId,
      },
      create: {
        id: row.id,
        code: row.code,
        name: row.name,
        subdistrictId: row.subdistrictId,
      },
    });
  }
  console.log(`Seeded ${data.length} villages.`);
}
