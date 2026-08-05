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
  searchPlaceholder: string;
  emptyLabel: string;
  /** Kelas lebar trigger & popover, default `w-[220px]`. */
  widthClass?: string;
  disabled?: boolean;
}

/**
 * Primitif combobox filter (Popover + Command) yang dipakai seragam untuk
 * filter Distrik / Lembaga Petani di Master Data dan Report. Dua semantik:
 * `allLabel` = filter opsional dengan pilihan "Semua …"; `placeholder` =
 * pilihan wajib gaya "Pilih …" (report). Pencarian menyertakan kode lembaga
 * bila ada.
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
  disabled,
}: FilterComboboxProps) {
  const [open, setOpen] = useState(false);

  const selected = value !== null ? options.find((o) => o.id === value) : undefined;

  function handleSelect(id: string | null) {
    onSelect(id);
    setOpen(false);
  }

  return (
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
              <span>{selected.name}</span>
            ) : allLabel ? (
              <span>{allLabel}</span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        }
      />
      <PopoverContent className={cn(widthClass, "p-0")} align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
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
}
