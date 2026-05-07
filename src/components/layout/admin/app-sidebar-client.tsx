"use client";

import * as React from "react";
import { NavMain } from "@/components/layout/admin/nav-main";
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
import { filterNavItems, type UserContext } from "@/lib/static-data/admin/menu-utils";
import type { MenuItemTree } from "@/server/actions/menu";
import { Leaf } from "lucide-react";

// Mock User Context — will come from NextAuth session in RBAC milestone
const currentUserContext: UserContext = {
  role: "admin",
  group: "WRI",
  jobDesc: "manager",
  region: "all",
};

const userData = {
  name: "Admin Super",
  email: "admin@sh-hub.id",
  avatar: "/avatars/user.jpg",
};

interface AppSidebarClientProps extends React.ComponentProps<typeof Sidebar> {
  menuItems: MenuItemTree[];
}

export function AppSidebarClient({ menuItems, ...props }: AppSidebarClientProps) {
  // Convert MenuItemTree to the shape NavMain expects, applying RBAC filter
  const navItems = filterNavItems(
    menuItems.map((item) => ({
      title: item.title,
      url: item.url,
      icon: item.icon ?? undefined,
      isActive: item.isActive,
      rbac: {
        roles: item.roles.split("|") as never[],
        groups: item.groups.split("|") as never[],
        jobDescs: item.jobDescs.split("|") as never[],
        regions: item.regions.split("|") as never[],
      },
      items: item.children.map((child) => ({
        title: child.title,
        url: child.url,
        icon: child.icon ?? undefined,
        rbac: {
          roles: child.roles.split("|") as never[],
          groups: child.groups.split("|") as never[],
          jobDescs: child.jobDescs.split("|") as never[],
          regions: child.regions.split("|") as never[],
        },
      })),
    })),
    currentUserContext
  );

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<a href="/admin/dashboard" />}>
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
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
