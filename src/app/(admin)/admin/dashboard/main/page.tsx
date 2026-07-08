import { requirePermission } from "@/lib/rbac";
import {
  getLatestDashboardSnapshot,
  getDashboardSnapshotFilterOptions,
} from "@/server/actions/dashboard";
import { DashboardClient } from "../dashboard-client";

export default async function MainDashboardPage() {
  await requirePermission("dashboard-main");

  const [initialView, filterOptions] = await Promise.all([
    getLatestDashboardSnapshot(),
    getDashboardSnapshotFilterOptions(),
  ]);

  return (
    <div className="p-6">
      <DashboardClient initialView={initialView} filterOptions={filterOptions} />
    </div>
  );
}
