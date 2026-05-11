#!/usr/bin/env node

/**
 * Dashboard Cache Refresh Script
 * 
 * This script refreshes the dashboard cache tables with current statistics.
 * Run this script manually or set it up as a cron job to run every hour at 00:00.
 * 
 * Usage:
 *   node scripts/refresh-dashboard-cache.js
 *   
 * Environment:
 *   Requires DATABASE_URL to be set in .env file
 */

const { PrismaClient, Prisma } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

function parseArgs(argv) {
  const args = { help: false, clean: false, districtId: undefined, batchId: undefined };

  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--help" || a === "-h") args.help = true;
    else if (a === "--clean") args.clean = true;
    else if (a === "--district" || a === "--districtId") args.districtId = argv[++i];
    else if (a === "--batch" || a === "--batchId") args.batchId = argv[++i];
    else {
      console.error(`❌ Unknown arg: ${a}`);
      args.help = true;
    }
  }

  return args;
}

function printHelp() {
  console.log(`
Dashboard Cache Refresh Script

Usage:
  node scripts/refresh-dashboard-cache.js [options]

Options:
  -h, --help                  Show this help
  --district <districtId>     Only refresh for a district (stats + groups)
  --batch <batchId|ALL>       Only refresh for a batch (use ALL for all batches)
  --clean                     Delete cache rows outside the selected scope

Env:
  DATABASE_URL (required)
`.trim());
}

