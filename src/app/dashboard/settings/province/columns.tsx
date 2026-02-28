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
import { ProvinceFormValues } from "@/lib/zod/province"
import { deleteProvince } from "@/lib/actions/province"

interface ProvinceColumnsProps {
  onEdit: (data: ProvinceFormValues) => void
}

export const getProvinceColumns = ({
  onEdit,
}: ProvinceColumnsProps): ColumnDef<any>[] => [
  {
    accessorKey: "code",
    header: "Code",
    cell: ({ row }) => <div className="font-mono text-sm">{row.getValue("code")}</div>
  },
  {
    accessorKey: "name",
    header: "Province Name",
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const province = row.original

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
            <DropdownMenuItem onClick={() => onEdit({ id: province.id, code: province.code, name: province.name })}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
              onClick={async () => {
                if (confirm("Are you sure you want to delete this province?")) {
                  const res = await deleteProvince(province.id)
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
