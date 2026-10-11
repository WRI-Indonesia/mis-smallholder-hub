import Link from "next/link";
import { requirePermission, getUserPermissionsForMenu } from "@/lib/rbac";
import { HelpHint } from "@/app/(admin)/admin/help/help-hint";
import { getDistrictsForCompleteness, getFarmerGroupsForCompleteness } from "@/server/actions/data-completeness";
import { DataCompletenessClient } from "./data-completeness-client";
import { AvailabilityNav } from "../availability/availability-nav";

export default async function DataCompletenessPage() {
  await requirePermission("data-analyst-data-completeness");

  const [districts, farmerGroups, permissions] = await Promise.all([
    getDistrictsForCompleteness(),
    getFarmerGroupsForCompleteness(),
    getUserPermissionsForMenu("data-analyst-data-completeness"),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <AvailabilityNav active="data-analyst-data-completeness" helpSlot={<HelpHint menuKey="data-analyst-data-completeness" />} />
        <p className="text-sm text-muted-foreground">
          Rincian kelengkapan &amp; daftar kerja anomali satu Lembaga Petani (Profil, Petani, Lahan, Pelatihan, Produksi). Ringkasan lintas Lembaga ada di tab{" "}
          <Link href="/admin/data-analyst/data-availability" className="text-primary hover:underline">
            Semua Lembaga
          </Link>
          .
        </p>
      </div>
      <DataCompletenessClient
        districts={districts}
        initialFarmerGroups={farmerGroups}
        canExport={permissions.includes("EXPORT")}
      />
    </div>
  );
}
