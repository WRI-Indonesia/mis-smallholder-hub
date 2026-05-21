import { requirePermission } from "@/lib/rbac";

export default async function GroupsPage() {
  await requirePermission("master-data-groups");

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Kelompok Tani</h1>
      <p className="text-muted-foreground">Coming soon</p>
    </div>
  );
}
