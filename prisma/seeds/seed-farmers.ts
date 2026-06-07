import { PrismaClient } from "@prisma/client";
import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";
import { join } from "path";

function parseBirthDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === "") return null;
  
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-based month
    let year = parseInt(parts[2], 10);
    
    if (year < 100) {
      year = year > 30 ? 1900 + year : 2000 + year;
    }
    
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  return null;
}

export async function seedFarmers(prisma: PrismaClient) {
  const csv = readFileSync(join(__dirname, "data/farmer.csv"), "utf-8");
  const records = parse(csv, { columns: true, skip_empty_lines: true });

  let count = 0;
  for (const row of records) {
    const id = row.id?.trim();
    if (!id) continue;

    const groupId = row.tbl_farmer_group_id?.trim();
    // Validate if the farmer group exists in the database
    if (groupId) {
      const groupExists = await prisma.farmerGroup.findUnique({
        where: { id: groupId }
      });
      if (!groupExists) {
        // Skip or warn
        continue;
      }
    } else {
      continue;
    }

    const rawGender = row.Gender?.trim();
    const gender = rawGender === "F" ? "F" : "M";

    await prisma.farmer.upsert({
      where: { id },
      update: {},
      create: {
        id,
        farmerGroupId: groupId,
        gender,
        name: row["Farmers Name"] || "Unnamed Farmer",
        farmerId: row.FarmerID || id,
        nik: row.NIK || null,
        address: row.Address || null,
        birthPlace: row["Tempat Lahir"] || null,
        birthDate: parseBirthDate(row["Tanggal Lahir"]),
      },
    });
    count++;
  }

  console.log(`  ✓ Farmers: ${count} records seeded`);
}
