"use client";

import { X } from "lucide-react";

export interface ActiveFilterChip {
  /** Kunci stabil (mis. kunci URL) — juga dipakai test. */
  id: string;
  label: string;
  value: string;
  onRemove: () => void;
}

/**
 * Baris "filter aktif" (#417 A, T3): satu tempat yang memperlihatkan semua
 * pilihan filter & urutan yang sedang berlaku, masing-masing bisa dilepas.
 * Tidak tampil bila tak ada pilihan — tampilan bawaan tetap bersih.
 * Menggantikan tautan kecil "hapus filter band" (istilah lama) di hero.
 * Reset semua pindah ke tombol Reset standar di ujung bar filter (#427).
 */
export function ActiveFilterBar({ chips }: { chips: ActiveFilterChip[] }) {
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
    </div>
  );
}
