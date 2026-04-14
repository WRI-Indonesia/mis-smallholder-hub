import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// Phase 2.1 — Foundations
import { seedUsers } from "./seeds/seed-users";
import { seedProvinces } from "./seeds/seed-provinces";
import { seedDistricts } from "./seeds/seed-districts";

// Phase 2.2 — Core Entities
import { seedFarmerGroupTypes } from "./seeds/seed-farmer-group-types";
import { seedFarmerGroups } from "./seeds/seed-farmer-groups";
import { seedBatches } from "./seeds/seed-batches";
import { seedCommodities } from "./seeds/seed-commodities";
import { seedFarmers } from "./seeds/seed-farmers";

// Phase 2.3 — Activity Reference Data
import { seedMaintenanceTypes } from "./seeds/seed-maintenance-types";
import { seedCertificationTypes } from "./seeds/seed-certification-types";
import { seedTrainingPackages } from "./seeds/seed-training-packages";
import { seedAuditTypes } from "./seeds/seed-audit-types";

async function main() {
  console.log("🌱 Starting seeding process...\n");

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    // Phase 2.1 — Foundations (must run first; others depend on these)
    console.log("--- Phase 2.1: Foundations ---");
    await seedUsers(prisma);
    await seedProvinces(prisma);
    await seedDistricts(prisma);

    // Phase 2.2 — Core Entities (depends on Phase 2.1)
    console.log("\n--- Phase 2.2: Core Entities ---");
    await seedFarmerGroupTypes(prisma);
    await seedFarmerGroups(prisma);    // depends on: districts
    await seedBatches(prisma);
    await seedCommodities(prisma);
    await seedFarmers(prisma);         // depends on: farmerGroups, batches

    // Phase 2.3 — Activity Reference Data (no FK dependencies)
    console.log("\n--- Phase 2.3: Activity Reference Data ---");
    await seedMaintenanceTypes(prisma);
    await seedCertificationTypes(prisma);
    await seedTrainingPackages(prisma);
    await seedAuditTypes(prisma);

    console.log("\n✅ All seeding completed successfully.");
  } catch (error) {
    console.error("❌ Error during seeding:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
