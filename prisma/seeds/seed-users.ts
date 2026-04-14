import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import Papa from "papaparse";
import bcrypt from "bcryptjs";

export async function seedUsers(prisma: PrismaClient) {
  console.log("Seeding users...");
  const csvFilePath = path.resolve(__dirname, "data/users.csv");
  const fileContent = fs.readFileSync(csvFilePath, "utf8");

  const { data } = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
    comments: "#",
  });

  for (const row of data as any[]) {
    const hashedPassword = bcrypt.hashSync(row.password, 10);
    await prisma.user.upsert({
      where: { email: row.email },
      update: {
        name: row.name,
        role: row.role,
        isActive: row.isActive === "true",
      },
      create: {
        id: row.id,
        name: row.name,
        email: row.email,
        password: hashedPassword,
        role: row.role,
        isActive: row.isActive === "true",
      },
    });
  }
  console.log(`Seeded ${data.length} users.`);
}
