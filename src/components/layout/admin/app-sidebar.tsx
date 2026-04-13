"use client"

import * as React from "react"
import { NavMain } from "@/components/layout/admin/nav-main"
import { NavUser } from "@/components/layout/admin/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { adminMenu, filterNavItems, type UserContext } from "@/lib/static-data/admin/menu"
import { Leaf } from "lucide-react"

// Data Navigation Sidebar User Profile
const data = {
  user: {
    name: "Admin Super",
    email: "admin@sh-hub.id",
    avatar: "/avatars/user.jpg",
  },
  teams: [
    {
      name: "Smallholder HUB",
      plan: "Admin Panel",
    },
  ],
}

// Mock User Context (This will later come from NextAuth session)
const currentUserContext: UserContext = {
  role: "admin",      // Try changing to "operator" or "user"
  group: "WRI",       // Try changing to "UL"
  jobDesc: "manager", // Try changing to "fasilitator"
  region: "all"
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
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
                  <span className="font-extrabold text-base tracking-tight">Smallholder HUB</span>
                </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={filterNavItems(adminMenu, currentUserContext)} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
