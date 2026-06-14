import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cache } from "react";

/**
 * Get effective permissions for all menu items, considering default role permissions,
 * user overrides, and cascading inheritance (from level 1 to level 2 to level 3).
 * Cached per-request to avoid redundant database calls.
 */
export const getEffectiveMenuPermissions = cache(async (role: string, userId?: string): Promise<Record<string, string[]>> => {
  const menuItems = await prisma.menuItem.findMany({
    where: { isActive: true },
    select: { key: true, parentKey: true }
  });

  const rolePermissions = await prisma.rolePermission.findMany({
    where: { role: role as any, isActive: true },
    select: { menuKey: true, permission: true }
  });

  const userOverrides = userId
    ? await prisma.userPermissionOverride.findMany({
        where: { userId, isActive: true },
        select: { menuKey: true, permission: true, granted: true }
      })
    : [];

  const effectiveMap: Record<string, Set<string>> = {};

  // Build tree structures to traverse top-down
  const rootKeys = menuItems.filter(item => !item.parentKey).map(item => item.key);
  const childrenMap: Record<string, string[]> = {};
  menuItems.forEach(item => {
    if (item.parentKey) {
      if (!childrenMap[item.parentKey]) {
        childrenMap[item.parentKey] = [];
      }
      childrenMap[item.parentKey].push(item.key);
    }
  });

  // Traverse tree top-down to resolve permissions
  function traverse(key: string, parentPermissions: Set<string> = new Set()) {
    const currentPerms = new Set(parentPermissions);

    // Apply default role permissions for current node
    const defaults = rolePermissions.filter(rp => rp.menuKey === key).map(rp => rp.permission);
    defaults.forEach(p => currentPerms.add(p));

    // Apply user overrides for current node
    const overrides = userOverrides.filter(uo => uo.menuKey === key);
    overrides.forEach(override => {
      if (override.granted) {
        currentPerms.add(override.permission);
      } else {
        currentPerms.delete(override.permission);
      }
    });

    effectiveMap[key] = currentPerms;

    // Resolve children
    const children = childrenMap[key] || [];
    children.forEach(childKey => {
      traverse(childKey, currentPerms);
    });
  }

  rootKeys.forEach(rootKey => traverse(rootKey));

  // Convert Sets to arrays
  const result: Record<string, string[]> = {};
  for (const key in effectiveMap) {
    result[key] = Array.from(effectiveMap[key]);
  }
  return result;
});

/**
 * Get menu keys that a role has VIEW permission for, considering user permission overrides.
 * Cached per-request to avoid redundant database calls.
 */
export const getAccessibleMenuKeys = cache(async (role: string, userId?: string): Promise<string[]> => {
  let targetUserId = userId;
  if (!targetUserId) {
    const session = await auth();
    targetUserId = session?.user?.id;
  }

  if (role === "SUPERADMIN") {
    const activeMenus = await prisma.menuItem.findMany({
      where: { isActive: true },
      select: { key: true }
    });
    return activeMenus.map(m => m.key);
  }

  const effective = await getEffectiveMenuPermissions(role, targetUserId);
  const accessibleKeys: string[] = [];
  for (const key in effective) {
    if (effective[key].includes("VIEW")) {
      accessibleKeys.push(key);
    }
  }
  return accessibleKeys;
});

/**
 * Check if current user can access a specific menu key.
 * Redirects to /admin if not authorized.
 */
export async function requirePermission(menuKey: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role;
  if (role === "SUPERADMIN") return session;

  const isAllowed = await hasPermission(menuKey, "VIEW");
  if (!isAllowed) redirect("/admin");

  return session;
}

/**
 * Get permission levels the current user has for a specific menu key.
 * Returns array of granted permissions: ["VIEW", "EDIT", "DELETE", "CREATE"]
 * Cached per-request to avoid redundant database calls.
 */
export const getUserPermissionsForMenu = cache(async (menuKey: string): Promise<string[]> => {
  const session = await auth();
  if (!session?.user) return [];

  const role = session.user.role;
  if (role === "SUPERADMIN") return ["CREATE", "VIEW", "EDIT", "DELETE"];

  const effective = await getEffectiveMenuPermissions(role, session.user.id);
  return effective[menuKey] || [];
});

/**
 * Verify if current user has a specific permission for a menu key.
 * Used inside Server Actions.
 */
export async function hasPermission(menuKey: string, permission: string): Promise<boolean> {
  const permissions = await getUserPermissionsForMenu(menuKey);
  return permissions.includes(permission);
}


