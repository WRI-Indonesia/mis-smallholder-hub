import { PrismaClient } from "@prisma/client";
import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";
import { join } from "path";
import bcrypt from "bcryptjs";

// Akun contoh fiktif (#390). Password tidak pernah disimpan di repo (publik):
// dibaca dari SEED_USER_PASSWORD, seed gagal bila kosong.
export async function seedUsers(prisma: PrismaClient) {
  const password = process.env.SEED_USER_PASSWORD;
  if (!password || password.length < 12) {
    throw new Error("SEED_USER_PASSWORD wajib diisi (min. 12 karakter) sebelum seed users");
  }

  const csv = readFileSync(join(__dirname, "data/users.csv"), "utf-8");
  const records = parse(csv, { columns: true, skip_empty_lines: true });

  const hashedPassword = await bcrypt.hash(password, 10);

  for (const row of records) {

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
