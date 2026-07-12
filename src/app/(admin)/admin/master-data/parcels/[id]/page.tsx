import { requirePermission } from "@/lib/rbac";
import { getUserPermissionsForMenu } from "@/lib/rbac";
import { getLandParcelById } from "@/server/actions/land-parcel";
import { getFarmerOptions } from "@/lib/select-options";
import { notFound } from "next/navigation";
import { ParcelDetailClient } from "./parcel-detail-client";
import type { LandParcel } from "@/types/land-parcel.types";

export default async function ParcelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("master-data-parcels");
  const { id } = await params;

  const [parcel, farmers, permissions] = await Promise.all([
    getLandParcelById(id),
    getFarmerOptions("master-data-parcels"),
    getUserPermissionsForMenu("master-data-parcels"),
  ]);

  if (!parcel) notFound();

  return (
    <div className="p-6 space-y-6">
      <ParcelDetailClient
        parcel={parcel as unknown as LandParcel}
        farmers={farmers}
        permissions={permissions}
      />
    </div>
  );
}
