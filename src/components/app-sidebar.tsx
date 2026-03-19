"use client"

import * as React from "react"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
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
      logo: (
        <SproutIcon />
      ),
      plan: "Admin Panel",
    },
  ],
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: (
        <LayoutDashboardIcon />
      ),
      isActive: true,
      items: [
        { title: "Statistik Utama", url: "/dashboard" },
      ],
    },
    {
      title: "Master Data",
      url: "#",
      icon: (
        <DatabaseIcon />
      ),
      items: [
        { title: "Data Petani", url: "/master-data/farmers" },
        { title: "Kelompok Tani", url: "/master-data/groups" },
        { title: "Data Lahan", url: "/master-data/parcels" },
        { title: "Region / Wilayah", url: "/master-data/regions" },
      ],
    },
    {
      title: "CMS",
      url: "#",
      icon: (
        <MonitorIcon />
      ),
      items: [
        { title: "Berita & Pengumuman", url: "/cms/news" },
        { title: "Knowledge Management", url: "/cms/knowledge" },
        { title: "Manajemen Komunitas", url: "/cms/community" },
        { title: "Konfigurasi Halaman", url: "/cms/pages" },
      ],
    },
    {
      title: "Tools",
      url: "#",
      icon: (
        <WrenchIcon />
      ),
      items: [
        { title: "Import Data Massal", url: "/tools/import" },
        { title: "Export Laporan", url: "/tools/export" },
        { title: "Geospatial Tools", url: "/tools/geo" },
      ],
    },
    {
      title: "Setting",
      url: "#",
      icon: (
        <SettingsIcon />
      ),
      items: [
        { title: "User Management", url: "/settings/users" },
        { title: "Role & Permission", url: "/settings/roles" },
        { title: "Konfigurasi Sistem", url: "/settings/system" },
      ],
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
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
