import { requirePermission, getUserPermissionsForMenu } from "@/lib/rbac";
import { HelpHint } from "@/app/(admin)/admin/help/help-hint";
import { getProgramTargets } from "@/server/actions/program-target";
import { ProgramTargetClient } from "./program-target-client";

export default async function ProgramTargetPage() {
  await requirePermission("master-data-program-target");
  const [view, permissions] = await Promise.all([
    getProgramTargets(),
    getUserPermissionsForMenu("master-data-program-target"),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Target Program</h1>
          <HelpHint menuKey="master-data-program-target" />
        </div>
        <p className="text-muted-foreground">
          Angka kontrak / trayektori program untuk seluruh wilayah program. Dipakai tampilan <b>vs Kontrak</b> di kartu
          Training Benefit per year (Dashboard Pelatihan) untuk membandingkan target dengan realisasi.
        </p>
      </div>
      <ProgramTargetClient view={view} canEdit={permissions.includes("EDIT")} />
    </div>
  );
}
