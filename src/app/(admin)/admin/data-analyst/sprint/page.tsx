import { requirePermission } from "@/lib/rbac";
import { HelpHint } from "@/app/(admin)/admin/help/help-hint";
import { sprintPlan } from "@/lib/sprint-plan-data";
import { SprintViewClient } from "./sprint-view-client";
import { SprintHeaderStrip } from "./sprint-header-strip";

export default async function SprintViewPage() {
  await requirePermission("data-analyst-sprint");

  // Sprint aktif ditentukan dari tanggal hari ini (WIB), dihitung server per
  // request — pola Metrik Rilis.
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Sprint Mingguan</h1>
          <HelpHint menuKey="data-analyst-sprint" />
        </div>
        <p className="text-muted-foreground">
          Rencana pengembangan aplikasi per minggu (Senin–Minggu), dibaca dari dokumen sprint di repositori. Status terbaru tiap issue
          ada di GitHub — klik nomornya.
        </p>
      </div>
      <SprintHeaderStrip plan={sprintPlan} today={today} />
      <SprintViewClient plan={sprintPlan} today={today} />
    </div>
  );
}
