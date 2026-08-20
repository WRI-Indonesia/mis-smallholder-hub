/**
 * Seed HANYA menu + role-permissions, tanpa `prisma db seed` penuh.
 *
 * `db seed` menjalankan seluruh seeder termasuk data master — tidak idempotent
 * dan berbahaya pada DB yang sudah terisi. Skrip ini dipakai saat menu baru
 * perlu didaftarkan ke staging/prod setelah rilis.
 *
 * Jalankan:
 *   npx dotenv -e .env -- npx tsx scripts/seed/seed-menu-only.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { seedMenu } from "../../prisma/seeds/seed-menu";
import { seedRolePermissions } from "../../prisma/seeds/seed-role-permissions";

async function main() {
  console.log("🌱 Starting menu-only seed...\n");

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    console.log("\n--- Menu ---");
    await seedMenu(prisma);

    console.log("\n--- RBAC ---");
    await seedRolePermissions(prisma);

    console.log("\n✅ Menu-only seed completed.");
  } catch (error) {
    console.error("❌ Seed error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
