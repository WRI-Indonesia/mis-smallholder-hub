"use client";

import { X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { GROUP_CATEGORY_LABEL, UL_FILTER_LABEL, UNKNOWN_MILL_FILTER, millLabel, type SupplyChainView } from "@/lib/supply-chain-flow";
import type { ScFilterParam, SupplyChainFilterState } from "./use-supply-chain-filters";

/**
 * Umpan balik saat filter diterapkan dari klik node/baris (owner 2026-10-10):
 * kartu dan tabel di luar layar ikut berubah, jadi beri tahu sekali — satu id
 * agar klik beruntun mengganti toast, bukan menumpuk.
 */
export function notifyFilter(label: string, description = "Kartu, diagram, dan tabel ikut tersaring. Hapus lewat chip di bawah bar filter.") {
  toast(`Filter: ${label}`, { id: "sc-filter", duration: 2500, description });
}

/**
 * Chip filter aktif — satu tempat untuk seluruh halaman (dulu hanya di kartu
 * Aliran TBS, padahal filter memengaruhi kartu angka dan tabel Mill juga).
 */
export function SupplyChainFilterChips({ f, view, className }: { f: SupplyChainFilterState; view: SupplyChainView; className?: string }) {
  const { offtakers, millsById } = f;
  const chipMill = f.filter.millId ? millsById.get(f.filter.millId) : undefined;
  const chips: { param: ScFilterParam; label: string }[] = [
    f.district ? { param: "distrik" as const, label: `Distrik: ${f.district}` } : null,
    f.category ? { param: "kategori" as const, label: `Kategori: ${GROUP_CATEGORY_LABEL[f.category]}` } : null,
    f.filter.groupCode
      ? { param: "lembaga" as const, label: `Lembaga: ${view.data.groups.find((g) => g.code === f.filter.groupCode)?.abrv ?? f.filter.groupCode}` }
      : null,
    f.filter.collectorId ? { param: "agen" as const, label: `Agen: ${offtakers.get(f.filter.collectorId)?.name ?? f.filter.collectorId}` } : null,
    f.filter.rampId ? { param: "ramp" as const, label: `RAMP: ${offtakers.get(f.filter.rampId)?.name ?? f.filter.rampId}` } : null,
    f.filter.millId
      ? { param: "mill" as const, label: f.filter.millId === UNKNOWN_MILL_FILTER ? "Mill tidak diketahui" : `Mill: ${chipMill ? millLabel(chipMill) : f.filter.millId}` }
      : null,
    f.filter.ul ? { param: "ul" as const, label: UL_FILTER_LABEL[f.filter.ul] } : null,
  ].filter((x) => x !== null);
  if (chips.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5 text-xs", className)} aria-label="Filter aktif">
      <span className="font-medium text-foreground">Filter:</span>
      {chips.map((c) => (
        <span key={c.param} className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 py-0.5 pl-2 pr-1 text-foreground">
          {c.label}
          <button
            type="button"
            onClick={() => f.update({ [c.param]: null })}
            aria-label={`Hapus filter ${c.label}`}
            className="rounded-full p-0.5 text-muted-foreground hover:bg-primary/20 hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      {chips.length > 1 && (
        <button type="button" onClick={f.reset} className="ml-1 text-primary underline-offset-2 hover:underline">
          Hapus semua
        </button>
      )}
    </div>
  );
}
