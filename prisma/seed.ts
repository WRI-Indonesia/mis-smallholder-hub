import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { seedUsers } from "./seeds/seed-users";
import { seedProvinces } from "./seeds/seed-provinces";
import { seedDistricts } from "./seeds/seed-districts";
import { seedSubdistricts } from "./seeds/seed-subdistricts";
import { seedVillages } from "./seeds/seed-villages";
import { seedFarmerGroups } from "./seeds/seed-farmer-groups";
import { seedMenu } from "./seeds/seed-menu";
import { seedRolePermissions } from "./seeds/seed-role-permissions";

async function main() {
  console.log("🌱 Starting seed...\n");

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    // 1. Users (no dependencies)
    console.log("--- Users ---");
    await seedUsers(prisma);

    // 2. Geography (province → district → subdistrict → village)
    console.log("\n--- Geography ---");
    await seedProvinces(prisma);
    await seedDistricts(prisma);
    await seedSubdistricts(prisma);
    await seedVillages(prisma);

    // 3. Farmer Groups (depends on districts)
    console.log("\n--- Farmer Groups ---");
    await seedFarmerGroups(prisma);

    // 4. Menu (no dependencies)
    console.log("\n--- Menu ---");
    await seedMenu(prisma);

    // 5. RBAC (depends on menu)
    console.log("\n--- RBAC ---");
    await seedRolePermissions(prisma);

    console.log("\n✅ Seed completed.");
  } catch (error) {
    console.error("❌ Seed error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
