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
    // Find the training package by code to get the ID
    const trainingPackage = await prisma.trainingPackage.findUnique({
      where: { code: row.packageId },
      select: { id: true },
    });

    if (!trainingPackage) {
      console.warn(`Training package with code ${row.packageId} not found, skipping...`);
      continue;
    }

    await prisma.trainingActivity.create({
      data: {
        farmerGroupId: row.farmerGroupId,
        packageId: trainingPackage.id, // Use the actual ID, not the code
        trainingDate: new Date(row.trainingDate),
        location: row.location,
        createdAt: new Date(),
        modifiedAt: new Date(),
      },
    });
  }
  console.log(`Seeded ${data.length} training activities.`);
}