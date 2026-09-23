import { HelpHint } from "@/app/(admin)/admin/help/help-hint";
import { requirePermission, hasPermission } from "@/lib/rbac";
import { getFireBoundaries, getAdminBoundaries, getRiauOutline } from "@/server/actions/fire-boundary";
import { FireAlertClient } from "./fire-alert-client";

export default async function FireAlertPage() {
  await requirePermission("dashboard-risk-fire");
  const [boundaries, adminBoundaries, riauOutline, canPrint] = await Promise.all([
    getFireBoundaries(),
    getAdminBoundaries(),
    // Outline pemangkas (#280) — gagal/belum ter-seed tidak boleh menggagalkan
    // halaman; klien jatuh ke poligon kabupaten seperti sebelumnya.
    getRiauOutline().catch(() => null),
    hasPermission("dashboard-risk-fire", "PRINT"),
  ]);

  return (
    <FireAlertClient
      boundaries={boundaries}
      adminBoundaries={adminBoundaries}
      riauOutline={riauOutline}
      canPrint={canPrint}
      helpSlot={<HelpHint menuKey="dashboard-risk-fire" />}
    />
  );
}
