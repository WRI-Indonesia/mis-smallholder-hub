"use client"

import * as React from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { getProvinceColumns } from "./columns"
import { ProvinceFormModal } from "@/components/province-form-modal"
import { ProvinceFormValues } from "@/lib/zod/province"

interface ProvinceClientProps {
  data: any[]
}

export function ProvinceClient({ data }: ProvinceClientProps) {
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [editingData, setEditingData] = React.useState<ProvinceFormValues | null>(null)

  const handleEdit = (rowValue: ProvinceFormValues) => {
    setEditingData(rowValue)
    setIsModalOpen(true)
  }

  const handleAddNew = () => {
    setEditingData(null)
    setIsModalOpen(true)
  }

  const columns = getProvinceColumns({ onEdit: handleEdit })

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={handleAddNew}>
          <Plus className="mr-2 h-4 w-4" />
          Add Province
        </Button>
      </div>

      <DataTable 
        columns={columns} 
        data={data} 
        searchKey="name" 
        searchPlaceholder="Search provinces by name..." 
      />

      <ProvinceFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingData(null)
        }}
        initialData={editingData}
      />
    </>
  )
}
