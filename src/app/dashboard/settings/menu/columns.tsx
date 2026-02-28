"use client"

import * as React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Pencil, Trash } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MenuFormValues } from "@/lib/zod/menu"
import { deleteMenu } from "@/lib/actions/menu"

interface MenuColumnsProps {
  onEdit: (data: MenuFormValues) => void
}

export const getMenuColumns = ({
  onEdit,
}: MenuColumnsProps): ColumnDef<any>[] => [
  {
    accessorKey: "title",
    header: "Menu Title",
    cell: ({ row }) => {
       const isSubmenu = !!row.getValue("parentId")
       return (
          <div className={isSubmenu ? "pl-4 text-muted-foreground" : "font-medium"}>
             {isSubmenu ? "↳ " : ""}{row.getValue("title")}
          </div>
       )
    }
  },
  {
    accessorKey: "url",
    header: "URL Path",
    cell: ({ row }) => <div className="font-mono text-xs">{row.getValue("url")}</div>
  },
  {
    accessorKey: "icon",
    header: "Icon Name",
  },
  {
    accessorKey: "order",
    header: "Sort Order",
  },
  {
    accessorKey: "parentId", // Used just for the render above, but mapped to empty space
    header: "Level",
    cell: ({ row }) => {
       return <div>{row.getValue("parentId") ? "Sub Menu" : "Top Level"}</div>
    }
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const menu = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onEdit({ 
              id: menu.id, 
              title: menu.title, 
              url: menu.url,
              icon: menu.icon,
              parentId: menu.parentId || "none", // Convert backend null to frontend "none"
              order: menu.order
            })}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
              onClick={async () => {
                if (confirm("Are you sure you want to delete this menu link?")) {
                  const res = await deleteMenu(menu.id)
                  if(!res.success) {
                    alert(res.error)
                  }
                }
              }}
            >
              <Trash className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
