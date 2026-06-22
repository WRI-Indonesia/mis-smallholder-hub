import { PrismaClient } from "@prisma/client";
import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";
import { join } from "path";
import bcrypt from "bcryptjs";

export async function seedUsers(prisma: PrismaClient) {
  const csv = readFileSync(join(__dirname, "data/users.csv"), "utf-8");
  const records = parse(csv, { columns: true, skip_empty_lines: true });

  for (const row of records) {
    const hashedPassword = await bcrypt.hash(row.password, 10);

    await prisma.user.upsert({
      where: { id: row.id },
      update: {},
      create: {
        id: row.id,
        name: row.name,
        email: row.email,
        password: hashedPassword,
        role: row.role,
        isActive: row.is_active === "TRUE",
      },
    });
  }

  console.log(`  ✓ Users: ${records.length} records`);
}
