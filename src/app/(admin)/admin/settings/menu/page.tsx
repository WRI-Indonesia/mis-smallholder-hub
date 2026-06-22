import { requirePermission } from "@/lib/rbac";
import { getAllMenuItems } from "@/server/actions/menu";
import { MenuListClient } from "./menu-list-client";

export default async function MenuPage() {
  await requirePermission("settings-menu");
  const items = await getAllMenuItems();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Menu Management</h1>
        <p className="text-muted-foreground">Kelola navigasi menu sidebar</p>
      </div>
      <MenuListClient initialItems={items} />
    </div>
  );
}
