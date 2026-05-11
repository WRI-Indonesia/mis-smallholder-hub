#!/usr/bin/env node

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const total = await prisma.dashboardGroupStats.count();

    const withCoords = await prisma.dashboardGroupStats.count({
      where: {
        AND: [{ locationLat: { not: null } }, { locationLong: { not: null } }],
      },
    });

    const batchBreakdown = await prisma.dashboardGroupStats.groupBy({
      by: ["batchId"],
      _count: { _all: true },
    });

    const examplesMissingCoords = await prisma.dashboardGroupStats.findMany({
      where: {
        OR: [{ locationLat: null }, { locationLong: null }],
      },
      select: {
        farmerGroupId: true,
        batchId: true,
        districtName: true,
        locationLat: true,
        locationLong: true,
      },
      take: 5,
      orderBy: { updatedAt: "desc" },
    });

    console.log("📊 cache-dashboard-group-stats summary");
    console.log(`- total rows: ${total}`);
    console.log(`- rows with coords: ${withCoords}`);
    console.log("- by batchId:");
    batchBreakdown
      .sort((a, b) => a.batchId.localeCompare(b.batchId))
      .forEach((b) => console.log(`  - ${b.batchId}: ${b._count._all}`));

    if (examplesMissingCoords.length > 0) {
      console.log("\n⚠️ examples missing coords (max 5):");
      for (const ex of examplesMissingCoords) {
        console.log(
          `- ${ex.farmerGroupId} batch=${ex.batchId} district=${ex.districtName} lat=${ex.locationLat} lng=${ex.locationLong}`
        );
      }
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

require("dotenv").config();
main().catch((e) => {
  console.error("❌ Error:", e);
  process.exitCode = 1;
});

