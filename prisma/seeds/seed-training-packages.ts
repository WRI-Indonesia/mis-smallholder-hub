import { PrismaClient, TrainingCategory } from "@prisma/client";
import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";
import { join } from "path";

export async function seedTrainingPackages(prisma: PrismaClient) {
  const csv = readFileSync(join(__dirname, "data/training-packages.csv"), "utf-8");
  const records = parse(csv, { columns: true, skip_empty_lines: true });

  for (const row of records) {
    await prisma.trainingPackage.upsert({
      where: { code: row.code as TrainingCategory },
      update: {
        name: row.name,
        desc: row.desc || null,
      },
      create: {
        code: row.code as TrainingCategory,
        name: row.name,
        desc: row.desc || null,
      },
    });
  }

  console.log(`  ✓ Training packages: ${records.length} records`);
}
