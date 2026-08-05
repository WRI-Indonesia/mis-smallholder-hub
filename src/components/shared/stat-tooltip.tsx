"use client";

import type { ReactNode } from "react";
import { TooltipContent } from "@/components/ui/tooltip";

const formatNumber = (n: number) => new Intl.NumberFormat("id-ID").format(n);
const formatPct = (n: number) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(n);

/**
 * Isi tooltip data terstruktur — satu sumber gaya untuk semua sel/bar angka
 * (#213, pola dari #205): judul tebal, baris-baris `StatTooltipRow`, lalu
 * footer bergaris atas. Dipakai bersama `Tooltip`/`TooltipTrigger` biasa.
 */
export function StatTooltipContent({
  title,
  subtitle,
  footer,
  children,
}: {
  title: ReactNode;
  /** Baris konteks kecil di bawah judul, mis. nama Lembaga. */
  subtitle?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <TooltipContent className="flex-col items-stretch gap-1 px-3 py-2 tabular-nums">
      <p className="pb-0.5 font-semibold">
        {title}
        {subtitle != null && (
          <span className="block text-[11px] font-normal text-background/60">{subtitle}</span>
        )}
      </p>
      {children}
      {footer != null && (
        <p className="mt-1 border-t border-background/20 pt-1 text-background/70">{footer}</p>
      )}
    </TooltipContent>
  );
}

/** Baris rincian: chip warna (sinkron warna visualnya), label, angka, persen opsional. */
export function StatTooltipRow({
  chip,
  label,
  value,
  pct,
}: {
  chip: string;
  label: string;
  value: number | string;
  pct?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${chip}`} />
      <span className="text-background/75">{label}</span>
      <span className="ml-auto pl-4 font-semibold tabular-nums">
        {typeof value === "number" ? formatNumber(value) : value}
      </span>
      {pct != null && (
        <span className="w-11 shrink-0 text-right tabular-nums text-background/60">
          {formatPct(pct)}%
        </span>
      )}
    </div>
  );
}
