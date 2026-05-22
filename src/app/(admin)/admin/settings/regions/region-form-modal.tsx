"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  createProvince, updateProvince,
  createDistrict, updateDistrict,
  createSubdistrict, updateSubdistrict,
  createVillage, updateVillage,
} from "@/server/actions/region";

export type RegionLevel = "province" | "district" | "subdistrict" | "village";

const LEVEL_LABELS: Record<RegionLevel, string> = {
  province: "Provinsi",
  district: "Distrik",
  subdistrict: "Kecamatan",
  village: "Desa / Kelurahan",
};

export interface RegionFormData {
  id?: string;
  code?: string;
  name?: string;
  parentId?: string;
  parentName?: string;
}

interface RegionFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  level: RegionLevel;
  data?: RegionFormData;
}

export function RegionFormModal({ open, onClose, onSuccess, level, data }: RegionFormModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const isEdit = !!data?.id;
  const levelLabel = LEVEL_LABELS[level];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    const form = new FormData(e.currentTarget);
    const code = form.get("code") as string;
    const name = form.get("name") as string;

    let result: { success: boolean; error?: unknown };

    if (level === "province") {
      result = isEdit
        ? await updateProvince({ id: data!.id!, code, name })
        : await createProvince({ code, name });
    } else if (level === "district") {
      result = isEdit
        ? await updateDistrict({ id: data!.id!, provinceId: data!.parentId!, code, name })
        : await createDistrict({ provinceId: data!.parentId!, code, name });
    } else if (level === "subdistrict") {
      result = isEdit
        ? await updateSubdistrict({ id: data!.id!, districtId: data!.parentId!, code, name })
        : await createSubdistrict({ districtId: data!.parentId!, code, name });
    } else {
      result = isEdit
        ? await updateVillage({ id: data!.id!, subdistrictId: data!.parentId!, code, name })
        : await createVillage({ subdistrictId: data!.parentId!, code, name });
    }

    setIsLoading(false);

    if (!result.success) {
      if (typeof result.error === "string") {
        toast.error(result.error);
      } else {
        setErrors((result.error as Record<string, string[]>) ?? {});
      }
      return;
    }

    toast.success(`${levelLabel} berhasil ${isEdit ? "diupdate" : "ditambahkan"}`);
    onSuccess();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit" : "Tambah"} {levelLabel}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {data?.parentName && (
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Induk</Label>
              <p className="text-sm font-medium">{data.parentName}</p>
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor="code">Kode</Label>
            <Input id="code" name="code" defaultValue={data?.code ?? ""} placeholder="mis. 3201" />
            {errors.code && <p className="text-xs text-destructive">{errors.code[0]}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="name">Nama</Label>
            <Input id="name" name="name" defaultValue={data?.name ?? ""} placeholder={`Nama ${levelLabel}`} />
            {errors.name && <p className="text-xs text-destructive">{errors.name[0]}</p>}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Batal
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
