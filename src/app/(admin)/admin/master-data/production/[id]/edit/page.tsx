import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import { getProductionRecordById } from "@/server/actions/production";
import { getFarmerOptions } from "@/lib/select-options";
import { ProductionFormClient } from "../../components/production-form-client";

export default async function EditProductionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("master-data-production");

  const { id } = await params;
  const [record, farmers] = await Promise.all([
    getProductionRecordById(id),
    getFarmerOptions("master-data-production"),
  ]);

  if (!record || !record.isActive) {
    notFound();
  }

  // Format harvestDate to Date object safely
  const initialRecord = {
    ...record,
    harvestDate: new Date(record.harvestDate),
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Edit Data Produksi</h1>
        <p className="text-muted-foreground">Ubah catatan hasil panen petani</p>
      </div>
      <ProductionFormClient farmers={farmers} initialRecord={initialRecord} />
    </div>
  );
}
