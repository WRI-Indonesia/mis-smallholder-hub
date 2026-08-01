import { requirePermission } from "@/lib/rbac";
import { getUserPermissionsForMenu } from "@/lib/rbac";
import {
  getLandParcelById,
  getLandParcelProduction,
  getFarmerSiblingParcels,
} from "@/server/actions/land-parcel";
import { getFarmerOptions } from "@/lib/select-options";
import { notFound } from "next/navigation";
import { ParcelDetailClient } from "./parcel-detail-client";
import type { SiblingParcel } from "./parcel-detail-client";
import type { LandParcel } from "@/types/land-parcel";

export default async function ParcelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("master-data-parcels");
  const { id } = await params;

  const [parcel, production, farmers, permissions, productionPermissions] = await Promise.all([
    getLandParcelById(id),
    getLandParcelProduction(id),
    getFarmerOptions("master-data-parcels"),
    getUserPermissionsForMenu("master-data-parcels"),
    getUserPermissionsForMenu("master-data-production"),
  ]);

  if (!parcel) notFound();

  // Butuh farmerId dari parcel — di-fetch setelah parcel resolve.
  const siblingParcels = await getFarmerSiblingParcels(parcel.farmerId, parcel.id);

  return (
    <div className="p-6 space-y-6">
      <ParcelDetailClient
        parcel={parcel as unknown as LandParcel}
        production={production}
        farmers={farmers}
        permissions={permissions}
        productionPermissions={productionPermissions}
        siblingParcels={siblingParcels as unknown as SiblingParcel[]}
      />
    </div>
  );
}
