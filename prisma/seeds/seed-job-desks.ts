import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import Papa from "papaparse";

interface JobDeskCsvRow {
  code: string;
  name: string;
}

export async function seedJobDesks(prisma: PrismaClient) {
  console.log("Seeding job desks...");

  const filePath = path.resolve(__dirname, "data/job-desks.csv");
  const { data } = Papa.parse<JobDeskCsvRow>(
    fs.readFileSync(filePath, "utf8"),
    { header: true, skipEmptyLines: true }
  );

  for (const row of data) {
    await prisma.jobDesk.upsert({
      where: { code: row.code },
      update: { name: row.name },
      create: { code: row.code, name: row.name },
    });
  }

  console.log(`Seeded ${data.length} job desks.`);
}
