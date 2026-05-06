"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { farmerSchema, FarmerFormValues } from "@/validations/farmer.schema";
import { createFarmer, updateFarmer, type FarmerRow, type BatchDropdownItem } from "@/server/actions/farmer";
import { type FarmerGroupRow } from "@/server/actions/farmer-group";
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
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Check, ChevronsUpDown, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FarmerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  farmer?: FarmerRow | null;
  groups: FarmerGroupRow[];
  batches: BatchDropdownItem[];
}

export function FarmerFormModal({
  isOpen,
  onClose,
  farmer,
  groups,
  batches,
}: FarmerFormModalProps) {
  const [isPending, setIsPending] = useState(false);
  const [openGroup, setOpenGroup] = useState(false);
  const [openBatch, setOpenBatch] = useState(false);
  const isEditing = !!farmer;

  const form = useForm<FarmerFormValues>({
    resolver: zodResolver(farmerSchema as any),
    defaultValues: {
      name: farmer?.name ?? "",
      nik: farmer?.nik ?? "",
      gender: (farmer?.gender as any) ?? undefined,
      birthdate: farmer?.birthdate ? new Date(farmer.birthdate) : undefined,
      farmerGroupId: farmer?.farmerGroupId ?? "",
      batchId: farmer?.batchId ?? "",
      wriFarmerId: farmer?.wriFarmerId ?? "",
      uiFarmerId: farmer?.uiFarmerId ?? "",
      status: farmer?.status ?? "",
    },
  });

  async function onSubmit(data: FarmerFormValues) {
    setIsPending(true);
    const result = isEditing
      ? await updateFarmer(farmer!.id, data)
      : await createFarmer(data);
    setIsPending(false);

    if (result.success) {
      toast.success(
        isEditing ? "Data petani diperbarui." : "Data petani berhasil dibuat."
      );
      onClose();
    } else {
      if (result.error === "NIK sudah terdaftar") {
        form.setError("nik", { message: result.error });
      } else {
        toast.error(result.error);
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Petani" : "Tambah Petani Baru"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nama Petani" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nik"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NIK (16 digit) *</FormLabel>
                    <FormControl>
                      <Input placeholder="1234567890123456" maxLength={16} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                <FormItem>
                  <FormLabel>Jenis Kelamin *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih Jenis Kelamin" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="L">Laki-laki</SelectItem>
                      <SelectItem value="P">Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="birthdate"
                render={({ field }) => (
                  <FormItem className="flex flex-col justify-end">
                    <FormLabel>Tanggal Lahir (Opsional)</FormLabel>
                    <Popover>
                      <PopoverTrigger 
                        render={
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          />
                        }
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pilih Tanggal</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value === "" ? undefined : field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

              <FormField
                control={form.control}
                name="farmerGroupId"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Kelompok Tani *</FormLabel>
                    <Popover open={openGroup} onOpenChange={setOpenGroup}>
                      <PopoverTrigger
                        render={
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openGroup}
                            className={cn(
                              "w-full justify-between",
                              !field.value && "text-muted-foreground"
                            )}
                          />
                        }
                      >
                        {field.value
                          ? groups.find((g) => g.id === field.value)?.name
                          : "Pilih Kelompok Tani"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Cari kelompok..." />
                          <CommandList>
                            <CommandEmpty>Kelompok tani tidak ditemukan.</CommandEmpty>
                            <CommandGroup>
                              {groups.map((g) => (
                                <CommandItem
                                  key={g.id}
                                  value={g.name}
                                  onSelect={() => {
                                    form.setValue("farmerGroupId", g.id);
                                    setOpenGroup(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      g.id === field.value ? "opacity-100" : "opacity-0"
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
                    <FormMessage />
                  </FormItem>
                )}
              />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="batchId"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Batch (Opsional)</FormLabel>
                    <Popover open={openBatch} onOpenChange={setOpenBatch}>
                      <PopoverTrigger
                        render={
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openBatch}
                            className={cn(
                              "w-full justify-between",
                              !field.value && "text-muted-foreground"
                            )}
                          />
                        }
                      >
                        {field.value && field.value !== "none"
                          ? batches.find((b) => b.id === field.value)?.name
                          : "Pilih Batch"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Cari batch..." />
                          <CommandList>
                            <CommandEmpty>Batch tidak ditemukan.</CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                value="none"
                                onSelect={() => {
                                  form.setValue("batchId", "none");
                                  setOpenBatch(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    field.value === "none" || !field.value ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                Tanpa Batch
                              </CommandItem>
                              {batches.map((b) => (
                                <CommandItem
                                  key={b.id}
                                  value={`${b.name} ${b.code}`}
                                  onSelect={() => {
                                    form.setValue("batchId", b.id);
                                    setOpenBatch(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      b.id === field.value ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {b.name} ({b.code})
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

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status (Opsional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Aktif / Tidak Aktif" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
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
