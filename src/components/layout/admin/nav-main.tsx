"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { ChevronRightIcon } from "lucide-react"
import { ICON_MAP } from "@/lib/icon-map"
import type { NavItem } from "@/components/layout/admin/nav-types"
import { filterNavByQuery } from "@/components/layout/admin/nav-filter"

export function NavMain({
  items,
  openGroups,
  setOpenGroups,
  query,
}: {
  items: NavItem[]
  openGroups: Record<string, boolean>
  setOpenGroups: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  query: string
}) {
  const pathname = usePathname()

  const filtering = query.trim().length > 0
  const displayItems = filterNavByQuery(items, query)

  if (filtering && displayItems.length === 0) {
    return (
      <SidebarGroup>
        <p className="px-2 py-4 text-sm text-muted-foreground">
          Menu tidak ditemukan.
        </p>
      </SidebarGroup>
    )
  }

  return (
    <SidebarGroup>
      <SidebarMenu>
        {displayItems.map((item) => {
          const RootIcon = item.icon ? ICON_MAP[item.icon] : null
 
          // If no sub-items, render a simple link
          if (!item.items || item.items.length === 0) {
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={item.title}
                  isActive={pathname === item.url || pathname.startsWith(item.url + "/")}
                  render={<Link href={item.url} />}
                >
                  {RootIcon && <RootIcon />}
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          }
 
          return (
            <Collapsible
              key={item.title}
              open={filtering || (openGroups[item.title] ?? false)}
              onOpenChange={(open) =>
                setOpenGroups((prev) => ({ ...prev, [item.title]: open }))
              }
              className="group/collapsible"
              render={<SidebarMenuItem />}
            >
              <CollapsibleTrigger
                render={<SidebarMenuButton tooltip={item.title} />}
              >
                {RootIcon && <RootIcon />}
                <span>{item.title}</span>
                <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-open/collapsible:rotate-90" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {item.items?.map((subItem) => {
                    const SubIcon = subItem.icon ? ICON_MAP[subItem.icon] : null
                    
                    // If Level 2 has no children (Level 3)
                    if (!subItem.items || subItem.items.length === 0) {
                      return (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton
                            render={<Link href={subItem.url} />}
                            isActive={pathname === subItem.url}
                            className="pl-4"
                          >
                            {SubIcon && <SubIcon className="size-4 shrink-0" />}
                            <span>{subItem.title}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      )
                    }

                    const isSubCollapsibleOpen = subItem.items.some((ssItem) => pathname === ssItem.url || pathname.startsWith(ssItem.url + "/"));

                    return (
                      <Collapsible
                        key={subItem.title + (filtering ? "-f" : "")}
                        defaultOpen={filtering || isSubCollapsibleOpen}
                        className="group/subcollapsible w-full"
                        render={<SidebarMenuSubItem />}
                      >
                        <CollapsibleTrigger
                          render={
                            <SidebarMenuSubButton
                              isActive={pathname === subItem.url || pathname.startsWith(subItem.url + "/")}
                              className="pl-4 w-full flex items-center justify-between"
                            />
                          }
                        >
                          <div className="flex items-center gap-2">
                            {SubIcon && <SubIcon className="size-4 shrink-0" />}
                            <span>{subItem.title}</span>
                          </div>
                          <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-open/subcollapsible:rotate-90 size-3" />
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="pl-6 flex flex-col gap-1 py-1 border-l ml-6 border-sidebar-border">
                            {subItem.items.map((ssItem) => {
                              const ssActive = pathname === ssItem.url || pathname.startsWith(ssItem.url + "/");
                              return (
                                <Link
                                  key={ssItem.title}
                                  href={ssItem.url}
                                  className={`flex items-center gap-2 py-1.5 pl-4 pr-2 text-xs rounded-md transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
                                    ssActive ? "text-sidebar-accent-foreground font-semibold bg-sidebar-accent" : "text-muted-foreground"
                                  }`}
                                >
                                  <span>•</span>
                                  <span>{ssItem.title}</span>
                                </Link>
                              );
                            })}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )
                  })}
                </SidebarMenuSub>
              </CollapsibleContent>
            </Collapsible>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}

