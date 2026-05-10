import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import Papa from "papaparse";

export async function seedTrainingActivities(prisma: PrismaClient) {
  console.log("Seeding training activities...");
  const filePath = path.resolve(__dirname, "data/training-activities.csv");
  const { data } = Papa.parse(fs.readFileSync(filePath, "utf8"), {
    header: true,
    skipEmptyLines: true,
  });

  for (const row of data as any[]) {
    await prisma.trainingActivity.create({
      data: {
        farmerGroupId: row.farmerGroupId,
        trainingPackageId: row.trainingPackageId,
        trainingDate: new Date(row.trainingDate),
        location: row.location,
        facilitator: row.facilitator || null,
        notes: row.notes || null,
        createdAt: new Date(),
        modifiedAt: new Date(),
      },
    });
  }
  console.log(`Seeded ${data.length} training activities.`);
}