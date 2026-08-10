import { HelpHint } from "@/app/(admin)/admin/help/help-hint";
import { requirePermission, getUserPermissionsForMenu } from "@/lib/rbac";
import { getAllMenuItems } from "@/server/actions/menu";
import { MenuListClient } from "./menu-list-client";

export default async function MenuPage() {
  await requirePermission("settings-menu");
  const [items, permissions] = await Promise.all([
    getAllMenuItems(),
    getUserPermissionsForMenu("settings-menu"),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Menu Management</h1>
          <HelpHint menuKey="settings-menu" />
        </div>
        <p className="text-muted-foreground">Kelola navigasi menu sidebar</p>
      </div>
      <MenuListClient initialItems={items} permissions={permissions} />
    </div>
  );
}
