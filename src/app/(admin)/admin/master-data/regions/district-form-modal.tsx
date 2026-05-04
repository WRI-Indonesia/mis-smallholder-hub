"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { districtSchema, DistrictFormValues } from "@/validations/region.schema";
import { createDistrict, updateDistrict } from "@/server/actions/region";
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

interface DistrictFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  district?: {
    id: string;
    code: string;
    name: string;
    provinceId: string;
  } | null;
  provinces: { id: string; code: string; name: string }[];
  defaultProvinceId?: string;
}

export function DistrictFormModal({
  isOpen,
  onClose,
  district,
  provinces,
  defaultProvinceId,
}: DistrictFormModalProps) {
  const [isPending, setIsPending] = useState(false);
  const isEditing = !!district;

  const form = useForm<DistrictFormValues>({
    resolver: zodResolver(districtSchema),
    defaultValues: {
      code: district?.code ?? "",
      name: district?.name ?? "",
      provinceId: district?.provinceId ?? defaultProvinceId ?? "",
    },
  });

  async function onSubmit(data: DistrictFormValues) {
    setIsPending(true);
    const result = isEditing
      ? await updateDistrict(district!.id, data)
      : await createDistrict(data);
    setIsPending(false);

    if (result.success) {
      toast.success(isEditing ? "Kabupaten diperbarui." : "Kabupaten berhasil dibuat.");
      onClose();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Kabupaten" : "Tambah Kabupaten Baru"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="provinceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Provinsi</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih Provinsi" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {provinces.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.code})
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
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kode Wilayah</FormLabel>
                  <FormControl>
                    <Input placeholder="1404" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Kabupaten</FormLabel>
                  <FormControl>
                    <Input placeholder="Pelalawan" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
