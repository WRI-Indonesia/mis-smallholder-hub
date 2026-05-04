"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { provinceSchema, ProvinceFormValues } from "@/validations/region.schema";
import { createProvince, updateProvince } from "@/server/actions/region";
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

interface ProvinceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  province?: { id: string; code: string; name: string } | null;
}

export function ProvinceFormModal({
  isOpen,
  onClose,
  province,
}: ProvinceFormModalProps) {
  const [isPending, setIsPending] = useState(false);
  const isEditing = !!province;

  const form = useForm<ProvinceFormValues>({
    resolver: zodResolver(provinceSchema),
    defaultValues: {
      code: province?.code ?? "",
      name: province?.name ?? "",
    },
  });

  async function onSubmit(data: ProvinceFormValues) {
    setIsPending(true);
    const result = isEditing
      ? await updateProvince(province!.id, data)
      : await createProvince(data);
    setIsPending(false);

    if (result.success) {
      toast.success(isEditing ? "Provinsi diperbarui." : "Provinsi berhasil dibuat.");
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
            {isEditing ? "Edit Provinsi" : "Tambah Provinsi Baru"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kode Wilayah</FormLabel>
                  <FormControl>
                    <Input placeholder="14" {...field} />
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
                  <FormLabel>Nama Provinsi</FormLabel>
                  <FormControl>
                    <Input placeholder="Riau" {...field} />
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
