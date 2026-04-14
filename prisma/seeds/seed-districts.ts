import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import Papa from "papaparse";

export async function seedDistricts(prisma: PrismaClient) {
  console.log("Seeding districts...");
  const csvFilePath = path.resolve(__dirname, "data/districts.csv");
  const fileContent = fs.readFileSync(csvFilePath, "utf8");

  const { data } = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
  });

  for (const row of data as any[]) {
    await prisma.district.upsert({
      where: { code: row.code },
      update: {
        name: row.name,
        provinceId: row.provinceId,
      },
      create: {
        id: row.id,
        code: row.code,
        name: row.name,
        provinceId: row.provinceId,
      },
    });
  }
  console.log(`Seeded ${data.length} districts.`);
}
