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
import { DistrictFormValues } from "@/lib/zod/district"
import { deleteDistrict } from "@/lib/actions/district"

interface DistrictColumnsProps {
  onEdit: (data: DistrictFormValues) => void
}

export const getDistrictColumns = ({
  onEdit,
}: DistrictColumnsProps): ColumnDef<any>[] => [
  {
    accessorKey: "code",
    header: "Code",
    cell: ({ row }) => <div className="font-mono text-sm">{row.getValue("code")}</div>
  },
  {
    accessorKey: "name",
    header: "District Name",
  },
  {
    accessorKey: "province.name",
    header: "Province",
    cell: ({ row }) => {
       const provinceName = row.original.province?.name || "Unknown"
       return <div>{provinceName}</div>
    }
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const district = row.original

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
              id: district.id, 
              code: district.code, 
              name: district.name,
              provinceId: district.provinceId 
            })}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
              onClick={async () => {
                if (confirm("Are you sure you want to delete this district?")) {
                  const res = await deleteDistrict(district.id)
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
