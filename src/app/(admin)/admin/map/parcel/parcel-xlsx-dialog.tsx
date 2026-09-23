"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LAND_PARCEL_ROW_ORDER_LABELS, type LandParcelRowOrder } from "@/lib/report-land-parcel";
import type { ParcelXlsxOptions, ParcelXlsxSplit } from "./map-legend-export";

const SPLIT_LABELS: Record<ParcelXlsxSplit, string> = {
  single: "1 sheet",
  kelompokTani: "Sheet per Kelompok Tani",
  blok: "Sheet per Blok",
};

function RadioList<K extends string>({ name, labels, value, onChange }: { name: string; labels: Record<K, string>; value: K; onChange: (v: K) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      {(Object.keys(labels) as K[]).map((k) => (
        <label key={k} className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="radio" name={name} value={k} checked={value === k} onChange={() => onChange(k)} className="accent-primary" />
          {labels[k]}
        </label>
      ))}
    </div>
  );
}

/**
 * Pilihan Excel baris lahan Legenda Peta Lahan (owner 2026-09-23, #371) —
 * hanya dibuka bila filter = 1 Lembaga Petani (KT/Blok senama ada di banyak Lembaga).
 */
export function ParcelXlsxDialog({
  open,
  title,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  onCancel: () => void;
  onConfirm: (opts: ParcelXlsxOptions) => void;
}) {
  const [split, setSplit] = useState<ParcelXlsxSplit>("single");
  const [order, setOrder] = useState<LandParcelRowOrder>("pemilik");
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Unduh Excel — {title}</DialogTitle>
          <DialogDescription>
            Pecahan sheet dan urutan baris. Sheet per KT/Blok didahului sheet &ldquo;Semua&rdquo; berisi seluruh lahan.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-muted-foreground">Sheet</legend>
            <RadioList name="xlsx-split" labels={SPLIT_LABELS} value={split} onChange={setSplit} />
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-muted-foreground">Urutan</legend>
            <RadioList name="xlsx-order" labels={LAND_PARCEL_ROW_ORDER_LABELS} value={order} onChange={setOrder} />
          </fieldset>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Batal</Button>
          <Button onClick={() => onConfirm({ split, order })}>Unduh Excel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
