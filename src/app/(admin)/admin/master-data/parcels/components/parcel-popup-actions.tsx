"use client";

import Link from "next/link";
import { Eye, Pencil } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Footer aksi untuk popup lahan di ketiga peta (Sebaran Lahan, Peta Lahan,
 * Peta BMP): **Lihat Detail** (route ke halaman detail, gate VIEW) dan
 * **Edit Lahan** (buka ParcelFormModal, gate EDIT). `children` menampung aksi
 * tambahan khusus peta (mis. tombol "Profil Lahan" PDF di Peta Lahan).
 * Modal edit di-hoist ke container peta; footer hanya memicu `onEdit`.
 */
interface Props {
  parcelId: string;
  canView: boolean;
  canEdit: boolean;
  onEdit: () => void;
  children?: React.ReactNode;
}

export function ParcelPopupActions({ parcelId, canView, canEdit, onEdit, children }: Props) {
  if (!canView && !canEdit && !children) return null;

  return (
    <div className="space-y-2 border-t px-3.5 py-2.5">
      {children}
      {(canView || canEdit) && (
        <div className="flex gap-2">
          {canView && (
            <Link
              href={`/admin/master-data/parcels/${parcelId}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 flex-1 gap-1.5")}
            >
              <Eye className="h-3.5 w-3.5" />
              Lihat Detail
            </Link>
          )}
          {canEdit && (
            <Button variant="outline" size="sm" className="h-8 flex-1 gap-1.5" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
              Edit Lahan
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
