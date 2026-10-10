"use client";

import { cn } from "@/lib/utils";
import type { SankeyMode } from "@/lib/supply-chain-flow";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  /** Penjelasan singkat saat kursor di atas tombol. */
  hint?: string;
}

/**
 * Tombol segmen kecil (pilihan tunggal). Dengan `caption`, label kelompoknya
 * tampil di depan tombol (toolbar Aliran TBS — owner 2026-10-09: toggle tanpa
 * label sulit dipahami).
 */
export function SegmentToggle<T extends string>({
  value,
  options,
  onChange,
  label,
  caption,
  className,
}: {
  value: T;
  options: SegmentOption<T>[];
  onChange: (v: T) => void;
  label: string;
  caption?: string;
  className?: string;
}) {
  const group = (
    <div className={cn("inline-flex rounded-md border bg-muted/50 p-0.5 text-xs", !caption && className)} role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          title={o.hint}
          onClick={() => onChange(o.value)}
          className={cn("rounded px-3 py-1 font-medium transition-colors", value === o.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
  if (!caption) return group;
  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{caption}</span>
      {group}
    </div>
  );
}

/** Tombol segmen Ringkas | Detail (Peta Rantai Pasok). */
export function ModeToggle({ mode, onChange, className }: { mode: SankeyMode; onChange: (m: SankeyMode) => void; className?: string }) {
  return (
    <SegmentToggle
      value={mode}
      onChange={onChange}
      label="Tingkat rincian"
      className={className}
      options={[{ value: "RINGKAS", label: "Ringkas" }, { value: "RINCI", label: "Detail" }]}
    />
  );
}
