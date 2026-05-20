#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    console.log('🔍 Debugging farmer group data...');
    
    // Check which groups have farmers
    const groupsWithFarmers = await prisma.farmerGroup.findMany({
      where: {
        farmers: {
          some: {}
        }
      },
      select: {
        id: true,
        name: true,
        locationLat: true,
        locationLong: true,
        _count: {
          select: {
            farmers: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    console.log(`\n👥 Groups with farmers (${groupsWithFarmers.length}):`);
    groupsWithFarmers.forEach(g => {
      const hasCoords = g.locationLat && g.locationLong ? '✅' : '❌';
      console.log(`  ${hasCoords} ${g.id}: ${g.name} (${g._count.farmers} farmers)`);
    });

    // Check which groups have coordinates
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
        locationLong: true,
        _count: {
          select: {
            farmers: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    console.log(`\n📍 Groups with coordinates (${groupsWithCoords.length}):`);
    groupsWithCoords.forEach(g => {
      const hasFarmers = g._count.farmers > 0 ? '✅' : '❌';
      console.log(`  ${hasFarmers} ${g.id}: ${g.name} (${g._count.farmers} farmers)`);
    });

    // Find groups with both farmers and coordinates
    const groupsWithBoth = await prisma.farmerGroup.findMany({
      where: {
        AND: [
          { locationLat: { not: null } },
          { locationLong: { not: null } },
          { farmers: { some: {} } }
        ]
      },
      select: {
        id: true,
        name: true,
        locationLat: true,
        locationLong: true,
        _count: {
          select: {
            farmers: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    console.log(`\n🎯 Groups with BOTH farmers AND coordinates (${groupsWithBoth.length}):`);
    groupsWithBoth.forEach(g => {
      console.log(`  ✅ ${g.id}: ${g.name} (${g._count.farmers} farmers) at (${g.locationLat}, ${g.locationLong})`);
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