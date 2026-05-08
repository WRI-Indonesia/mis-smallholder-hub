import { getTrainingActivityById, getFarmersByGroup } from "@/server/actions/training";
import { notFound } from "next/navigation";
import { TrainingDetailClient } from "./training-detail-client";

export const metadata = { title: "Detail Training" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TrainingDetailPage({ params }: PageProps) {
  const { id } = await params;
  const result = await getTrainingActivityById(id);

  if (!result.success || !result.data) {
    notFound();
  }

  const activity = result.data;

  // Fetch all farmers from the kelompok tani for the participant picker
  const farmersResult = activity.farmerGroupId
    ? await getFarmersByGroup(activity.farmerGroupId)
    : { success: true as const, data: [] };

  return (
    <div className="p-6">
      <TrainingDetailClient
        activity={activity}
        availableFarmers={farmersResult.success ? (farmersResult.data ?? []) : []}
      />
    </div>
  );
}
