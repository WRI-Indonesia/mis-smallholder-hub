import { requirePermission } from "@/lib/rbac";
import { HelpHint } from "@/app/(admin)/admin/help/help-hint";
import { activeTechDebt, releaseMetrics, roadmapSummary } from "@/lib/release-metrics-data";
import { MetricsDashboardClient } from "./metrics-dashboard-client";

export default async function ReleaseMetricsPage() {
  await requirePermission("dashboard-metrics");

  // Tanggal "hari ini" (WIB) dipakai menempatkan baris siklus berjalan pada
  // sumbu kalender — dihitung server per request, bukan di klien.
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());

  return (
    <div className="p-6">
      <MetricsDashboardClient
        releases={releaseMetrics}
        techDebt={activeTechDebt}
        roadmap={roadmapSummary}
        today={today}
        helpSlot={<HelpHint menuKey="dashboard-metrics" />}
      />
    </div>
  );
}
