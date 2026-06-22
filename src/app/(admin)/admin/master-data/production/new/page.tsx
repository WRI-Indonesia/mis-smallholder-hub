import { requirePermission } from "@/lib/rbac";
import { getFarmersForSelect } from "@/server/actions/production";
import { ProductionFormClient } from "../components/production-form-client";

export default async function NewProductionPage() {
  await requirePermission("master-data-production");

  const farmers = await getFarmersForSelect();

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
