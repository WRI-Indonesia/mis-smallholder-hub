"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

/**
 * POPUP PETA STANDAR — primitif bersama agar semua popup lahan (Sebaran Lahan,
 * Peta Lahan, Peta BMP) tampil konsisten. Latar kartu, radius, bayangan, dan
 * tombol close diatur global di `globals.css` (`.maplibregl-popup-content`);
 * modul ini menstandarkan STRUKTUR isi: pita header ber-ikon → highlight
 * metrik → seksi collapsible → baris atribut, lalu footer aksi.
 *
 * Konvensi props react-map-gl <Popup>: sebar `MAP_POPUP_PROPS`.
 * Rule: docs/standards/ui-ux.md §"Popup Peta (standar)".
 */

/** Props <Popup> react-map-gl standar (anchor bawah; lebar dikontrol isi via w-[…]). */
export const MAP_POPUP_PROPS = {
  anchor: "bottom",
  offset: 16,
  maxWidth: "none",
  closeOnClick: false,
  className: "map-parcel-popup",
} as const;

const ACCENTS = {
  blue: "bg-blue-500/10",
  emerald: "bg-emerald-500/10",
  amber: "bg-amber-500/10",
  red: "bg-red-500/10",
} as const;

export type MapPopupAccent = keyof typeof ACCENTS;

/** Pita header: ikon dalam kotak + judul + baris identitas. `pr-8` menyisakan ruang tombol close. */
export function MapPopupHeader({
  accent = "blue",
  icon,
  title,
  rows,
}: {
  accent?: MapPopupAccent;
  icon: ReactNode;
  title: string;
  rows?: { label: string; value: ReactNode; mono?: boolean }[];
}) {
  return (
    <div className={cn("flex items-center gap-3 px-3.5 py-3 pr-8", ACCENTS[accent])}>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border bg-muted">
        {icon}
      </div>
      <div className="min-w-0 space-y-0.5">
        <p className="truncate text-sm font-semibold leading-tight">{title}</p>
        {rows && rows.length > 0 && (
          <div className="space-y-0.5 text-[11px] text-muted-foreground">
            {rows.map((r) => (
              <p key={r.label} className={cn(r.mono && "whitespace-nowrap")}>
                <span>{r.label}: </span>
                <span className={cn("text-foreground/80", r.mono && "font-mono")}>{r.value}</span>
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Pita metrik utama (mis. "Luas Lahan"). */
export function MapPopupHighlight({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between border-y bg-muted/40 px-3.5 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-base font-bold tabular-nums">{value}</span>
    </div>
  );
}

export type MapPopupRow = { label: string; value: unknown; mono?: boolean };

/** Daftar atribut label ↔ nilai (nilai kosong → "—", nilai panjang wrap). */
export function MapPopupRows({ rows, className }: { rows: MapPopupRow[]; className?: string }) {
  return (
    <dl className={cn("space-y-1.5", className)}>
      {rows.map((r) => {
        const display = r.value === null || r.value === undefined || r.value === "" ? "—" : String(r.value);
        return (
          <div key={r.label} className="flex items-start justify-between gap-3">
            <dt className="shrink-0 text-xs text-muted-foreground">{r.label}</dt>
            <dd className={cn("min-w-0 break-words text-right text-xs font-medium", r.mono && "font-mono")}>{display}</dd>
          </div>
        );
      })}
    </dl>
  );
}

/** Seksi collapsible di dalam kartu popup. */
export function MapPopupSection({
  icon,
  title,
  defaultOpen = false,
  onOpenChange,
  children,
}: {
  icon: ReactNode;
  title: string;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const handle = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
  };
  return (
    <Collapsible open={open} onOpenChange={handle}>
      <CollapsibleTrigger
        render={
          <button className="flex w-full items-center justify-between px-3.5 py-2.5 text-left hover:bg-muted/40">
            <span className="flex items-center gap-2 text-xs font-semibold">
              {icon}
              {title}
            </span>
            <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
          </button>
        }
      />
      <CollapsibleContent>
        <div className="px-3.5 pb-3">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
