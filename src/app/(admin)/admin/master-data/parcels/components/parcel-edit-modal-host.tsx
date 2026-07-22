"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getLandParcelById, getParcelFarmerOptions } from "@/server/actions/land-parcel";
import { ParcelFormModal } from "./parcel-form-modal";
import type { LandParcel, FarmerSelect } from "@/types/land-parcel";

/**
 * Host modal Edit Lahan untuk trigger dari peta (Sebaran Lahan, Peta Lahan,
 * Peta BMP). Data lahan + daftar petani diambil **lazy** saat host di-mount
 * (bukan di-preload sebagai prop). Pemanggil me-render host **hanya saat ada
 * `parcelId`** dengan `key={parcelId}` agar tiap buka memulai state bersih:
 *
 *   {editId && <ParcelEditModalHost key={editId} parcelId={editId} onClose={...} onSaved={...} />}
 *
 * Dengan pola remount ini, tidak perlu setState sinkron di effect (parcel
 * hanya di-set di callback async fetch) — aman terhadap aturan lint effect.
 */
interface Props {
  parcelId: string;
  onClose: () => void;
  /** Diteruskan ke ParcelFormModal; dipakai peta yang refetch GeoJSON di klien. */
  onSaved?: () => void;
}

export function ParcelEditModalHost({ parcelId, onClose, onSaved }: Props) {
  const [parcel, setParcel] = useState<LandParcel | null>(null);
  const [farmers, setFarmers] = useState<FarmerSelect[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getLandParcelById(parcelId), getParcelFarmerOptions()])
      .then(([p, fs]) => {
        if (cancelled) return;
        if (!p) {
          toast.error("Lahan tidak ditemukan atau di luar akses Anda");
          onClose();
          return;
        }
        // getLandParcelById mengembalikan baris lengkap (superset LandParcel).
        setParcel(p as unknown as LandParcel);
        setFarmers(fs);
      })
      .catch(() => {
        if (cancelled) return;
        toast.error("Gagal memuat data lahan");
        onClose();
      });
    return () => {
      cancelled = true;
    };
    // Sengaja hanya bergantung pada parcelId — host di-remount per id (key).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parcelId]);

  if (!parcel) {
    return (
      <Dialog open onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Memuat data lahan…</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <ParcelFormModal open onClose={onClose} parcel={parcel} farmers={farmers} onSaved={onSaved} />
  );
}
