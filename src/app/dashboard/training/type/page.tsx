import { getTrainingTypes } from "@/lib/actions/training-type"
import { TrainingTypeClient } from "./client"

export default async function TrainingTypePage() {
  const { data, error } = await getTrainingTypes()

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-red-500">
        Error loading data: {error}
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6 w-full max-w-full overflow-hidden">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Training Types</h1>
      </div>
      {/* We pass the data to a client component to handle the interactiveness (modals, states) */}
      <TrainingTypeClient data={data} />
    </div>
  )
}
