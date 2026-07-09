"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { NavMain } from "@/components/layout/admin/nav-main";
import { NavSearch } from "@/components/layout/admin/nav-search";
import { NavUser } from "@/components/layout/admin/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Leaf } from "lucide-react";
import type { MenuItem } from "@/lib/menu-utils";
 
interface AppSidebarClientProps extends React.ComponentProps<typeof Sidebar> {
  menuItems: MenuItem[];
  user: { name: string; email: string };
}


export function AppSidebarClient({ menuItems, user, ...props }: AppSidebarClientProps) {
  const navItems = menuItems.map((item) => ({
    title: item.title,
    url: item.url,
    icon: item.icon ?? undefined,
    isActive: true,
    items: (item.children || []).map((child) => ({
      title: child.title,
      url: child.url,
      icon: child.icon ?? undefined,
      items: child.children?.map((gchild) => ({
        title: gchild.title,
        url: gchild.url,
        icon: gchild.icon ?? undefined,
      })),
    })),
  }));

  const pathname = usePathname();

  // Open-state for top-level groups; shared so "Tutup semua" can close them all.
  // Initialised once: open only groups that contain the active route.
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>(
    () => {
      const initial: Record<string, boolean> = {};
      for (const item of navItems) {
        if (!item.items || item.items.length === 0) continue;
        initial[item.title] =
          !!item.isActive ||
          item.items.some((subItem) => pathname.startsWith(subItem.url));
      }
      return initial;
    }
  );

  const collapseAll = () =>
    setOpenGroups((prev) => {
      const next: Record<string, boolean> = {};
      for (const key of Object.keys(prev)) next[key] = false;
      return next;
    });

  const [query, setQuery] = React.useState("");

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<a href="/admin" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-white text-[#166534] shadow-sm ring-1 ring-border/20">
                <Leaf className="size-5" strokeWidth={2.5} />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-extrabold text-base tracking-tight">
                  Smallholder HUB
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <NavSearch
          query={query}
          setQuery={setQuery}
          onCollapseAll={collapseAll}
        />
      </SidebarHeader>
      <SidebarContent>
        <NavMain
          items={navItems}
          openGroups={openGroups}
          setOpenGroups={setOpenGroups}
          query={query}
        />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={{ name: user.name, email: user.email, avatar: "" }} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
