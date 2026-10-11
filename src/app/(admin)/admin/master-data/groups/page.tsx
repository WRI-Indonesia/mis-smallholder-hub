import { requirePermission, getUserPermissionsForMenu, isSuperAdmin } from "@/lib/rbac";
import { HelpHint } from "@/app/(admin)/admin/help/help-hint";
import { getFarmerGroups, getDistrictsForSelect } from "@/server/actions/farmer-group";
import { getAccessContext } from "@/lib/access-context";
import { GroupListClient } from "./group-list-client";

export default async function GroupsPage() {
  await requirePermission("master-data-groups");
  const [groups, districts, permissions, superAdmin, access] = await Promise.all([
    getFarmerGroups(),
    getDistrictsForSelect(),
    getUserPermissionsForMenu("master-data-groups"),
    isSuperAdmin(),
    getAccessContext(),
  ]);
  // Akun ber-scope Lembaga tak bisa membuat Lembaga baru / memindah distrik (#409) — UI mengikuti aturan server.
  const groupScoped = access.mode === "BY_FARMER_GROUP";

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Lembaga Petani</h1>
          <HelpHint menuKey="master-data-groups" />
        </div>
        <p className="text-muted-foreground">Data lembaga petani yang terdaftar</p>
      </div>
      <GroupListClient
        initialGroups={groups}
        districts={districts}
        permissions={permissions}
        isSuperAdmin={superAdmin}
        groupScoped={groupScoped}
      />
    </div>
  );
}
