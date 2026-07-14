import { requirePermission } from "@/lib/rbac";
import { getLatestDashboardSnapshot } from "@/server/actions/dashboard";
import { DashboardClient } from "../dashboard-client";

export default async function MainDashboardPage() {
  await requirePermission("dashboard-main");

  // Load the latest "all districts / all years" master snapshot; the dashboard
  // slices it (Distrik / Tahun / Lembaga Petani) entirely client-side.
  const initialView = await getLatestDashboardSnapshot();

  return (
    <div className="p-6">
      <DashboardClient initialView={initialView} />
    </div>
  );
}
