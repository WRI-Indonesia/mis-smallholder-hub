import { requirePermission } from "@/lib/rbac";

export default async function MenuPage() {
  await requirePermission("settings-menu");

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Menu Management</h1>
      <p className="text-muted-foreground">Coming soon</p>
    </div>
  );
}
