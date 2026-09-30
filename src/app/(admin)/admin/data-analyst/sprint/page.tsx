import { requirePermission } from "@/lib/rbac";
import { HelpHint } from "@/app/(admin)/admin/help/help-hint";
import { releasePlan } from "@/lib/release-plan-data";
import { SprintViewClient } from "./sprint-view-client";

/**
 * Rencana Pengembangan (menu key & URL tetap `data-analyst-sprint` / `/sprint`
 * sejak #378; unit rencana = RILIS sejak 2026-09-30, bukan sprint mingguan).
 */
export default async function ReleasePlanPage() {
  await requirePermission("data-analyst-sprint");

  // Rilis berjalan ditentukan dari tanggal hari ini (WIB), dihitung server per
  // request — pola Metrik Rilis.
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Rencana Pengembangan</h1>
          <HelpHint menuKey="data-analyst-sprint" />
        </div>
        <p className="text-muted-foreground">
          Apa yang dikerjakan untuk setiap rilis aplikasi, statusnya, dan keputusan yang ditunggu dari owner — dibaca dari dokumen
          rencana di repositori. Status terbaru tiap issue ada di GitHub — klik nomornya.
        </p>
      </div>
      <SprintViewClient plan={releasePlan} today={today} />
    </div>
  );
}
