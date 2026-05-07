import { getAllMenuItems, getRootMenuItems } from "@/server/actions/menu";
import { MenuManagerClient } from "./menu-manager-client";

export const metadata = { title: "Menu Management" };

export default async function MenuManagementPage() {
  const start = Date.now();

  const [itemsResult, rootsResult] = await Promise.all([
    getAllMenuItems(),
    getRootMenuItems(),
  ]);

  const elapsed = Date.now() - start;
  console.log(`[MenuManagementPage] loaded in ${elapsed}ms`);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Menu Management</h1>
        <p className="text-muted-foreground">
          Kelola struktur, urutan, dan visibilitas menu sidebar admin.
        </p>
      </div>
      <MenuManagerClient
        initialItems={itemsResult.success ? (itemsResult.data ?? []) : []}
        rootItems={rootsResult.success ? (rootsResult.data ?? []) : []}
      />
    </div>
  );
}
