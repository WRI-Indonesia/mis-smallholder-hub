import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

/**
 * Get menu keys that a role has VIEW permission for
 */
export async function getAccessibleMenuKeys(role: string): Promise<string[]> {
  const permissions = await prisma.rolePermission.findMany({
    where: {
      role: role as never,
      permission: "VIEW",
      isActive: true,
    },
    select: { menuKey: true },
  });

  return permissions.map((p) => p.menuKey);
}

/**
 * Check if current user can access a specific menu key.
 * Redirects to /admin if not authorized.
 */
export async function requirePermission(menuKey: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role;
  if (role === "SUPERADMIN") return session;

  const hasPermission = await prisma.rolePermission.findFirst({
    where: {
      role: role as never,
      menuKey,
      permission: "VIEW",
      isActive: true,
    },
  });

  if (!hasPermission) redirect("/admin");

  return session;
}

/**
 * Get permission levels the current user has for a specific menu key.
 * Returns array of granted permissions: ["VIEW", "EDIT", "DELETE", "CREATE"]
 */
export async function getUserPermissionsForMenu(menuKey: string): Promise<string[]> {
  const session = await auth();
  if (!session?.user) return [];

  const role = session.user.role;
  if (role === "SUPERADMIN") return ["CREATE", "VIEW", "EDIT", "DELETE"];

  const permissions = await prisma.rolePermission.findMany({
    where: {
      role: role as never,
      menuKey,
      isActive: true,
    },
    select: { permission: true },
  });

  return permissions.map((p) => p.permission);
}
