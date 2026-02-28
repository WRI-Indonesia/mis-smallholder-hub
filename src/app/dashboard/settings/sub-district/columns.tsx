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
import { SubDistrictFormValues } from "@/lib/zod/sub-district"
import { deleteSubDistrict } from "@/lib/actions/sub-district"

interface SubDistrictColumnsProps {
  onEdit: (data: SubDistrictFormValues) => void
}

export const getSubDistrictColumns = ({
  onEdit,
}: SubDistrictColumnsProps): ColumnDef<any>[] => [
  {
    accessorKey: "code",
    header: "Code",
    cell: ({ row }) => <div className="font-mono text-sm">{row.getValue("code")}</div>
  },
  {
    accessorKey: "name",
    header: "Sub-District Name",
  },
  {
    accessorKey: "district.name",
    header: "District",
    cell: ({ row }) => {
       const districtName = row.original.district?.name || "Unknown"
       return <div>{districtName}</div>
    }
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const subDistrict = row.original

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
              id: subDistrict.id, 
              code: subDistrict.code, 
              name: subDistrict.name,
              districtId: subDistrict.districtId 
            })}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
              onClick={async () => {
                if (confirm("Are you sure you want to delete this sub-district?")) {
                  const res = await deleteSubDistrict(subDistrict.id)
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
