"use client";

import { cn } from "@/lib/utils";

/**
 * Slicer rentang waktu bersama (Kurva RVS & Jumlah Test): berapa hari yang
 * muat di viewport chart — konsep chart produksi Detail Lahan; null = semua.
 */
export const TIME_WINDOWS: { label: string; days: number | null }[] = [
  { label: "1 Minggu", days: 7 },
  { label: "1 Bulan", days: 30 },
  { label: "6 Bulan", days: 183 },
  { label: "1 Tahun", days: 365 },
  { label: "Semua", days: null },
];

export function TimeWindowButtons({
  value,
  onChange,
  compact = false,
}: {
  value: number | null;
  onChange: (days: number | null) => void;
  compact?: boolean;
}) {
  return (
    <div className="flex justify-end gap-1" role="group" aria-label="Rentang waktu tampak">
      {TIME_WINDOWS.map((p) => (
        <button
          key={p.label}
          onClick={() => onChange(p.days)}
          aria-pressed={value === p.days}
          className={cn(
            "rounded py-1 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring",
            compact ? "px-1.5 text-[10px]" : "px-2 text-xs",
            value === p.days
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
