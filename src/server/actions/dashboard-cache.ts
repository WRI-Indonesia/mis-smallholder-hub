"use server";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/types/action-result";

// Helper function to get training participant count by package code
async function getTrainingParticipantCount(packageCode: string): Promise<number> {
  try {
    const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COALESCE(SUM(ta.total_participant), 0)::bigint as count
      FROM "tbl-training-activity" ta
      JOIN "ref-training-package" tpkg ON ta.ref_training_package_id = tpkg.id
      WHERE UPPER(tpkg.code) = UPPER(${packageCode})
    `;
    
    return Number(result[0]?.count || 0);
  } catch (error) {
    console.error(`Error getting training participant count for ${packageCode}:`, error);
    return 0;
  }
}

export async function refreshDashboardCache(): Promise<ActionResult<{ message: string }>> {
  try {
    console.log("🔄 Starting dashboard cache refresh...");

    // 1. Calculate global stats (all districts)
    const globalStats = await prisma.$queryRaw<Array<{
      total_groups: bigint;
      total_farmers: bigint;
      male_farmers: bigint;
      female_farmers: bigint;
      total_parcels: bigint;
      total_area_ha: number | null;
    }>>`
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
        batchId: "ALL",
        totalGroups: Number(global.total_groups),
        totalFarmers: Number(global.total_farmers),
        maleFarmers: Number(global.male_farmers),
        femaleFarmers: Number(global.female_farmers),
        totalParcels: Number(global.total_parcels),
        totalAreaHa: global.total_area_ha || 0,
        trainingPKT: await getTrainingParticipantCount('PKT'),
        trainingBMPGAP: await getTrainingParticipantCount('BMPGAP'),
        trainingPreSertifikasi: await getTrainingParticipantCount('PRE-SERTIFIKASI'),
        calculatedAt: new Date(),
      },
      create: {
        districtId: "GLOBAL",
        batchId: "ALL",
        totalGroups: Number(global.total_groups),
        totalFarmers: Number(global.total_farmers),
        maleFarmers: Number(global.male_farmers),
        femaleFarmers: Number(global.female_farmers),
        totalParcels: Number(global.total_parcels),
        totalAreaHa: global.total_area_ha || 0,
        trainingPKT: 0,
        trainingBMPGAP: 0,
        trainingPreSertifikasi: 0,
        calculatedAt: new Date(),
      },
    });

    // 2. Calculate stats per district
    const districtStats = await prisma.$queryRaw<Array<{
      district_id: string;
      total_groups: bigint;
      total_farmers: bigint;
      male_farmers: bigint;
      female_farmers: bigint;
      total_parcels: bigint;
      total_area_ha: number | null;
    }>>`
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
      GROUP BY fg.district_id
    `;

    for (const district of districtStats) {
      await prisma.dashboardStats.upsert({
        where: {
          districtId_batchId: {
            districtId: district.district_id,
            batchId: "ALL",
          },
        },
        update: {
          batchId: "ALL",
          totalGroups: Number(district.total_groups),
          totalFarmers: Number(district.total_farmers),
          maleFarmers: Number(district.male_farmers),
          femaleFarmers: Number(district.female_farmers),
          totalParcels: Number(district.total_parcels),
          totalAreaHa: district.total_area_ha || 0,
          trainingPKT: await getTrainingParticipantCount('PKT'),
          trainingBMPGAP: await getTrainingParticipantCount('BMPGAP'),
          trainingPreSertifikasi: await getTrainingParticipantCount('PRE-SERTIFIKASI'),
          calculatedAt: new Date(),
        },
        create: {
          districtId: district.district_id,
          batchId: "ALL",
          totalGroups: Number(district.total_groups),
          totalFarmers: Number(district.total_farmers),
          maleFarmers: Number(district.male_farmers),
          femaleFarmers: Number(district.female_farmers),
          totalParcels: Number(district.total_parcels),
          totalAreaHa: district.total_area_ha || 0,
          trainingPKT: await getTrainingParticipantCount('PKT'),
          trainingBMPGAP: await getTrainingParticipantCount('BMPGAP'),
          trainingPreSertifikasi: await getTrainingParticipantCount('PRE-SERTIFIKASI'),
          calculatedAt: new Date(),
        },
      });
    }

    // 3. Calculate stats per farmer group
    const groupStats = await prisma.$queryRaw<Array<{
      farmer_group_id: string;
      location_lat: number | null;
      location_long: number | null;
      district_name: string | null;
      farmer_count: bigint;
      male_farmers: bigint;
      female_farmers: bigint;
      parcel_count: bigint;
      total_area_ha: number | null;
    }>>`
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
      GROUP BY fg.id, fg.location_lat, fg.location_long, d.name
    `;

    for (const group of groupStats) {
      await prisma.dashboardGroupStats.upsert({
        where: {
          farmerGroupId_batchId: {
            farmerGroupId: group.farmer_group_id,
            batchId: "ALL",
          },
        },
        update: {
          batchId: "ALL",
          locationLat: group.location_lat,
          locationLong: group.location_long,
          districtName: group.district_name || "Unknown",
          farmerCount: Number(group.farmer_count),
          maleFarmers: Number(group.male_farmers),
          femaleFarmers: Number(group.female_farmers),
          parcelCount: Number(group.parcel_count),
          totalAreaHa: group.total_area_ha || 0,
          trainingPKT: await getTrainingParticipantCount('PKT'),
          trainingBMPGAP: await getTrainingParticipantCount('BMPGAP'),
          trainingPreSertifikasi: await getTrainingParticipantCount('PRE-SERTIFIKASI'),
          calculatedAt: new Date(),
        },
        create: {
          farmerGroupId: group.farmer_group_id,
          batchId: "ALL",
          locationLat: group.location_lat,
          locationLong: group.location_long,
          districtName: group.district_name || "Unknown",
          farmerCount: Number(group.farmer_count),
          maleFarmers: Number(group.male_farmers),
          femaleFarmers: Number(group.female_farmers),
          parcelCount: Number(group.parcel_count),
          totalAreaHa: group.total_area_ha || 0,
          trainingPKT: await getTrainingParticipantCount('PKT'),
          trainingBMPGAP: await getTrainingParticipantCount('BMPGAP'),
          trainingPreSertifikasi: await getTrainingParticipantCount('PRE-SERTIFIKASI'),
          calculatedAt: new Date(),
        },
      });
    }

    const message = `Dashboard cache refreshed: ${districtStats.length} districts, ${groupStats.length} groups`;
    console.log(`✅ ${message}`);

    return { success: true, data: { message } };
  } catch (error) {
    console.error("❌ Dashboard cache refresh failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to refresh dashboard cache",
    };
  }
}
