"use client"

import * as React from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { getMenuColumns } from "./columns"
import { MenuFormModal } from "@/components/menu-form-modal"
import { MenuFormValues } from "@/lib/zod/menu"
import { Menu } from "@prisma/client"

interface MenuClientProps {
  data: any[]
}

export function MenuClient({ data }: MenuClientProps) {
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [editingData, setEditingData] = React.useState<MenuFormValues | null>(null)

  const handleEdit = (rowValue: MenuFormValues) => {
    setEditingData(rowValue)
    setIsModalOpen(true)
  }

  const handleAddNew = () => {
    setEditingData(null)
    setIsModalOpen(true)
  }

  const columns = getMenuColumns({ onEdit: handleEdit })

  // For the modal select dropdown, we only want to allow Top Level menus to be parents (no triple nesting logic to keep it simple)
  // Or we just pass all menus and let the user attach it to whichever
  const availableMenus = data as Menu[]

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={handleAddNew}>
          <Plus className="mr-2 h-4 w-4" />
          Add Menu
        </Button>
      </div>

      <DataTable 
        columns={columns} 
        data={data} 
        searchKey="title" 
        searchPlaceholder="Search menu by title..." 
      />

      <MenuFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingData(null)
        }}
        initialData={editingData}
        menus={availableMenus}
      />
    </>
  )
}
