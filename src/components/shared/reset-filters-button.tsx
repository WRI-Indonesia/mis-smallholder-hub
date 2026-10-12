"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Tombol Reset filter seragam (#427, keputusan owner 2026-10-12): ghost ↺ Reset
 * di ujung bar filter, hanya tampil saat ada filter yang berbeda dari bawaan
 * (`active`, biasanya dari `hasActiveFilters`). Reset = kembali ke tampilan
 * saat halaman pertama dibuka, termasuk mengosongkan kotak Cari; parameter
 * wajib laporan tidak ikut di-reset.
 */
export function ResetFiltersButton({
  active,
  onReset,
  className,
  title = "Kembali ke tampilan bawaan halaman",
}: {
  active: boolean;
  onReset: () => void;
  className?: string;
  title?: string;
}) {
  if (!active) return null;
  return (
    <Button type="button" variant="ghost" className={cn("h-9", className)} onClick={onReset} title={title}>
      <RotateCcw className="mr-2 h-4 w-4" />
      Reset
    </Button>
  );
}
