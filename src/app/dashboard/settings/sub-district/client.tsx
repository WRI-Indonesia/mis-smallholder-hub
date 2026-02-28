"use client"

import * as React from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { getSubDistrictColumns } from "./columns"
import { SubDistrictFormModal } from "@/components/sub-district-form-modal"
import { SubDistrictFormValues } from "@/lib/zod/sub-district"
import { District } from "@prisma/client"

interface SubDistrictClientProps {
  data: any[]
  districts: District[]
}

export function SubDistrictClient({ data, districts }: SubDistrictClientProps) {
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [editingData, setEditingData] = React.useState<SubDistrictFormValues | null>(null)

  const handleEdit = (rowValue: SubDistrictFormValues) => {
    setEditingData(rowValue)
    setIsModalOpen(true)
  }

  const handleAddNew = () => {
    setEditingData(null)
    setIsModalOpen(true)
  }

  const columns = getSubDistrictColumns({ onEdit: handleEdit })

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={handleAddNew}>
          <Plus className="mr-2 h-4 w-4" />
          Add Sub-District
        </Button>
      </div>

      <DataTable 
        columns={columns} 
        data={data} 
        searchKey="name" 
        searchPlaceholder="Search sub-district by name..." 
      />

      <SubDistrictFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingData(null)
        }}
        initialData={editingData}
        districts={districts}
      />
    </>
  )
}
