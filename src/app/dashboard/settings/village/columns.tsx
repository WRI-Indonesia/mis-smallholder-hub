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
import { VillageFormValues } from "@/lib/zod/village"
import { deleteVillage } from "@/lib/actions/village"

interface VillageColumnsProps {
  onEdit: (data: VillageFormValues) => void
}

export const getVillageColumns = ({
  onEdit,
}: VillageColumnsProps): ColumnDef<any>[] => [
  {
    accessorKey: "code",
    header: "Code",
    cell: ({ row }) => <div className="font-mono text-sm">{row.getValue("code")}</div>
  },
  {
    accessorKey: "name",
    header: "Village Name",
  },
  {
    accessorKey: "subDistrict.name",
    header: "Sub-District",
    cell: ({ row }) => {
       const subDistrictName = row.original.subDistrict?.name || "Unknown"
       return <div>{subDistrictName}</div>
    }
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const village = row.original

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
              id: village.id, 
              code: village.code, 
              name: village.name,
              subDistrictId: village.subDistrictId 
            })}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
              onClick={async () => {
                if (confirm("Are you sure you want to delete this village?")) {
                  const res = await deleteVillage(village.id)
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
