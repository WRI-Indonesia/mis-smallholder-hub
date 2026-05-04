import { getFarmerGroupById } from "@/server/actions/farmer-group";
import { notFound } from "next/navigation";
import { GroupDetailClient } from "./group-detail-client";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function FarmerGroupDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  const result = await getFarmerGroupById(resolvedParams.id);

  if (!result.success || !result.data) {
    notFound();
  }

  return (
    <div className="p-6">
      <GroupDetailClient group={result.data} />
    </div>
  );
}
