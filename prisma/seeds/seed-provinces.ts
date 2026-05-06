import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import Papa from "papaparse";

export async function seedProvinces(prisma: PrismaClient) {
  console.log("Seeding provinces...");
  const csvFilePath = path.resolve(__dirname, "data/provinces.csv");
  const fileContent = fs.readFileSync(csvFilePath, "utf8");

  const { data } = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
  });

  for (const row of data as any[]) {
    await prisma.province.upsert({
      where: { code: row.code },
      update: {
        name: row.name,
      },
      create: {
        id: row.id,
        code: row.code,
        name: row.name,
      },
    });
  }
  console.log(`Seeded ${data.length} provinces.`);
}
