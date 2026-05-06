"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { villageSchema, VillageFormValues } from "@/validations/region.schema";
import { createVillage, updateVillage } from "@/server/actions/region";
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

interface VillageFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  village?: {
    id: string;
    code: string;
    name: string;
    subdistrictId: string;
  } | null;
  defaultSubdistrictId?: string;
}

export function VillageFormModal({
  isOpen,
  onClose,
  village,
  defaultSubdistrictId,
}: VillageFormModalProps) {
  const [isPending, setIsPending] = useState(false);
  const isEditing = !!village;

  const form = useForm<VillageFormValues>({
    resolver: zodResolver(villageSchema),
    defaultValues: {
      code: village?.code ?? "",
      name: village?.name ?? "",
      subdistrictId: village?.subdistrictId ?? defaultSubdistrictId ?? "",
    },
  });

  async function onSubmit(data: VillageFormValues) {
    setIsPending(true);
    const result = isEditing
      ? await updateVillage(village!.id, data)
      : await createVillage(data);
    setIsPending(false);

    if (result.success) {
      toast.success(isEditing ? "Desa diperbarui." : "Desa berhasil dibuat.");
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
            {isEditing ? "Edit Desa" : "Tambah Desa Baru"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            {/* Since subdistricts are lazy-loaded, we just use a hidden input for subdistrictId and let the user add children directly from the tree node */}
            <input type="hidden" {...form.register("subdistrictId")} />

            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kode Wilayah</FormLabel>
                  <FormControl>
                    <Input placeholder="1404012001" {...field} />
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
                  <FormLabel>Nama Desa / Kelurahan</FormLabel>
                  <FormControl>
                    <Input placeholder="Pangkalan Kerinci Kota" {...field} />
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
