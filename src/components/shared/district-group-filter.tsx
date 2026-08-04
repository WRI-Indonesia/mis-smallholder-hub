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

export interface DistrictFilterOption {
  id: string;
  name: string;
}

export interface GroupFilterOption {
  id: string;
  name: string;
  code?: string | null;
  districtId: string;
}

interface Props {
  districts: DistrictFilterOption[];
  farmerGroups: GroupFilterOption[];
  districtFilter: string;
  groupFilter: string;
  onDistrictFilterChange: (value: string) => void;
  onGroupFilterChange: (value: string) => void;
}

/**
 * Pasangan filter Distrik + Lembaga Petani (combobox) yang dipakai seragam di
 * halaman Master Data (Petani, Pelatihan, Lahan, Produksi). Cascade: memilih
 * distrik menyaring daftar lembaga; lembaga terpilih yang bukan bagian dari
 * distrik baru di-reset ke "Semua" agar tidak terjadi kombinasi kontradiktif
 * (tabel kosong tanpa penjelasan).
 */
export function DistrictGroupFilter({
  districts,
  farmerGroups,
  districtFilter,
  groupFilter,
  onDistrictFilterChange,
  onGroupFilterChange,
}: Props) {
  const [districtComboOpen, setDistrictComboOpen] = useState(false);
  const [groupComboOpen, setGroupComboOpen] = useState(false);

  const visibleGroups =
    districtFilter === "all"
      ? farmerGroups
      : farmerGroups.filter((g) => g.districtId === districtFilter);

  const selectedDistrict = districts.find((d) => d.id === districtFilter);
  const selectedGroup = farmerGroups.find((g) => g.id === groupFilter);

  function handleDistrictSelect(districtId: string) {
    onDistrictFilterChange(districtId);
    // Lembaga terpilih tidak berada di distrik baru → reset ke "Semua".
    if (
      districtId !== "all" &&
      selectedGroup &&
      selectedGroup.districtId !== districtId
    ) {
      onGroupFilterChange("all");
    }
    setDistrictComboOpen(false);
  }

  return (
    <>
      <Popover open={districtComboOpen} onOpenChange={setDistrictComboOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={districtComboOpen}
              className="w-[200px] justify-between h-9 font-normal text-left"
            >
              {districtFilter === "all" ? (
                <span>Semua Distrik</span>
              ) : (
                <span>{selectedDistrict?.name}</span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          }
        />
        <PopoverContent className="w-[200px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Cari distrik..." />
            <CommandList className="max-h-[300px]">
              <CommandEmpty>Distrik tidak ditemukan.</CommandEmpty>
              <CommandGroup>
                <CommandItem value="all" onSelect={() => handleDistrictSelect("all")}>
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      districtFilter === "all" ? "opacity-100" : "opacity-0",
                    )}
                  />
                  Semua Distrik
                </CommandItem>
                {districts.map((d) => (
                  <CommandItem
                    key={d.id}
                    value={d.name}
                    onSelect={() => handleDistrictSelect(d.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        districtFilter === d.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {d.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Popover open={groupComboOpen} onOpenChange={setGroupComboOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={groupComboOpen}
              className="w-[330px] justify-between h-9 font-normal text-left"
            >
              {groupFilter === "all" ? (
                <span>Semua Lembaga Petani</span>
              ) : (
                <span>{selectedGroup?.name}</span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          }
        />
        <PopoverContent className="w-[330px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Cari lembaga petani..." />
            <CommandList className="max-h-[300px]">
              <CommandEmpty>Lembaga Petani tidak ditemukan.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="all"
                  onSelect={() => {
                    onGroupFilterChange("all");
                    setGroupComboOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      groupFilter === "all" ? "opacity-100" : "opacity-0",
                    )}
                  />
                  Semua Lembaga Petani
                </CommandItem>
                {visibleGroups.map((g) => (
                  <CommandItem
                    key={g.id}
                    value={`${g.name} ${g.code || ""}`}
                    onSelect={() => {
                      onGroupFilterChange(g.id);
                      setGroupComboOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        groupFilter === g.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {g.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </>
  );
}
