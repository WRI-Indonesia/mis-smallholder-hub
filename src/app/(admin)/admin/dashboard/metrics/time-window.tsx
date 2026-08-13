"use client";

import { cn } from "@/lib/utils";

/**
 * Kontrol rentang waktu TUNGGAL halaman Metrik rilis: berapa hari ke belakang
 * yang ditampilkan ketiga grafik. Nilainya menyaring data (lihat `windowSlice`)
 * sehingga sumbu X ketiganya selalu sama — dulu tiap chart punya slicer sendiri
 * dan hasilnya tidak bisa dibandingkan berdampingan.
 */
export type TimeWindow = { label: string; days: number | null };

export const TIME_WINDOWS: TimeWindow[] = [
  { label: "1 Minggu", days: 7 },
  { label: "1 Bulan", days: 30 },
  { label: "6 Bulan", days: 183 },
  { label: "1 Tahun", days: 365 },
  { label: "Semua", days: null },
];

/**
 * Pilihan yang masuk akal untuk rentang data yang ada: opsi yang sudah melebihi
 * umur data sama saja dengan "Semua" — tombol kembar hanya menambah keraguan.
 */
export const availableWindows = (spanDays: number): TimeWindow[] => [
  ...TIME_WINDOWS.filter((w) => w.days != null && w.days < spanDays),
  { label: "Semua", days: null },
];

export function TimeWindowButtons({
  value,
  onChange,
  windows = TIME_WINDOWS,
}: {
  value: number | null;
  onChange: (days: number | null) => void;
  windows?: TimeWindow[];
}) {
  return (
    <div className="flex justify-end gap-1" role="group" aria-label="Rentang waktu grafik">
      {windows.map((p) => (
        <button
          key={p.label}
          onClick={() => onChange(p.days)}
          aria-pressed={value === p.days}
          className={cn(
            "rounded px-2 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring",
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
