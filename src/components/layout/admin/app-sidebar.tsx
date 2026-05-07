import * as React from "react";
import { AppSidebarClient } from "@/components/layout/admin/app-sidebar-client";
import { getMenuItems } from "@/server/actions/menu";
import type { Sidebar } from "@/components/ui/sidebar";

/**
 * AppSidebar — async Server Component.
 * Fetches menu items from DB and passes them to the client sidebar.
 * Falls back to empty menu on error (non-blocking).
 */
export async function AppSidebar(
  props: React.ComponentProps<typeof Sidebar>
) {
  const result = await getMenuItems();
  const menuItems = result.success ? (result.data ?? []) : [];

  return <AppSidebarClient menuItems={menuItems} {...props} />;
}
