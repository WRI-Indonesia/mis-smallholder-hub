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
      items?: {
        title: string
        url: string
        icon?: string
      }[]
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
                        key={subItem.title}
                        defaultOpen={isSubCollapsibleOpen}
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

