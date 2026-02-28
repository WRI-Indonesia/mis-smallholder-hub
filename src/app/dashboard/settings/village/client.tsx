"use client"

import * as React from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { getVillageColumns } from "./columns"
import { VillageFormModal } from "@/components/village-form-modal"
import { VillageFormValues } from "@/lib/zod/village"
import { SubDistrict } from "@prisma/client"

interface VillageClientProps {
  data: any[]
  subDistricts: SubDistrict[]
}

export function VillageClient({ data, subDistricts }: VillageClientProps) {
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [editingData, setEditingData] = React.useState<VillageFormValues | null>(null)

  const handleEdit = (rowValue: VillageFormValues) => {
    setEditingData(rowValue)
    setIsModalOpen(true)
  }

  const handleAddNew = () => {
    setEditingData(null)
    setIsModalOpen(true)
  }

  const columns = getVillageColumns({ onEdit: handleEdit })

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={handleAddNew}>
          <Plus className="mr-2 h-4 w-4" />
          Add Village
        </Button>
      </div>

      <DataTable 
        columns={columns} 
        data={data} 
        searchKey="name" 
        searchPlaceholder="Search village by name..." 
      />

      <VillageFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingData(null)
        }}
        initialData={editingData}
        subDistricts={subDistricts}
      />
    </>
  )
}
