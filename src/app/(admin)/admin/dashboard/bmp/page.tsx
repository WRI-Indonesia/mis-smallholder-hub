import { BMPDashboardServer } from "@/components/dashboard/bmp-dashboard-server";

export const metadata = { title: "Dashboard BMP" };

interface DashboardBmpPageProps {
  searchParams?: Promise<{
    districtId?: string;
    kt?: string;
  }>;
}

export default async function DashboardBmpPage({ searchParams }: DashboardBmpPageProps) {
  const resolvedSearchParams = await searchParams;

  return <BMPDashboardServer searchParams={resolvedSearchParams} />;
}