function toNumber(v) {
  // Prisma can return bigint for COUNT() depending on driver.
  if (typeof v === "bigint") return Number(v);
  return Number(v ?? 0);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  console.log('🔄 Starting dashboard cache refresh...');
  console.log(`📅 ${new Date().toISOString()}`);

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const scopeDistrictId = args.districtId;
    const scopeBatchId = args.batchId;
    const refreshAllBatches = !scopeBatchId || scopeBatchId === "ALL";

    // 1. Calculate global stats (all districts, all batches) unless district scoped
    console.log('📊 Calculating global statistics...');
    if (!scopeDistrictId) {
      const globalStats = await prisma.$queryRaw`
      SELECT 
        COUNT(DISTINCT fg.id)::bigint as total_groups,
        COUNT(DISTINCT f.id)::bigint as total_farmers,
        COUNT(DISTINCT CASE WHEN f.gender = 'L' THEN f.id END)::bigint as male_farmers,
        COUNT(DISTINCT CASE WHEN f.gender = 'P' THEN f.id END)::bigint as female_farmers,
        COUNT(DISTINCT lp.id)::bigint as total_parcels,
        COALESCE(SUM(lp.polygon_size_ha), 0) as total_area_ha
      FROM "tbl-farmer-group" fg
      LEFT JOIN "tbl-farmer" f ON f.farmer_group_id = fg.id
      LEFT JOIN "tbl-land-parcel" lp ON lp.farmer_id = f.id
    `;

      const global = globalStats[0];
      await prisma.dashboardStats.upsert({
        where: {
          districtId_batchId: {
            districtId: "GLOBAL",
            batchId: "ALL",
          },
        },
        update: {
          totalGroups: toNumber(global.total_groups),
          totalFarmers: toNumber(global.total_farmers),
          maleFarmers: toNumber(global.male_farmers),
          femaleFarmers: toNumber(global.female_farmers),
          totalParcels: toNumber(global.total_parcels),
          totalAreaHa: global.total_area_ha || 0,
          trainingPKT: 0,
          trainingBMPGAP: 0,
          trainingPreSertifikasi: 0,
          calculatedAt: new Date(),
        },
        create: {
          districtId: "GLOBAL",
          batchId: "ALL",
          totalGroups: toNumber(global.total_groups),
          totalFarmers: toNumber(global.total_farmers),
          maleFarmers: toNumber(global.male_farmers),
          femaleFarmers: toNumber(global.female_farmers),
          totalParcels: toNumber(global.total_parcels),
          totalAreaHa: global.total_area_ha || 0,
          trainingPKT: 0,
          trainingBMPGAP: 0,
          trainingPreSertifikasi: 0,
          calculatedAt: new Date(),
        },
      });

      console.log(`✅ Global: ${global.total_groups} groups, ${global.total_farmers} farmers, ${global.total_area_ha} ha`);
    } else {
      console.log(`ℹ️  Skipped global stats (scoped to district ${scopeDistrictId})`);
    }

    // 2. Calculate stats per district (all batches)
    console.log('🏘️  Calculating district statistics...');
    const districtStats = await prisma.$queryRaw(Prisma.sql`
      SELECT 
        fg.district_id,
        COUNT(DISTINCT fg.id)::bigint as total_groups,
        COUNT(DISTINCT f.id)::bigint as total_farmers,
        COUNT(DISTINCT CASE WHEN f.gender = 'L' THEN f.id END)::bigint as male_farmers,
        COUNT(DISTINCT CASE WHEN f.gender = 'P' THEN f.id END)::bigint as female_farmers,
        COUNT(DISTINCT lp.id)::bigint as total_parcels,
        COALESCE(SUM(lp.polygon_size_ha), 0) as total_area_ha
      FROM "tbl-farmer-group" fg
      LEFT JOIN "tbl-farmer" f ON f.farmer_group_id = fg.id
      LEFT JOIN "tbl-land-parcel" lp ON lp.farmer_id = f.id
      ${scopeDistrictId ? Prisma.sql`WHERE fg.district_id = ${scopeDistrictId}` : Prisma.empty}
      GROUP BY fg.district_id
    `);

    for (const district of districtStats) {
      await prisma.dashboardStats.upsert({
        where: { 
          districtId_batchId: {
            districtId: district.district_id,
            batchId: "ALL"
          }
        },
        update: {
          totalGroups: toNumber(district.total_groups),
          totalFarmers: toNumber(district.total_farmers),
          maleFarmers: toNumber(district.male_farmers),
          femaleFarmers: toNumber(district.female_farmers),
          totalParcels: toNumber(district.total_parcels),
          totalAreaHa: district.total_area_ha || 0,
          trainingPKT: 0,
          trainingBMPGAP: 0,
          trainingPreSertifikasi: 0,
          calculatedAt: new Date(),
        },
        create: {
          districtId: district.district_id,
          batchId: "ALL",
          totalGroups: toNumber(district.total_groups),
          totalFarmers: toNumber(district.total_farmers),
          maleFarmers: toNumber(district.male_farmers),
          femaleFarmers: toNumber(district.female_farmers),
          totalParcels: toNumber(district.total_parcels),
          totalAreaHa: district.total_area_ha || 0,
          trainingPKT: 0,
          trainingBMPGAP: 0,
          trainingPreSertifikasi: 0,
          calculatedAt: new Date(),
        },
      });
    }

    console.log(`✅ Districts: ${districtStats.length} processed`);

    // 3. Calculate stats per batch (all districts)
    console.log('📅 Calculating batch statistics...');
    const batchStats = refreshAllBatches
      ? await prisma.$queryRaw(Prisma.sql`
      SELECT 
        f.batch_id,
        COUNT(DISTINCT fg.id)::bigint as total_groups,
        COUNT(DISTINCT f.id)::bigint as total_farmers,
        COUNT(DISTINCT CASE WHEN f.gender = 'L' THEN f.id END)::bigint as male_farmers,
        COUNT(DISTINCT CASE WHEN f.gender = 'P' THEN f.id END)::bigint as female_farmers,
        COUNT(DISTINCT lp.id)::bigint as total_parcels,
        COALESCE(SUM(lp.polygon_size_ha), 0) as total_area_ha
      FROM "tbl-farmer" f
      LEFT JOIN "tbl-farmer-group" fg ON fg.id = f.farmer_group_id
      LEFT JOIN "tbl-land-parcel" lp ON lp.farmer_id = f.id
      WHERE f.batch_id IS NOT NULL
      GROUP BY f.batch_id
    `)
      : await prisma.$queryRaw(Prisma.sql`
      SELECT 
        f.batch_id,
        COUNT(DISTINCT fg.id)::bigint as total_groups,
        COUNT(DISTINCT f.id)::bigint as total_farmers,
        COUNT(DISTINCT CASE WHEN f.gender = 'L' THEN f.id END)::bigint as male_farmers,
        COUNT(DISTINCT CASE WHEN f.gender = 'P' THEN f.id END)::bigint as female_farmers,
        COUNT(DISTINCT lp.id)::bigint as total_parcels,
        COALESCE(SUM(lp.polygon_size_ha), 0) as total_area_ha
      FROM "tbl-farmer" f
      LEFT JOIN "tbl-farmer-group" fg ON fg.id = f.farmer_group_id
      LEFT JOIN "tbl-land-parcel" lp ON lp.farmer_id = f.id
      WHERE f.batch_id = ${scopeBatchId}
      GROUP BY f.batch_id
    `);

    for (const batch of batchStats) {
      await prisma.dashboardStats.upsert({
        where: { 
          districtId_batchId: {
            districtId: "GLOBAL",
            batchId: batch.batch_id
          }
        },
        update: {
          totalGroups: toNumber(batch.total_groups),
          totalFarmers: toNumber(batch.total_farmers),
          maleFarmers: toNumber(batch.male_farmers),
          femaleFarmers: toNumber(batch.female_farmers),
          totalParcels: toNumber(batch.total_parcels),
          totalAreaHa: batch.total_area_ha || 0,
          trainingPKT: 0,
          trainingBMPGAP: 0,
          trainingPreSertifikasi: 0,
          calculatedAt: new Date(),
        },
        create: {
          districtId: "GLOBAL",
          batchId: batch.batch_id,
          totalGroups: toNumber(batch.total_groups),
          totalFarmers: toNumber(batch.total_farmers),
          maleFarmers: toNumber(batch.male_farmers),
          femaleFarmers: toNumber(batch.female_farmers),
          totalParcels: toNumber(batch.total_parcels),
          totalAreaHa: batch.total_area_ha || 0,
          trainingPKT: 0,
          trainingBMPGAP: 0,
          trainingPreSertifikasi: 0,
          calculatedAt: new Date(),
        },
      });
    }

    console.log(`✅ Batches: ${batchStats.length} processed`);

    // 4. Calculate stats per district-batch combination
    console.log('🏘️📅 Calculating district-batch combinations...');
    const districtBatchStats = refreshAllBatches
      ? await prisma.$queryRaw(Prisma.sql`
      SELECT 
        fg.district_id,
        f.batch_id,
        COUNT(DISTINCT fg.id)::bigint as total_groups,
        COUNT(DISTINCT f.id)::bigint as total_farmers,
        COUNT(DISTINCT CASE WHEN f.gender = 'L' THEN f.id END)::bigint as male_farmers,
        COUNT(DISTINCT CASE WHEN f.gender = 'P' THEN f.id END)::bigint as female_farmers,
        COUNT(DISTINCT lp.id)::bigint as total_parcels,
        COALESCE(SUM(lp.polygon_size_ha), 0) as total_area_ha
      FROM "tbl-farmer" f
      LEFT JOIN "tbl-farmer-group" fg ON fg.id = f.farmer_group_id
      LEFT JOIN "tbl-land-parcel" lp ON lp.farmer_id = f.id
      WHERE f.batch_id IS NOT NULL
      ${scopeDistrictId ? Prisma.sql`AND fg.district_id = ${scopeDistrictId}` : Prisma.empty}
      GROUP BY fg.district_id, f.batch_id
    `)
      : await prisma.$queryRaw(Prisma.sql`
      SELECT 
        fg.district_id,
        f.batch_id,
        COUNT(DISTINCT fg.id)::bigint as total_groups,
        COUNT(DISTINCT f.id)::bigint as total_farmers,
        COUNT(DISTINCT CASE WHEN f.gender = 'L' THEN f.id END)::bigint as male_farmers,
        COUNT(DISTINCT CASE WHEN f.gender = 'P' THEN f.id END)::bigint as female_farmers,
        COUNT(DISTINCT lp.id)::bigint as total_parcels,
        COALESCE(SUM(lp.polygon_size_ha), 0) as total_area_ha
      FROM "tbl-farmer" f
      LEFT JOIN "tbl-farmer-group" fg ON fg.id = f.farmer_group_id
      LEFT JOIN "tbl-land-parcel" lp ON lp.farmer_id = f.id
      WHERE f.batch_id = ${scopeBatchId}
      ${scopeDistrictId ? Prisma.sql`AND fg.district_id = ${scopeDistrictId}` : Prisma.empty}
      GROUP BY fg.district_id, f.batch_id
    `);

    for (const combo of districtBatchStats) {
      if (!combo.district_id || !combo.batch_id) continue;
      await prisma.dashboardStats.upsert({
        where: { 
          districtId_batchId: {
            districtId: combo.district_id,
            batchId: combo.batch_id
          }
        },
        update: {
          totalGroups: toNumber(combo.total_groups),
          totalFarmers: toNumber(combo.total_farmers),
          maleFarmers: toNumber(combo.male_farmers),
          femaleFarmers: toNumber(combo.female_farmers),
          totalParcels: toNumber(combo.total_parcels),
          totalAreaHa: combo.total_area_ha || 0,
          trainingPKT: 0,
          trainingBMPGAP: 0,
          trainingPreSertifikasi: 0,
          calculatedAt: new Date(),
        },
        create: {
          districtId: combo.district_id,
          batchId: combo.batch_id,
          totalGroups: toNumber(combo.total_groups),
          totalFarmers: toNumber(combo.total_farmers),
          maleFarmers: toNumber(combo.male_farmers),
          femaleFarmers: toNumber(combo.female_farmers),
          totalParcels: toNumber(combo.total_parcels),
          totalAreaHa: combo.total_area_ha || 0,
          trainingPKT: 0,
          trainingBMPGAP: 0,
          trainingPreSertifikasi: 0,
          calculatedAt: new Date(),
        },
      });
    }

    console.log(`✅ District-Batch combinations: ${districtBatchStats.length} processed`);

    // 5. Calculate stats per farmer group (all batches)
    console.log('👥 Calculating farmer group statistics...');
    const groupStats = await prisma.$queryRaw(Prisma.sql`
      SELECT 
        fg.id as farmer_group_id,
        fg.location_lat,
        fg.location_long,
        d.name as district_name,
        COUNT(DISTINCT f.id)::bigint as farmer_count,
        COUNT(DISTINCT CASE WHEN f.gender = 'L' THEN f.id END)::bigint as male_farmers,
        COUNT(DISTINCT CASE WHEN f.gender = 'P' THEN f.id END)::bigint as female_farmers,
        COUNT(DISTINCT lp.id)::bigint as parcel_count,
        COALESCE(SUM(lp.polygon_size_ha), 0) as total_area_ha
      FROM "tbl-farmer-group" fg
      LEFT JOIN "reg-district" d ON d.id = fg.district_id
      LEFT JOIN "tbl-farmer" f ON f.farmer_group_id = fg.id
      LEFT JOIN "tbl-land-parcel" lp ON lp.farmer_id = f.id
      ${scopeDistrictId ? Prisma.sql`WHERE fg.district_id = ${scopeDistrictId}` : Prisma.empty}
      GROUP BY fg.id, fg.location_lat, fg.location_long, d.name
    `);

    for (const group of groupStats) {
      await prisma.dashboardGroupStats.upsert({
        where: { 
          farmerGroupId_batchId: {
            farmerGroupId: group.farmer_group_id,
            batchId: "ALL"
          }
        },
        update: {
          locationLat: group.location_lat,
          locationLong: group.location_long,
          districtName: group.district_name || "Unknown",
          farmerCount: toNumber(group.farmer_count),
          maleFarmers: toNumber(group.male_farmers),
          femaleFarmers: toNumber(group.female_farmers),
          parcelCount: toNumber(group.parcel_count),
          totalAreaHa: group.total_area_ha || 0,
          trainingPKT: 0,
          trainingBMPGAP: 0,
          trainingPreSertifikasi: 0,
          calculatedAt: new Date(),
        },
        create: {
          farmerGroupId: group.farmer_group_id,
          batchId: "ALL",
          locationLat: group.location_lat,
          locationLong: group.location_long,
          districtName: group.district_name || "Unknown",
          farmerCount: toNumber(group.farmer_count),
          maleFarmers: toNumber(group.male_farmers),
          femaleFarmers: toNumber(group.female_farmers),
          parcelCount: toNumber(group.parcel_count),
          totalAreaHa: group.total_area_ha || 0,
          trainingPKT: 0,
          trainingBMPGAP: 0,
          trainingPreSertifikasi: 0,
          calculatedAt: new Date(),
        },
      });
    }

    console.log(`✅ Farmer Groups: ${groupStats.length} processed`);

    // 6. Calculate stats per farmer group per batch
    console.log('👥📅 Calculating farmer group-batch combinations...');
    const groupBatchStats = refreshAllBatches
      ? await prisma.$queryRaw(Prisma.sql`
      SELECT 
        fg.id as farmer_group_id,
        fg.location_lat,
        fg.location_long,
        d.name as district_name,
        f.batch_id,
        COUNT(DISTINCT f.id)::bigint as farmer_count,
        COUNT(DISTINCT CASE WHEN f.gender = 'L' THEN f.id END)::bigint as male_farmers,
        COUNT(DISTINCT CASE WHEN f.gender = 'P' THEN f.id END)::bigint as female_farmers,
        COUNT(DISTINCT lp.id)::bigint as parcel_count,
        COALESCE(SUM(lp.polygon_size_ha), 0) as total_area_ha
      FROM "tbl-farmer" f
      LEFT JOIN "tbl-farmer-group" fg ON fg.id = f.farmer_group_id
      LEFT JOIN "reg-district" d ON d.id = fg.district_id
      LEFT JOIN "tbl-land-parcel" lp ON lp.farmer_id = f.id
      WHERE f.batch_id IS NOT NULL
      ${scopeDistrictId ? Prisma.sql`AND fg.district_id = ${scopeDistrictId}` : Prisma.empty}
      GROUP BY fg.id, fg.location_lat, fg.location_long, d.name, f.batch_id
    `)
      : await prisma.$queryRaw(Prisma.sql`
      SELECT 
        fg.id as farmer_group_id,
        fg.location_lat,
        fg.location_long,
        d.name as district_name,
        f.batch_id,
        COUNT(DISTINCT f.id)::bigint as farmer_count,
        COUNT(DISTINCT CASE WHEN f.gender = 'L' THEN f.id END)::bigint as male_farmers,
        COUNT(DISTINCT CASE WHEN f.gender = 'P' THEN f.id END)::bigint as female_farmers,
        COUNT(DISTINCT lp.id)::bigint as parcel_count,
        COALESCE(SUM(lp.polygon_size_ha), 0) as total_area_ha
      FROM "tbl-farmer" f
      LEFT JOIN "tbl-farmer-group" fg ON fg.id = f.farmer_group_id
      LEFT JOIN "reg-district" d ON d.id = fg.district_id
      LEFT JOIN "tbl-land-parcel" lp ON lp.farmer_id = f.id
      WHERE f.batch_id = ${scopeBatchId}
      ${scopeDistrictId ? Prisma.sql`AND fg.district_id = ${scopeDistrictId}` : Prisma.empty}
      GROUP BY fg.id, fg.location_lat, fg.location_long, d.name, f.batch_id
    `);

    for (const groupBatch of groupBatchStats) {
      if (!groupBatch.farmer_group_id || !groupBatch.batch_id) continue;
      await prisma.dashboardGroupStats.upsert({
        where: { 
          farmerGroupId_batchId: {
            farmerGroupId: groupBatch.farmer_group_id,
            batchId: groupBatch.batch_id
          }
        },
        update: {
          locationLat: groupBatch.location_lat,
          locationLong: groupBatch.location_long,
          districtName: groupBatch.district_name || "Unknown",
          farmerCount: toNumber(groupBatch.farmer_count),
          maleFarmers: toNumber(groupBatch.male_farmers),
          femaleFarmers: toNumber(groupBatch.female_farmers),
          parcelCount: toNumber(groupBatch.parcel_count),
          totalAreaHa: groupBatch.total_area_ha || 0,
          trainingPKT: 0,
          trainingBMPGAP: 0,
          trainingPreSertifikasi: 0,
          calculatedAt: new Date(),
        },
        create: {
          farmerGroupId: groupBatch.farmer_group_id,
          batchId: groupBatch.batch_id,
          locationLat: groupBatch.location_lat,
          locationLong: groupBatch.location_long,
          districtName: groupBatch.district_name || "Unknown",
          farmerCount: toNumber(groupBatch.farmer_count),
          maleFarmers: toNumber(groupBatch.male_farmers),
          femaleFarmers: toNumber(groupBatch.female_farmers),
          parcelCount: toNumber(groupBatch.parcel_count),
          totalAreaHa: groupBatch.total_area_ha || 0,
          trainingPKT: 0,
          trainingBMPGAP: 0,
          trainingPreSertifikasi: 0,
          calculatedAt: new Date(),
        },
      });
    }

    console.log(`✅ Farmer Group-Batch combinations: ${groupBatchStats.length} processed`);

    if (args.clean) {
      console.log("🧹 Cleaning cache outside selected scope...");
      // Stats cleanup
      if (scopeDistrictId && refreshAllBatches) {
        await prisma.dashboardStats.deleteMany({
          where: { NOT: { districtId: scopeDistrictId } },
        });
      } else if (!scopeDistrictId && !refreshAllBatches) {
        await prisma.dashboardStats.deleteMany({
          where: { NOT: { batchId: scopeBatchId } },
        });
      } else if (scopeDistrictId && !refreshAllBatches) {
        await prisma.dashboardStats.deleteMany({
          where: {
            OR: [{ districtId: { not: scopeDistrictId } }, { batchId: { not: scopeBatchId } }],
          },
        });
      }

      // Group stats cleanup
      if (scopeDistrictId && refreshAllBatches) {
        await prisma.dashboardGroupStats.deleteMany({
          where: {
            farmerGroup: { districtId: { not: scopeDistrictId } },
          },
        });
      } else if (!scopeDistrictId && !refreshAllBatches) {
        await prisma.dashboardGroupStats.deleteMany({
          where: { batchId: { not: scopeBatchId } },
        });
      } else if (scopeDistrictId && !refreshAllBatches) {
        await prisma.dashboardGroupStats.deleteMany({
          where: {
            OR: [
              { batchId: { not: scopeBatchId } },
              { farmerGroup: { districtId: { not: scopeDistrictId } } },
            ],
          },
        });
      }
    }

    console.log('\n🎉 Dashboard cache refresh completed successfully!');
    console.log(`📈 Summary: ${districtStats.length} districts, ${batchStats.length} batches, ${groupStats.length} groups`);
    console.log(`⏰ Completed at: ${new Date().toISOString()}`);

  } catch (error) {
    console.error('❌ Dashboard cache refresh failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

// Load environment variables
require('dotenv').config();

const _args = parseArgs(process.argv);
if (_args.help) {
  printHelp();
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

main().catch(console.error);
