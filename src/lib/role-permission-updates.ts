import type { PermissionLevel, Role } from "@prisma/client";

export interface RolePermissionUpdate {
  role: Role;
  menuKey: string;
  permission: PermissionLevel;
  granted: boolean;
}

/**
 * Normalisasi payload `setRolePermissions` (pure, tanpa DB): dedup per
 * (role, menuKey, permission) — entri terakhir menang — dan buang entri
 * SUPERADMIN, karena SUPERADMIN bypass RBAC sehingga permission-nya tidak
 * boleh diatur dari UI (keputusan governance, lih. rbac.md).
 */
export function normalizeRolePermissionUpdates(updates: RolePermissionUpdate[]): RolePermissionUpdate[] {
  const byKey = new Map<string, RolePermissionUpdate>();
  for (const u of updates) {
    if (u.role !== "SUPERADMIN") byKey.set(`${u.role}|${u.menuKey}|${u.permission}`, u);
  }
  return [...byKey.values()];
}
