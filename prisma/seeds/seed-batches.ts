import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import Papa from "papaparse";

export async function seedBatches(prisma: PrismaClient) {
  console.log("Seeding batches...");
  const csvFilePath = path.resolve(__dirname, "data/batches.csv");
  const fileContent = fs.readFileSync(csvFilePath, "utf8");

  const { data } = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
  });

  for (const row of data as any[]) {
    await prisma.batch.upsert({
      where: { code: row.code },
      update: { name: row.name, desc: row.desc || null },
      create: { code: row.code, name: row.name, desc: row.desc || null },
    });
  }
  console.log(`Seeded ${data.length} batches.`);
}
