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
import { Leaf } from "lucide-react";

interface MenuItem {
  key: string;
  title: string;
  url: string;
  icon: string | null;
  children: MenuItem[];
}

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
    items: item.children.map((child) => ({
      title: child.title,
      url: child.url,
      icon: child.icon ?? undefined,
    })),
  }));

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
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={{ name: user.name, email: user.email, avatar: "" }} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
