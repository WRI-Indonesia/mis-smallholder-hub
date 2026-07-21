"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { createLandParcel, updateLandParcel } from "@/server/actions/land-parcel";
import { toast } from "sonner";
import { Loader2, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

import type { LandParcel, FarmerSelect } from "@/types/land-parcel";

interface Props {
  open: boolean;
  onClose: () => void;
  parcel: LandParcel | null;
  farmers: FarmerSelect[];
}

export function ParcelFormModal({ open, onClose, parcel, farmers }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [selectedFarmerId, setSelectedFarmerId] = useState<string>(parcel?.farmerId ?? "");
  const [farmerComboOpen, setFarmerComboOpen] = useState(false);
  const router = useRouter();
  const isEdit = !!parcel;

  const currentFarmer = farmers.find((f) => f.id === selectedFarmerId);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedFarmerId) {
      toast.error("Petani wajib dipilih");
      return;
    }

    setIsLoading(true);
    setErrors({});

    const form = new FormData(e.currentTarget);
    const areaRaw = form.get("area") as string;
    const plantingYearRaw = form.get("plantingYear") as string;

    const data = {
      farmerId: selectedFarmerId,
      parcelId: form.get("parcelId") as string,
      blok: (form.get("blok") as string) || null,
      // Geometry tidak dikirim: undefined = server mempertahankan polygon existing
      // (payload list tidak membawa geometry, #163).
      area: areaRaw ? parseFloat(areaRaw) : null,
      landStatus: (form.get("landStatus") as string) || null,
      cropType: (form.get("cropType") as string) || null,
      species: (form.get("species") as string) || null,
      isPsr: form.get("isPsr") === "on",
      plantingYear: plantingYearRaw ? parseInt(plantingYearRaw, 10) : null,
      subGroupLv1: (form.get("subGroupLv1") as string) || null,
      subGroupLv2: (form.get("subGroupLv2") as string) || null,
      notes: (form.get("notes") as string) || null,
    };

    const result = isEdit
      ? await updateLandParcel({ id: parcel.id, ...data })
      : await createLandParcel(data);

    setIsLoading(false);

    if (!result.success) {
      if (typeof result.error === "string") {
        toast.error(result.error);
      } else {
        setErrors((result.error as Record<string, string[]>) ?? {});
      }
      return;
    }

    toast.success(isEdit ? "Data lahan berhasil diubah" : "Data lahan berhasil ditambahkan");
    onClose();
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Lahan" : "Tambah Lahan"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Petani</Label>
            <Popover open={farmerComboOpen} onOpenChange={setFarmerComboOpen}>
              <PopoverTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={farmerComboOpen}
                    className="w-full justify-between h-9 font-normal text-left"
                  >
                    {selectedFarmerId ? (
                      <span>
                        {currentFarmer?.name} ({currentFarmer?.farmerId})
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Pilih Petani</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                }
              />
              <PopoverContent className="w-[470px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Cari petani..." />
                  <CommandList className="max-h-[200px]">
                    <CommandEmpty>Petani tidak ditemukan.</CommandEmpty>
                    <CommandGroup>
                      {farmers.map((f) => (
                        <CommandItem
                          key={f.id}
                          value={`${f.name} ${f.farmerId}`}
                          onSelect={() => {
                            setSelectedFarmerId(f.id);
                            setFarmerComboOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedFarmerId === f.id ? "opacity-100" : "opacity-0",
                            )}
                          />
                          {f.name} ({f.farmerId})
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {errors.farmerId && <p className="text-sm text-destructive">{errors.farmerId[0]}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="parcelId">ID Lahan</Label>
              <Input id="parcelId" name="parcelId" defaultValue={parcel?.parcelId ?? ""} required />
              {errors.parcelId && <p className="text-sm text-destructive">{errors.parcelId[0]}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="area">Luas (Hektar)</Label>
              <Input
                id="area"
                name="area"
                type="number"
                step="0.01"
                min="0"
                placeholder="Contoh: 1.5"
                defaultValue={parcel?.area ?? ""}
              />
              {errors.area && <p className="text-sm text-destructive">{errors.area[0]}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="blok">Blok</Label>
            <Input
              id="blok"
              name="blok"
              defaultValue={parcel?.blok ?? ""}
              placeholder="Blok kebun"
            />
            {errors.blok && <p className="text-sm text-destructive">{errors.blok[0]}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="landStatus">Status Kepemilikan</Label>
              <Select name="landStatus" defaultValue={parcel?.landStatus ?? ""}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Owned">Milik Sendiri (Owned)</SelectItem>
                  <SelectItem value="Leased">Sewa (Leased)</SelectItem>
                  <SelectItem value="Shared">Bagi Hasil (Shared)</SelectItem>
                </SelectContent>
              </Select>
              {errors.landStatus && (
                <p className="text-sm text-destructive">{errors.landStatus[0]}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cropType">Komoditas</Label>
              <Input
                id="cropType"
                name="cropType"
                defaultValue={parcel?.cropType ?? ""}
                placeholder="Contoh: Kelapa Sawit"
              />
              {errors.cropType && <p className="text-sm text-destructive">{errors.cropType[0]}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="species">Species</Label>
              <Input
                id="species"
                name="species"
                defaultValue={parcel?.species ?? ""}
                placeholder="Contoh: Elaeis guineensis"
              />
              {errors.species && <p className="text-sm text-destructive">{errors.species[0]}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="isPsr">PSR (Peremajaan Sawit Rakyat)</Label>
              <label className="flex items-center gap-2 h-9 px-3 border rounded-md text-sm cursor-pointer">
                <input
                  type="checkbox"
                  id="isPsr"
                  name="isPsr"
                  defaultChecked={parcel?.isPsr ?? false}
                  className="h-4 w-4 accent-primary"
                />
                Lahan sedang PSR (replanting)
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="plantingYear">Tahun Tanam</Label>
              <Input
                id="plantingYear"
                name="plantingYear"
                type="number"
                min={1900}
                max={2100}
                placeholder="Contoh: 2018"
                defaultValue={parcel?.plantingYear ?? ""}
              />
              {errors.plantingYear && (
                <p className="text-sm text-destructive">{errors.plantingYear[0]}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Revisi</Label>
              <p className="text-sm font-mono h-9 flex items-center px-3 border rounded-md bg-muted/40 text-muted-foreground">
                {parcel?.revision ?? 0}
                {parcel && <span className="ml-2 text-xs">(otomatis bertambah saat disimpan)</span>}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="subGroupLv1">Gapoktan/KUD</Label>
              <Input
                id="subGroupLv1"
                name="subGroupLv1"
                defaultValue={parcel?.subGroupLv1 ?? ""}
                placeholder="Nama Gapoktan/KUD"
              />
              {errors.subGroupLv1 && (
                <p className="text-sm text-destructive">{errors.subGroupLv1[0]}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="subGroupLv2">Kelompok Tani</Label>
              <Input
                id="subGroupLv2"
                name="subGroupLv2"
                defaultValue={parcel?.subGroupLv2 ?? ""}
                placeholder="Nama Kelompok Tani"
              />
              {errors.subGroupLv2 && (
                <p className="text-sm text-destructive">{errors.subGroupLv2[0]}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Catatan</Label>
            <Textarea
              id="notes"
              name="notes"
              defaultValue={parcel?.notes ?? ""}
              placeholder="Catatan tambahan..."
            />
            {errors.notes && <p className="text-sm text-destructive">{errors.notes[0]}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Simpan" : "Buat"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
