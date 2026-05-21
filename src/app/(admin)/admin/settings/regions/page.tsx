import { requirePermission } from "@/lib/rbac";

export default async function RegionsPage() {
  await requirePermission("settings-regions");

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Regions</h1>
      <p className="text-muted-foreground">Coming soon</p>
    </div>
  );
}
