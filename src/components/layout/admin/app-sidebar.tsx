import * as React from "react";
import { AppSidebarClient } from "@/components/layout/admin/app-sidebar-client";
import { getMenuItems } from "@/server/actions/menu";
import { getAccessibleMenuKeys } from "@/lib/rbac";
import { auth } from "@/lib/auth";
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

  // Other roles: filter by permission
  const accessibleKeys = await getAccessibleMenuKeys(role, session?.user?.id);
 
  function filterMenuTree(items: any[]): any[] {
    return items
      .filter((item) => accessibleKeys.includes(item.key))
      .map((item) => ({
        ...item,
        children: filterMenuTree(item.children || []),
      }))
      .filter((item) => (item.children && item.children.length > 0) || accessibleKeys.includes(item.key));
  }
 
  const filteredMenuItems = filterMenuTree(allMenuItems);
 
  return <AppSidebarClient menuItems={filteredMenuItems} user={user} {...props} />;
}

