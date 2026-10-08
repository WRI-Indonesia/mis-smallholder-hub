"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

/** Lebar popover panel peta: selebar trigger (`w-full`), minimal 240px. */
export const ANCHOR_POPOVER_WIDTH = "w-[var(--anchor-width)] min-w-[240px]";

export interface FilterComboOption {
  id: string;
  name: string;
  code?: string | null;
}

export interface FilterComboboxProps {
  options: FilterComboOption[];
  /** `null` = belum dipilih (semantik "Pilih …") atau "semua" (bila `allLabel` diisi). */
  value: string | null;
  onSelect: (id: string | null) => void;
  /** Bila diisi: item teratas "Semua …" (memilihnya = `onSelect(null)`) + label trigger saat kosong. */
  allLabel?: string;
  /** Label trigger (muted) saat kosong tanpa `allLabel`, mis. "Pilih Distrik". */
  placeholder?: string;
  /** Placeholder kotak cari; default = `placeholder`. */
  searchPlaceholder?: string;
  emptyLabel: string;
  /** Kelas lebar trigger & popover, default `w-[220px]`. */
  widthClass?: string;
  /** Kelas lebar popover bila beda dari trigger (panel peta: selebar trigger, min 240px). */
  popoverWidthClass?: string;
  /** Label di atas trigger (panel peta, #315); tanpa ini hanya trigger yang dirender. */
  label?: string;
  /** Tanda wajib `*` merah di samping `label`. */
  required?: boolean;
  disabled?: boolean;
}

/**
 * Primitif combobox filter (Popover + Command) bersama — dipakai Master Data,
 * Report, dan panel Peta Lahan / Peta BMP (#315: dua salinan peta dihapus). Masih
 * ada combobox filter inline (Popover+Command) di beberapa dashboard, daftar, dan
 * laporan — semantik "Semua …"-nya bisa berbeda (TD-056). Dua semantik: `allLabel` = filter opsional dengan pilihan
 * "Semua …"; `placeholder` = pilihan wajib gaya "Pilih …". Pencarian menyertakan
 * kode lembaga bila ada.
 *
 * Item "Semua …" ber-`value="__all__"`: TIDAK ikut tersaring pencarian, jadi ia
 * tersembunyi selama pengguna mengetik dan kembali begitu kotak cari dikosongkan
 * (keputusan #315 untuk semua pemakai primitif ini).
 */
export function FilterCombobox({
  options,
  value,
  onSelect,
  allLabel,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  widthClass = "w-[220px]",
  popoverWidthClass,
  label,
  required,
  disabled,
}: FilterComboboxProps) {
  const [open, setOpen] = useState(false);

  const selected = value !== null ? options.find((o) => o.id === value) : undefined;
  // "Semua …" hanya bila nilainya memang kosong. Nilai terisi yang belum ada di
  // `options` (daftar masih dimuat / basi) tampil sebagai placeholder, bukan "Semua"
  // — kalau tidak, layar berkata "semua" padahal filter masih menyaring (review #315).
  const showAll = allLabel && value === null;

  function handleSelect(id: string | null) {
    onSelect(id);
    setOpen(false);
  }

  const combobox = (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(widthClass, "justify-between h-9 font-normal text-left")}
          >
            {selected ? (
              <span className="truncate">{selected.name}</span>
            ) : showAll ? (
              <span className="truncate">{allLabel}</span>
            ) : (
              <span className="truncate text-muted-foreground">{placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        }
      />
      <PopoverContent className={cn(popoverWidthClass ?? widthClass, "p-0")} align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder ?? placeholder} />
          <CommandList className="max-h-[300px]">
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            <CommandGroup>
              {allLabel && (
                <CommandItem value="__all__" onSelect={() => handleSelect(null)}>
                  <Check
                    className={cn("mr-2 h-4 w-4", value === null ? "opacity-100" : "opacity-0")}
                  />
                  {allLabel}
                </CommandItem>
              )}
              {options.map((o) => (
                <CommandItem
                  key={o.id}
                  value={o.code ? `${o.name} ${o.code}` : o.name}
                  onSelect={() => handleSelect(o.id)}
                >
                  <Check
                    className={cn("mr-2 h-4 w-4", value === o.id ? "opacity-100" : "opacity-0")}
                  />
                  {o.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );

  if (!label) return combobox;
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-muted-foreground">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {combobox}
    </div>
  );
}
