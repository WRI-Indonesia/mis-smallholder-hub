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
import { UserFormValues } from "@/lib/zod/user"
import { deleteUser } from "@/lib/actions/user"

interface UserColumnsProps {
  onEdit: (data: UserFormValues) => void
}

export const getUserColumns = ({
  onEdit,
}: UserColumnsProps): ColumnDef<any>[] => [
  {
    accessorKey: "name",
    header: "Full Name",
    cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>
  },
  {
    accessorKey: "email",
    header: "Email Address",
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => {
       const role = row.getValue("role") as string
       return (
          <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase">
            {role}
          </div>
       )
    }
  },
  {
    accessorKey: "createdAt",
    header: "Added On",
    cell: ({ row }) => {
       const date = new Date(row.getValue("createdAt"))
       return <div>{date.toLocaleDateString()}</div>
    }
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const user = row.original

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
              id: user.id, 
              name: user.name, 
              email: user.email, 
              role: user.role
              // NOTE: Password stays empty on Edit intent
            })}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
              onClick={async () => {
                if (confirm("Are you sure you want to delete this user?")) {
                  const res = await deleteUser(user.id)
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
