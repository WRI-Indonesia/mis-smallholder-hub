import { HelpHint } from "@/app/(admin)/admin/help/help-hint";
import { requirePermission, hasPermission } from "@/lib/rbac";
import { getFireBoundaries, getAdminBoundaries } from "@/server/actions/fire-boundary";
import { FireAlertClient } from "./fire-alert-client";

export default async function FireAlertPage() {
  await requirePermission("dashboard-risk-fire");
  const [boundaries, adminBoundaries, canPrint] = await Promise.all([
    getFireBoundaries(),
    getAdminBoundaries(),
    hasPermission("dashboard-risk-fire", "PRINT"),
  ]);

  return (
    <FireAlertClient
      boundaries={boundaries}
      adminBoundaries={adminBoundaries}
      canPrint={canPrint}
      helpSlot={<HelpHint menuKey="dashboard-risk-fire" />}
    />
  );
}
