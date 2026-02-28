"use client"

import * as React from "react"
import Link from "next/link"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { SIDEBAR_DATA } from "@/lib/dummy-data/sidebar-list"
import { Logo } from "@/components/ui/logo"
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

// Default fallback data
const fallbackData = {
  user: {
    name: "Guest User",
    email: "guest@example.com",
    avatar: "/avatars/shadcn.jpg", 
    role: "Guest",
  },
  navMain: SIDEBAR_DATA,
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [activeUser, setActiveUser] = React.useState(fallbackData.user)

  // Load user data securely from local storage upon client mount
  React.useEffect(() => {
    try {
       const userStr = localStorage.getItem('user')
       if (userStr) {
          const parsed = JSON.parse(userStr)
          setActiveUser({
             name: parsed.name || "Unknown",
             email: parsed.email || "",
             avatar: "/avatars/shadcn.jpg",
             role: parsed.role || "User"
          })
       }
    } catch (e) {
       console.error("Failed to parse local user profile", e)
    }
  }, [])

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Logo className="size-5" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-bold text-lg">Smallholder Hub</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={fallbackData.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={activeUser} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
