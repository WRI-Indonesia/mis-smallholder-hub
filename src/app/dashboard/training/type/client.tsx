"use client"

import * as React from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { getTrainingTypeColumns } from "./columns"
import { TrainingTypeFormModal } from "@/components/training-type-form-modal"
import { TrainingTypeFormValues } from "@/lib/zod/training-type"

interface TrainingTypeClientProps {
  data: any[]
}

export function TrainingTypeClient({ data }: TrainingTypeClientProps) {
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [editingData, setEditingData] = React.useState<TrainingTypeFormValues | null>(null)

  const handleEdit = (rowValue: TrainingTypeFormValues) => {
    setEditingData(rowValue)
    setIsModalOpen(true)
  }

  const handleAddNew = () => {
    setEditingData(null)
    setIsModalOpen(true)
  }

  const columns = getTrainingTypeColumns({ onEdit: handleEdit })

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={handleAddNew}>
          <Plus className="mr-2 h-4 w-4" />
          Add Training Type
        </Button>
      </div>

      <DataTable 
        columns={columns} 
        data={data} 
        searchKey="name" 
        searchPlaceholder="Search training types..." 
      />

      <TrainingTypeFormModal
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
