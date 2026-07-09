import * as React from "react";
import { AppSidebarClient } from "@/components/layout/admin/app-sidebar-client";
import { getMenuItems } from "@/server/actions/menu";
import { getAccessibleMenuKeys } from "@/lib/rbac";
import { auth } from "@/lib/auth";
import { filterMenuTreeByAccess } from "@/lib/menu-utils";
import type { Sidebar } from "@/components/ui/sidebar";

export async function AppSidebar(
  props: React.ComponentProps<typeof Sidebar>
) {
  const [result, session] = await Promise.all([getMenuItems(), auth()]);
  const allMenuItems = result.success ? (result.data ?? []) : [];

  const user = {
    name: session?.user?.name ?? "User",
    email: session?.user?.email ?? "",
  };

  const role = session?.user?.role ?? "";

  // SUPERADMIN sees everything
  if (role === "SUPERADMIN") {
    return <AppSidebarClient menuItems={allMenuItems} user={user} {...props} />;
  }

  // Other roles: filter by permission (Set → O(1) membership per node).
  const accessibleKeys = new Set(
    await getAccessibleMenuKeys(role, session?.user?.id)
  );
  const filteredMenuItems = filterMenuTreeByAccess(allMenuItems, accessibleKeys);

  return <AppSidebarClient menuItems={filteredMenuItems} user={user} {...props} />;
}

