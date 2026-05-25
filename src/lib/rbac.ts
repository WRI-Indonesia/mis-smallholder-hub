import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cache } from "react";

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

  const rolePermissions = await prisma.rolePermission.findMany({
    where: {
      role: role as never,
      permission: "VIEW",
      isActive: true,
    },
    select: { menuKey: true },
  });

  let accessibleKeys = rolePermissions.map((p) => p.menuKey);

  if (targetUserId && role !== "SUPERADMIN") {
    const overrides = await prisma.userPermissionOverride.findMany({
      where: {
        userId: targetUserId,
        permission: "VIEW",
        isActive: true,
      },
      select: { menuKey: true, granted: true },
    });

    for (const override of overrides) {
      if (override.granted) {
        if (!accessibleKeys.includes(override.menuKey)) {
          accessibleKeys.push(override.menuKey);
        }
      } else {
        accessibleKeys = accessibleKeys.filter((key) => key !== override.menuKey);
      }
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

  const [rolePermissions, overrides] = await Promise.all([
    prisma.rolePermission.findMany({
      where: {
        role: role as never,
        menuKey,
        isActive: true,
      },
      select: { permission: true },
    }),
    prisma.userPermissionOverride.findMany({
      where: {
        userId: session.user.id,
        menuKey,
        isActive: true,
      },
      select: { permission: true, granted: true },
    }),
  ]);

  let effective = rolePermissions.map((p) => p.permission as string);

  for (const override of overrides) {
    if (override.granted) {
      if (!effective.includes(override.permission)) {
        effective.push(override.permission);
      }
    } else {
      effective = effective.filter((p) => p !== override.permission);
    }
  }

  return effective;
});

/**
 * Verify if current user has a specific permission for a menu key.
 * Used inside Server Actions.
 */
export async function hasPermission(menuKey: string, permission: string): Promise<boolean> {
  const permissions = await getUserPermissionsForMenu(menuKey);
  return permissions.includes(permission);
}

