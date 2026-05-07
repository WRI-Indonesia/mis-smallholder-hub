import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import Papa from "papaparse";

interface MenuCsvRow {
  key: string;
  parentKey: string;
  title: string;
  url: string;
  icon: string;
  order: string;
  isActive: string;
  isVisible: string;
  roles: string;
  groups: string;
  jobDescs: string;
  regions: string;
}

export async function seedMenu(prisma: PrismaClient) {
  console.log("Seeding menu items...");

  const filePath = path.resolve(__dirname, "data/menu.csv");
  const { data } = Papa.parse<MenuCsvRow>(fs.readFileSync(filePath, "utf8"), {
    header: true,
    skipEmptyLines: true,
  });

  // Step 1: Upsert all root items first (no parentKey) to satisfy FK constraint
  const roots = data.filter((row) => !row.parentKey);
  for (const row of roots) {
    await prisma.menuItem.upsert({
      where: { key: row.key },
      update: {
        title: row.title,
        url: row.url,
        icon: row.icon || null,
        order: parseInt(row.order, 10),
        isActive: row.isActive === "true",
        isVisible: row.isVisible === "true",
        roles: row.roles,
        groups: row.groups,
        jobDescs: row.jobDescs,
        regions: row.regions,
        parentKey: null,
      },
      create: {
        key: row.key,
        parentKey: null,
        title: row.title,
        url: row.url,
        icon: row.icon || null,
        order: parseInt(row.order, 10),
        isActive: row.isActive === "true",
        isVisible: row.isVisible === "true",
        roles: row.roles,
        groups: row.groups,
        jobDescs: row.jobDescs,
        regions: row.regions,
      },
    });
  }

  // Step 2: Upsert child items (with parentKey)
  const children = data.filter((row) => !!row.parentKey);
  for (const row of children) {
    await prisma.menuItem.upsert({
      where: { key: row.key },
      update: {
        title: row.title,
        url: row.url,
        icon: row.icon || null,
        order: parseInt(row.order, 10),
        isActive: row.isActive === "true",
        isVisible: row.isVisible === "true",
        roles: row.roles,
        groups: row.groups,
        jobDescs: row.jobDescs,
        regions: row.regions,
        parentKey: row.parentKey,
      },
      create: {
        key: row.key,
        parentKey: row.parentKey,
        title: row.title,
        url: row.url,
        icon: row.icon || null,
        order: parseInt(row.order, 10),
        isActive: row.isActive === "true",
        isVisible: row.isVisible === "true",
        roles: row.roles,
        groups: row.groups,
        jobDescs: row.jobDescs,
        regions: row.regions,
      },
    });
  }

  console.log(`Seeded ${data.length} menu items (${roots.length} root, ${children.length} children).`);
}
