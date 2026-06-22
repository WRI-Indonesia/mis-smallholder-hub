#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    console.log('🔍 Checking farmer group coordinates...');
    
    // Check farmer groups with coordinates
    const groupsWithCoords = await prisma.farmerGroup.findMany({
      where: {
        AND: [
          { locationLat: { not: null } },
          { locationLong: { not: null } }
        ]
      },
      select: {
        id: true,
        name: true,
        locationLat: true,
        locationLong: true
      },
      take: 5
    });

    console.log(`📍 Groups with coordinates: ${groupsWithCoords.length}`);
    groupsWithCoords.forEach(g => {
      console.log(`  - ${g.name}: (${g.locationLat}, ${g.locationLong})`);
    });

    // Check total groups
    const totalGroups = await prisma.farmerGroup.count();
    console.log(`📊 Total groups: ${totalGroups}`);

    // Check cache data
    const cacheData = await prisma.dashboardGroupStats.findMany({
      where: {
        AND: [
          { locationLat: { not: null } },
          { locationLong: { not: null } }
        ]
      },
      select: {
        farmerGroupId: true,
        locationLat: true,
        locationLong: true,
        districtName: true,
        farmerCount: true
      },
      take: 5
    });

    console.log(`🗂️  Cache entries with coordinates: ${cacheData.length}`);
    cacheData.forEach(c => {
      console.log(`  - ${c.farmerGroupId}: (${c.locationLat}, ${c.locationLong}) - ${c.farmerCount} farmers`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

require('dotenv').config();
main().catch(console.error);