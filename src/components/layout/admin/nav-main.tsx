"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { ChevronRightIcon } from "lucide-react"
import { ICON_MAP } from "@/lib/icon-map"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: string
    isActive?: boolean
    items?: {
      title: string
      url: string
      icon?: string
    }[]
  }[]
}) {
  const pathname = usePathname()

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Menu Admin</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
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

          const isCollapsibleOpen = item.isActive || item.items?.some((subItem) => pathname.startsWith(subItem.url))

          return (
            <Collapsible
              key={item.title}
              defaultOpen={isCollapsibleOpen}
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
                    return (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton
                          render={<Link href={subItem.url} />}
                          isActive={pathname === subItem.url}
                        >
                          {SubIcon && <SubIcon className="size-4 shrink-0" />}
                          <span>{subItem.title}</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
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
