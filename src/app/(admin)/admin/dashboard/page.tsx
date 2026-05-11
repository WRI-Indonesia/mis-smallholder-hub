import { DashboardServer } from "@/components/dashboard/dashboard-server";

interface DashboardPageProps {
  searchParams?: Promise<{
    districtId?: string;
    batchId?: string;
  }>;
}

export default async function BasicDataDashboardPage({ searchParams }: DashboardPageProps) {
  const resolvedSearchParams = await searchParams;
  return <DashboardServer searchParams={resolvedSearchParams} />;
}
