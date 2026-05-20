#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    console.log('🔍 Checking database tables...');
    
    // Check if cache tables exist by trying to count records
    try {
      const statsCount = await prisma.dashboardStats.count();
      console.log(`✅ cache-dashboard-stats table exists with ${statsCount} records`);
    } catch (error) {
      console.log(`❌ cache-dashboard-stats table missing: ${error.message}`);
    }

    try {
      const groupStatsCount = await prisma.dashboardGroupStats.count();
      console.log(`✅ cache-dashboard-group-stats table exists with ${groupStatsCount} records`);
    } catch (error) {
      console.log(`❌ cache-dashboard-group-stats table missing: ${error.message}`);
    }

    try {
      const districtsCount = await prisma.district.count();
      console.log(`✅ reg-district table exists with ${districtsCount} records`);
    } catch (error) {
      console.log(`❌ reg-district table missing: ${error.message}`);
    }

    try {
      const batchesCount = await prisma.batch.count();
      console.log(`✅ ref-batch table exists with ${batchesCount} records`);
    } catch (error) {
      console.log(`❌ ref-batch table missing: ${error.message}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

require('dotenv').config();
main().catch(console.error);