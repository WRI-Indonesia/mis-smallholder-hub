"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type StatusFilterValue = "all" | "active" | "inactive";

/** Pilihan filter Status daftar — satu sumber label (#350). */
export const STATUS_FILTER_ITEMS: { value: StatusFilterValue; label: string }[] = [
  { value: "all", label: "Semua Status" },
  { value: "active", label: "Aktif" },
  { value: "inactive", label: "Nonaktif" },
];

/**
 * Filter Status (Semua / Aktif / Nonaktif) untuk halaman daftar (#350) —
 * satu komponen menggantikan 7 blok salinan. Label pemicu dijamin oleh
 * wrapper `Select` (menurunkan `items` dari `SelectItem`); `items` eksplisit
 * di sini hanya menegaskan sumber labelnya.
 */
export function StatusFilterSelect({
  value,
  onChange,
  className,
  fallback = "active",
}: {
  value: StatusFilterValue;
  onChange: (value: StatusFilterValue) => void;
  className?: string;
  /** Nilai bila Select mengirim null (dibersihkan). */
  fallback?: StatusFilterValue;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange((v as StatusFilterValue | null) ?? fallback)} items={STATUS_FILTER_ITEMS}>
      <SelectTrigger className={cn("w-[140px]", className)} aria-label="Filter status">
        <SelectValue placeholder="Status" />
      </SelectTrigger>
      <SelectContent>
        {STATUS_FILTER_ITEMS.map((i) => (
          <SelectItem key={i.value} value={i.value}>
            {i.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
