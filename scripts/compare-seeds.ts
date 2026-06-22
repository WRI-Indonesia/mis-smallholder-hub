import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";
import { join } from "path";

async function compare() {
  console.log("Comparing database records with CSV seed files...\n");

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const dataDir = join(__dirname, "../prisma/seeds/data");

    // 1. Users
    const usersCsv = parse(readFileSync(join(dataDir, "users.csv"), "utf-8"), { columns: true });
    const dbUsers = await prisma.user.findMany();
    compareTable("User", usersCsv, dbUsers, "id", (csv, db) => {
      if (csv.name !== db.name) return `name mismatch: CSV='${csv.name}', DB='${db.name}'`;
      if (csv.email !== db.email) return `email mismatch: CSV='${csv.email}', DB='${db.email}'`;
      if (csv.role !== db.role) return `role mismatch: CSV='${csv.role}', DB='${db.role}'`;
      if ((csv.is_active === "TRUE") !== db.isActive) return `isActive mismatch`;
      return null;
    });

    // 2. Provinces
    const provsCsv = parse(readFileSync(join(dataDir, "provinces.csv"), "utf-8"), { columns: true });
    const dbProvs = await prisma.province.findMany();
    compareTable("Province", provsCsv, dbProvs, "id", (csv, db) => {
      if (csv.code !== db.code) return `code mismatch`;
      if (csv.name !== db.name) return `name mismatch`;
      return null;
    });

    // 3. Districts
    const distsCsv = parse(readFileSync(join(dataDir, "districts.csv"), "utf-8"), { columns: true });
    const dbDists = await prisma.district.findMany();
    compareTable("District", distsCsv, dbDists, "id", (csv, db) => {
      if (csv.province_id !== db.provinceId) return `provinceId mismatch`;
      if (csv.code !== db.code) return `code mismatch`;
      if (csv.name !== db.name) return `name mismatch`;
      return null;
    });

    // 4. Subdistricts
    const subsCsv = parse(readFileSync(join(dataDir, "subdistricts.csv"), "utf-8"), { columns: true });
    const dbSubs = await prisma.subdistrict.findMany();
    compareTable("Subdistrict", subsCsv, dbSubs, "id", (csv, db) => {
      if (csv.district_id !== db.districtId) return `districtId mismatch`;
      if (csv.code !== db.code) return `code mismatch`;
      if (csv.name !== db.name) return `name mismatch`;
      return null;
    });

    // 5. Villages
    const vilsCsv = parse(readFileSync(join(dataDir, "villages.csv"), "utf-8"), { columns: true });
    const dbVils = await prisma.village.findMany();
    compareTable("Village", vilsCsv, dbVils, "id", (csv, db) => {
      if (csv.subdistrict_id !== db.subdistrictId) return `subdistrictId mismatch`;
      if (csv.code !== db.code) return `code mismatch`;
      if (csv.name !== db.name) return `name mismatch`;
      return null;
    });

    // 6. Farmer Groups
    const groupsCsv = parse(readFileSync(join(dataDir, "farmer-groups.csv"), "utf-8"), { columns: true });
    const dbGroups = await prisma.farmerGroup.findMany();
    compareTable("FarmerGroup", groupsCsv, dbGroups, "id", (csv, db) => {
      if (csv.district_id !== db.districtId) return `districtId mismatch`;
      if ((csv.code || null) !== db.code) return `code mismatch`;
      if ((csv.abrv || null) !== db.abrv) return `abrv mismatch`;
      if ((csv.abrv_3id || null) !== db.abrv3id) return `abrv3id mismatch`;
      if (csv.name !== db.name) return `name mismatch`;
      if (csv.category !== db.category) return `category mismatch`;
      const csvYear = csv.join_year ? parseInt(csv.join_year, 10) : null;
      if (csvYear !== db.joinYear) return `joinYear mismatch: CSV=${csvYear}, DB=${db.joinYear}`;
      const csvLat = csv.location_lat ? parseFloat(csv.location_lat) : null;
      if (csvLat !== db.locationLat) return `locationLat mismatch: CSV=${csvLat}, DB=${db.locationLat}`;
      const csvLong = csv.location_long ? parseFloat(csv.location_long) : null;
      if (csvLong !== db.locationLong) return `locationLong mismatch: CSV=${csvLong}, DB=${db.locationLong}`;
      return null;
    });

    // 7. Menu
    const menuCsv = parse(readFileSync(join(dataDir, "menu.csv"), "utf-8"), { columns: true });
    const dbMenu = await prisma.menuItem.findMany();
    compareTable("MenuItem", menuCsv, dbMenu, "key", (csv, db) => {
      if ((csv.parent_key || null) !== db.parentKey) return `parentKey mismatch`;
      if (csv.title !== db.title) return `title mismatch`;
      if (csv.url !== db.url) return `url mismatch`;
      if ((csv.icon || null) !== db.icon) return `icon mismatch`;
      if (parseInt(csv.order, 10) !== db.order) return `order mismatch: CSV=${csv.order}, DB=${db.order}`;
      if ((csv.is_active === "TRUE") !== db.isActive) return `isActive mismatch`;
      if ((csv.is_visible === "TRUE") !== db.isVisible) return `isVisible mismatch`;
      return null;
    });

    // 8. Role Permissions
    const rpCsv = parse(readFileSync(join(dataDir, "role-permissions.csv"), "utf-8"), { columns: true });
    const dbRp = await prisma.rolePermission.findMany({ include: { menu: true } });
    
    const dbRpSet = new Set(dbRp.map((rp) => `${rp.role}_${rp.menu.key}_${rp.permission}`));
    let missingRpInDb = 0;
    rpCsv.forEach((csvRow: any) => {
      const csvKey = `${csvRow.role}_${csvRow.menu_key}_${csvRow.permission}`;
      if (!dbRpSet.has(csvKey)) {
        missingRpInDb++;
        console.log(`[RolePermission] Missing in DB: Role=${csvRow.role}, Menu=${csvRow.menu_key}, Permission=${csvRow.permission}`);
      }
    });

    const extraRpInDb = dbRp.length - (rpCsv.length - missingRpInDb);
    if (extraRpInDb > 0) {
      console.log(`[RolePermission] DB has ${extraRpInDb} extra records not in CSV:`);
      const csvRpKeys = new Set(rpCsv.map((r: any) => `${r.role}_${r.menu_key}_${r.permission}`));
      dbRp.forEach((rp) => {
        const dbKey = `${rp.role}_${rp.menu.key}_${rp.permission}`;
        if (!csvRpKeys.has(dbKey)) {
          console.log(`  - Extra DB Record: Role=${rp.role}, Menu=${rp.menu.key}, Permission=${rp.permission}`);
        }
      });
    }

    if (missingRpInDb === 0 && extraRpInDb === 0) {
      console.log(`✅ [RolePermission] database matches CSV exactly (${rpCsv.length} records).`);
    } else {
      console.log(`❌ [RolePermission] mismatch summary: ${missingRpInDb} missing, ${extraRpInDb} extra in DB.`);
    }
    console.log();

    // Print CSV Row for extra users
    dbUsers.forEach((row) => {
      if (!new Set(usersCsv.map((r) => r.id)).has(row.id)) {
        console.log(`EXTRA_USER_CSV: ${row.id},${row.name},${row.email},admin123,${row.role},${row.isActive ? "TRUE" : "FALSE"}`);
      }
    });

    // Print CSV Row for extra groups
    dbGroups.forEach((row) => {
      if (!new Set(groupsCsv.map((r) => r.id)).has(row.id)) {
        console.log(`EXTRA_GROUP_CSV: ${row.id},${row.districtId},${row.code || ""},${row.abrv || ""},${row.abrv3id || ""},${row.name},${row.category},${row.joinYear || ""},${row.locationLat || ""},${row.locationLong || ""}`);
      }
    });

    // Print CSV Row for extra menu items
    dbMenu.forEach((row) => {
      if (!new Set(menuCsv.map((r) => r.key)).has(row.key)) {
        console.log(`EXTRA_MENU_CSV: ${row.key},${row.parentKey || ""},${row.title},${row.url},${row.icon || ""},${row.order},${row.isActive ? "TRUE" : "FALSE"},${row.isVisible ? "TRUE" : "FALSE"}`);
      }
    });

  } catch (err) {
    console.error("Comparison error:", err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

function compareTable(
  tableName: string,
  csvRows: any[],
  dbRows: any[],
  idKey: string,
  diffFn: (csv: any, db: any) => string | null
) {
  const dbMap = new Map<string, any>();
  dbRows.forEach((row) => dbMap.set(String(row[idKey]), row));

  let missingInDb = 0;
  let mismatches = 0;

  csvRows.forEach((csvRow) => {
    const id = String(csvRow[idKey === "id" && !csvRow.id ? "key" : idKey]);
    const dbRow = dbMap.get(id);

    if (!dbRow) {
      missingInDb++;
      console.log(`[${tableName}] ID ${id} is in CSV but missing in DB`);
    } else {
      const diff = diffFn(csvRow, dbRow);
      if (diff) {
        mismatches++;
        console.log(`[${tableName}] ID ${id} mismatch: ${diff}`);
      }
    }
  });

  const extraInDb = dbRows.length - (csvRows.length - missingInDb);
  if (extraInDb > 0) {
    console.log(`[${tableName}] DB has ${extraInDb} extra records not in CSV:`);
    const csvIds = new Set(csvRows.map((r) => String(r[idKey === "id" && !r.id ? "key" : idKey])));
    dbRows.forEach((row) => {
      const id = String(row[idKey]);
      if (!csvIds.has(id)) {
        console.log(`  - Extra DB Record: Key/ID=${id}, Info=${row.name || row.title || row.email || ""}`);
      }
    });
  }

  if (missingInDb === 0 && mismatches === 0 && extraInDb === 0) {
    console.log(`✅ [${tableName}] database matches CSV exactly (${csvRows.length} records).`);
  } else {
    console.log(`❌ [${tableName}] mismatch summary: ${missingInDb} missing, ${mismatches} mismatched, ${extraInDb} extra in DB.`);
  }
  console.log();
}

compare();
