import { requirePermission } from "@/lib/rbac";
import { getRolePermissions } from "@/server/actions/role-permission";
import { getAllMenuItems } from "@/server/actions/menu";
import { RoleMatrixClient } from "./role-matrix-client";

export default async function RolesPage() {
  await requirePermission("settings-roles");
  const [permissions, menuItems] = await Promise.all([
    getRolePermissions(),
    getAllMenuItems(),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Role & Permission</h1>
        <p className="text-muted-foreground">Atur default permission per role untuk setiap menu</p>
      </div>
      <RoleMatrixClient
        permissions={permissions}
        menuItems={menuItems.map((m) => ({ key: m.key, title: m.title, parentKey: m.parentKey }))}
      />
    </div>
  );
}
