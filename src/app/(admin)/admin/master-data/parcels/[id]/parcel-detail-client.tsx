"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { deleteLandParcel } from "@/server/actions/land-parcel";
import { toast } from "sonner";
import { ParcelFormModal } from "../components/parcel-form-modal";
import { ParcelMapView } from "../components/parcel-map-view";

import type { LandParcel, FarmerSelect } from "@/types/land-parcel";

interface Props {
  parcel: LandParcel;
  farmers: FarmerSelect[];
  permissions: string[];
}

export function ParcelDetailClient({ parcel, farmers, permissions }: Props) {
  const [showForm, setShowForm] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    if (!confirm("Apakah Anda yakin ingin menonaktifkan lahan ini?")) return;
    
    const result = await deleteLandParcel(parcel.id);
    if (result.success) {
      toast.success("Lahan berhasil dinonaktifkan");
      router.push("/admin/master-data/parcels");
      router.refresh();
    } else {
      toast.error(typeof result.error === "string" ? result.error : "Gagal menonaktifkan lahan");
    }
  }

  const canEdit = permissions.includes("EDIT");
  const canDelete = permissions.includes("DELETE");

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/master-data/parcels">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Detail Lahan</h1>
            <p className="text-muted-foreground text-sm">
              Lahan: {parcel.parcelId} · Petani: {parcel.farmer.name}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          {canDelete && (
            <Button size="sm" variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Nonaktifkan
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <Card className="p-6">
            <h2 className="text-base font-semibold mb-4">Informasi Lahan</h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">ID Lahan</p>
                <p className="text-sm font-mono font-medium mt-1">{parcel.parcelId}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Blok</p>
                <p className="text-sm font-medium mt-1">{parcel.blok ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Luas</p>
                <p className="text-sm font-medium mt-1">{parcel.area !== null ? `${parcel.area.toFixed(2)} ha` : "—"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status Kepemilikan</p>
                <p className="text-sm font-medium mt-1">{parcel.landStatus ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Komoditas</p>
                <p className="text-sm font-medium mt-1">{parcel.cropType ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tahun Tanam</p>
                <p className="text-sm font-medium mt-1">{parcel.plantingYear ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gapoktan</p>
                <p className="text-sm font-medium mt-1">{parcel.subGroupLv1 ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kelompok Tani</p>
                <p className="text-sm font-medium mt-1">{parcel.subGroupLv2 ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Revisi</p>
                <p className="text-sm font-medium mt-1">{parcel.revision}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Catatan</p>
                <p className="text-sm font-medium mt-1 whitespace-pre-wrap">{parcel.notes ?? "—"}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-base font-semibold mb-4">Informasi Pemilik</h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nama Petani</p>
                <Link href={`/admin/master-data/farmers/${parcel.farmer.id}`} className="text-sm font-medium mt-1 text-primary hover:underline block">
                  {parcel.farmer.name}
                </Link>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">ID Petani</p>
                <p className="text-sm font-mono font-medium mt-1">{parcel.farmer.farmerId}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lembaga Tani</p>
                <p className="text-sm font-medium mt-1">{parcel.farmer.farmerGroup.name}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Distrik</p>
                <p className="text-sm font-medium mt-1">{parcel.farmer.farmerGroup.district.name}</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card className="p-6">
            <h2 className="text-base font-semibold mb-4">Peta Spasial Lahan</h2>
            <ParcelMapView geometry={parcel.geometry} />
          </Card>
        </div>
      </div>

      <ParcelFormModal
        open={showForm}
        onClose={() => setShowForm(false)}
        parcel={parcel}
        farmers={farmers}
      />
    </div>
  );
}
