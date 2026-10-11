import { hasPermission, requirePermission } from "@/lib/rbac";
import { HelpHint } from "@/app/(admin)/admin/help/help-hint";
import { activeTechDebt, releaseMetrics, roadmapSummary } from "@/lib/release-metrics-data";
import { releasePlan } from "@/lib/release-plan-data";
import { summarizeCurrentRelease } from "@/lib/release-plan";
import { MetricsDashboardClient } from "./metrics-dashboard-client";

export default async function ReleaseMetricsPage() {
  await requirePermission("dashboard-metrics");

  // Tanggal "hari ini" (WIB) dipakai menempatkan baris siklus berjalan pada
  // sumbu kalender — dihitung server per request, bukan di klien.
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
  // Kartu "Rilis berjalan" (#421): ringkasan dari sprint.md (parser bersama Rencana
  // Pengembangan); tautan ke halaman itu hanya bila pengguna boleh membukanya.
  const current = summarizeCurrentRelease(releasePlan, today);
  const canOpenPlan = await hasPermission("data-analyst-sprint", "VIEW");

  return (
    <div className="p-6">
      <MetricsDashboardClient
        releases={releaseMetrics}
        techDebt={activeTechDebt}
        roadmap={roadmapSummary}
        today={today}
        currentRelease={current}
        planUpdatedAt={releasePlan.updatedAt}
        canOpenPlan={canOpenPlan}
        helpSlot={<HelpHint menuKey="dashboard-metrics" />}
      />
    </div>
  );
}
