"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { subdistrictSchema, SubdistrictFormValues } from "@/validations/region.schema";
import { createSubdistrict, updateSubdistrict } from "@/server/actions/region";
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

interface SubdistrictFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  subdistrict?: {
    id: string;
    code: string;
    name: string;
    districtId: string;
  } | null;
  districts: { id: string; code: string; name: string }[];
  defaultDistrictId?: string;
}

export function SubdistrictFormModal({
  isOpen,
  onClose,
  subdistrict,
  districts,
  defaultDistrictId,
}: SubdistrictFormModalProps) {
  const [isPending, setIsPending] = useState(false);
  const isEditing = !!subdistrict;

  const form = useForm<SubdistrictFormValues>({
    resolver: zodResolver(subdistrictSchema),
    defaultValues: {
      code: subdistrict?.code ?? "",
      name: subdistrict?.name ?? "",
      districtId: subdistrict?.districtId ?? defaultDistrictId ?? "",
    },
  });

  async function onSubmit(data: SubdistrictFormValues) {
    setIsPending(true);
    const result = isEditing
      ? await updateSubdistrict(subdistrict!.id, data)
      : await createSubdistrict(data);
    setIsPending(false);

    if (result.success) {
      toast.success(isEditing ? "Kecamatan diperbarui." : "Kecamatan berhasil dibuat.");
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
            {isEditing ? "Edit Kecamatan" : "Tambah Kecamatan Baru"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="districtId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kabupaten</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih Kabupaten" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {districts.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name} ({d.code})
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
                    <Input placeholder="140401" {...field} />
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
                  <FormLabel>Nama Kecamatan</FormLabel>
                  <FormControl>
                    <Input placeholder="Pangkalan Kerinci" {...field} />
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
