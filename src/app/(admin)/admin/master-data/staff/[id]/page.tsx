import { getStaffById } from "@/server/actions/staff";
import { notFound } from "next/navigation";
import { StaffDetailClient } from "./staff-detail-client";

export const metadata = { title: "Detail Staff WRI" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function StaffDetailPage({ params }: PageProps) {
  const { id } = await params;
  const result = await getStaffById(id);

  if (!result.success || !result.data) {
    notFound();
  }

  return (
    <div className="p-6">
      <StaffDetailClient staff={result.data} />
    </div>
  );
}
