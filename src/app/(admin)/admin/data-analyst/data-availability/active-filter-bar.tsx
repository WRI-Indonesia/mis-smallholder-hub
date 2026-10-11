"use client";

import { RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ActiveFilterChip {
  /** Kunci stabil (mis. kunci URL) — juga dipakai test. */
  id: string;
  label: string;
  value: string;
  onRemove: () => void;
}

/**
 * Baris "filter aktif" (#417 A, T3): satu tempat yang memperlihatkan semua
 * pilihan filter & urutan yang sedang berlaku, masing-masing bisa dilepas, plus
 * Reset semua. Tidak tampil bila tak ada pilihan — tampilan bawaan tetap bersih.
 * Menggantikan tautan kecil "hapus filter band" di hero.
 */
export function ActiveFilterBar({ chips, onReset }: { chips: ActiveFilterChip[]; onReset: () => void }) {
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-dashed bg-muted/20 px-3 py-2 text-xs" role="region" aria-label="Filter aktif">
      <span className="mr-1 font-medium text-muted-foreground">Filter aktif:</span>
      {chips.map((c) => (
        <span key={c.id} data-filter={c.id} className="inline-flex items-center gap-1 rounded-full border bg-background py-0.5 pl-2 pr-1">
          <span className="text-muted-foreground">{c.label}:</span>
          <span className="font-medium">{c.value}</span>
          <button
            type="button"
            onClick={c.onRemove}
            className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={`Lepas filter ${c.label}: ${c.value}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs" onClick={onReset}>
        <RotateCcw className="mr-1 h-3.5 w-3.5" />
        Reset semua
      </Button>
    </div>
  );
}
