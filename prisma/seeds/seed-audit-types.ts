import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import Papa from "papaparse";

export async function seedAuditTypes(prisma: PrismaClient) {
  console.log("Seeding audit types...");
  const filePath = path.resolve(__dirname, "data/audit-types.csv");
  const { data } = Papa.parse(fs.readFileSync(filePath, "utf8"), {
    header: true,
    skipEmptyLines: true,
  });

  for (const row of data as any[]) {
    await prisma.auditType.upsert({
      where: { code: row.code },
      update: { name: row.name, desc: row.desc || null },
      create: { code: row.code, name: row.name, desc: row.desc || null },
    });
  }
  console.log(`Seeded ${data.length} audit types.`);
}
