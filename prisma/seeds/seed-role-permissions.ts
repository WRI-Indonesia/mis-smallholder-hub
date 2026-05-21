import { PrismaClient, Role, PermissionLevel } from "@prisma/client";
import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";
import { join } from "path";

export async function seedRolePermissions(prisma: PrismaClient) {
  const csv = readFileSync(join(__dirname, "data/role-permissions.csv"), "utf-8");
  const records = parse(csv, { columns: true, skip_empty_lines: true });

  for (const row of records) {
    const role = row.role as Role;
    const permission = row.permission as PermissionLevel;

    await prisma.rolePermission.upsert({
      where: {
        role_menuKey_permission: {
          role,
          menuKey: row.menu_key,
          permission,
        },
      },
      update: {},
      create: {
        role,
        menuKey: row.menu_key,
        permission,
      },
    });
  }

  console.log(`  ✓ Role permissions: ${records.length} records`);
}
