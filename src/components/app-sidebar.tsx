"use client"

import * as React from "react"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
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
import { LayoutDashboardIcon, DatabaseIcon, MonitorIcon, WrenchIcon, SettingsIcon, SproutIcon } from "lucide-react"

// Data Navigation Sidebar
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
  navMain: [
    {
      title: "Dashboard",
      url: "/admin/dashboard",
      icon: (
        <LayoutDashboardIcon />
      ),
      isActive: true,
    },
    {
      title: "Master Data",
      url: "#",
      icon: (
        <DatabaseIcon />
      ),
      items: [
        { title: "Data Petani", url: "/admin/master-data/farmers" },
        { title: "Kelompok Tani", url: "/admin/master-data/groups" },
        { title: "Data Lahan", url: "/admin/master-data/parcels" },
        { title: "Region / Wilayah", url: "/admin/master-data/regions" },
      ],
    },
    {
      title: "CMS",
      url: "#",
      icon: (
        <MonitorIcon />
      ),
      items: [
        { title: "Berita & Pengumuman", url: "/admin/cms/news" },
        { title: "Knowledge Management", url: "/admin/cms/knowledge" },
        { title: "Manajemen Komunitas", url: "/admin/cms/community" },
        { title: "Konfigurasi Halaman", url: "/admin/cms/pages" },
      ],
    },
    {
      title: "Tools",
      url: "#",
      icon: (
        <WrenchIcon />
      ),
      items: [
        { title: "Import Data Massal", url: "/admin/tools/import" },
        { title: "Export Laporan", url: "/admin/tools/export" },
        { title: "Geospatial Tools", url: "/admin/tools/geo" },
      ],
    },
    {
      title: "Setting",
      url: "#",
      icon: (
        <SettingsIcon />
      ),
      items: [
        { title: "User Management", url: "/admin/settings/users" },
        { title: "Role & Permission", url: "/admin/settings/roles" },
        { title: "Konfigurasi Sistem", url: "/admin/settings/system" },
      ],
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<a href="/dashboard" />}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <SproutIcon className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-bold text-base">Smallholder HUB</span>
                  <span className="text-xs text-muted-foreground">Admin Panel</span>
                </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
