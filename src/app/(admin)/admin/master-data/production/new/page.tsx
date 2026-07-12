import { requirePermission } from "@/lib/rbac";
import { getFarmerOptions } from "@/lib/select-options";
import { ProductionFormClient } from "../components/production-form-client";

export default async function NewProductionPage() {
  await requirePermission("master-data-production");

  const farmers = await getFarmerOptions("master-data-production");

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tambah Data Produksi</h1>
        <p className="text-muted-foreground">Catat hasil panen petani baru</p>
      </div>
      <ProductionFormClient farmers={farmers} />
    </div>
  );
}
