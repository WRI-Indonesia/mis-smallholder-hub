"use client"

import * as React from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { getDistrictColumns } from "./columns"
import { DistrictFormModal } from "@/components/district-form-modal"
import { DistrictFormValues } from "@/lib/zod/district"
import { Province } from "@prisma/client"

interface DistrictClientProps {
  data: any[]
  provinces: Province[]
}

export function DistrictClient({ data, provinces }: DistrictClientProps) {
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [editingData, setEditingData] = React.useState<DistrictFormValues | null>(null)

  const handleEdit = (rowValue: DistrictFormValues) => {
    setEditingData(rowValue)
    setIsModalOpen(true)
  }

  const handleAddNew = () => {
    setEditingData(null)
    setIsModalOpen(true)
  }

  const columns = getDistrictColumns({ onEdit: handleEdit })

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={handleAddNew}>
          <Plus className="mr-2 h-4 w-4" />
          Add District
        </Button>
      </div>

      <DataTable 
        columns={columns} 
        data={data} 
        searchKey="name" 
        searchPlaceholder="Search district by name..." 
      />

      <DistrictFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingData(null)
        }}
        initialData={editingData}
        provinces={provinces}
      />
    </>
  )
}
