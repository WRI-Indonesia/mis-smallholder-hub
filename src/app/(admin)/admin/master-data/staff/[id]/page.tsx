import { getStaffById } from "@/server/actions/staff";
import { getStaffActivities } from "@/server/actions/staff-activity";
import { notFound } from "next/navigation";
import { StaffDetailClient } from "./staff-detail-client";

export const metadata = { title: "Detail Staff WRI" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function StaffDetailPage({ params }: PageProps) {
  const { id } = await params;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [staffResult, activitiesResult] = await Promise.all([
    getStaffById(id),
    getStaffActivities(id, year, month),
  ]);

  if (!staffResult.success || !staffResult.data) {
    notFound();
  }

  return (
    <div className="p-6">
      <StaffDetailClient
        staff={staffResult.data}
        initialActivities={activitiesResult.success ? (activitiesResult.data ?? []) : []}
        initialYear={year}
        initialMonth={month}
      />
    </div>
  );
}
