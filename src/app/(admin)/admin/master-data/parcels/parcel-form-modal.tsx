"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { landParcelSchema, LandParcelFormValues } from "@/validations/land-parcel.schema";
import {
  createLandParcel,
  updateLandParcel,
  type LandParcelRow,
  type FarmerDropdownItem,
  type CommodityDropdownItem,
} from "@/server/actions/land-parcel";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ParcelFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  parcel?: LandParcelRow | null;
  farmers: FarmerDropdownItem[];
  commodities: CommodityDropdownItem[];
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ParcelFormModal({
  isOpen,
  onClose,
  parcel,
  farmers,
  commodities,
}: ParcelFormModalProps) {
  const [isPending, setIsPending] = useState(false);
  const [openFarmer, setOpenFarmer] = useState(false);
  const isEditing = !!parcel;

  const form = useForm<LandParcelFormValues>({
    resolver: zodResolver(landParcelSchema as any),
    defaultValues: {
      farmerId: parcel?.farmerId ?? "",
      commodityCode: parcel?.commodityCode ?? "",
      parcelCode: parcel?.parcelCode ?? "",
      polygonSizeHa: parcel?.polygonSizeHa ?? null,
      legalId: parcel?.legalId ?? "",
      legalSizeHa: parcel?.legalSizeHa ?? null,
      status: parcel?.status ?? "",
    },
  });

  async function onSubmit(data: LandParcelFormValues) {
    setIsPending(true);
    const result = isEditing
      ? await updateLandParcel(parcel!.id, data)
      : await createLandParcel(data);
    setIsPending(false);

    if (result.success) {
      toast.success(
        isEditing
          ? "Data persil lahan diperbarui."
          : "Persil lahan berhasil dibuat."
      );
      onClose();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Persil Lahan" : "Tambah Persil Lahan Baru"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">

            {/* Petani — searchable combobox */}
            <FormField
              control={form.control}
              name="farmerId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Petani *</FormLabel>
                  <Popover open={openFarmer} onOpenChange={setOpenFarmer}>
                    <PopoverTrigger
                      render={
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openFarmer}
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                        />
                      }
                    >
                      {field.value
                        ? (() => {
                            const f = farmers.find((f) => f.id === field.value);
                            return f
                              ? `${f.name} — ${f.farmerGroup.name}`
                              : "Pilih Petani";
                          })()
                        : "Pilih Petani"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Cari nama atau NIK..." />
                        <CommandList>
                          <CommandEmpty>Petani tidak ditemukan.</CommandEmpty>
                          <CommandGroup>
                            {farmers.map((f) => (
                              <CommandItem
                                key={f.id}
                                value={`${f.name} ${f.nik}`}
                                onSelect={() => {
                                  form.setValue("farmerId", f.id);
                                  setOpenFarmer(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    f.id === field.value
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                <span className="font-medium">{f.name}</span>
                                <span className="ml-2 text-muted-foreground text-xs">
                                  {f.nik} · {f.farmerGroup.name}
                                </span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Komoditas & Kode Persil */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="commodityCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Komoditas (Opsional)</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih Komoditas" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">— Tanpa Komoditas —</SelectItem>
                        {commodities.map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="parcelCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kode Persil (Opsional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Kode Persil" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Luas Polygon & Luas Legal */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="polygonSizeHa"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Luas Polygon (ha) (Opsional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.0001"
                        min="0"
                        placeholder="0.0000"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === "" ? null : e.target.value
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="legalSizeHa"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Luas Legal (ha) (Opsional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.0001"
                        min="0"
                        placeholder="0.0000"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === "" ? null : e.target.value
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Legal ID & Status */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="legalId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID Legal (Opsional)</FormLabel>
                    <FormControl>
                      <Input placeholder="ID Legal / Sertifikat" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status (Opsional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Aktif / Tidak Aktif" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isPending}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
