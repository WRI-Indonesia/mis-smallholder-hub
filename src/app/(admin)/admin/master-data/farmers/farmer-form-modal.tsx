"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createFarmer, updateFarmer } from "@/server/actions/farmer";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Farmer {
  id: string;
  farmerGroupId: string;
  gender: "M" | "F";
  name: string;
  farmerId: string;
  nik: string | null;
  address: string | null;
  birthPlace: string | null;
  birthDate: Date | string | null;
}

interface FarmerGroup {
  id: string;
  name: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  farmer: Farmer | null;
  farmerGroups: FarmerGroup[];
}

export function FarmerFormModal({ open, onClose, farmer, farmerGroups }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const router = useRouter();
  const isEdit = !!farmer;

  const formatDateForInput = (dateVal: Date | string | null | undefined) => {
    if (!dateVal) return "";
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0];
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    const form = new FormData(e.currentTarget);

    const data = {
      farmerGroupId: form.get("farmerGroupId") as string,
      gender: form.get("gender") as "M" | "F",
      name: form.get("name") as string,
      farmerId: form.get("farmerId") as string,
      nik: (form.get("nik") as string) || null,
      address: (form.get("address") as string) || null,
      birthPlace: (form.get("birthPlace") as string) || null,
      birthDate: form.get("birthDate") ? (form.get("birthDate") as string) : null,
    };

    const result = isEdit
      ? await updateFarmer({ id: farmer.id, ...data })
      : await createFarmer(data);

    setIsLoading(false);

    if (!result.success) {
      if (typeof result.error === "string") {
        toast.error(result.error);
      } else {
        setErrors((result.error as Record<string, string[]>) ?? {});
      }
      return;
    }

    toast.success(isEdit ? "Data petani diupdate" : "Data petani dibuat");
    onClose();
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Petani" : "Tambah Petani"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="farmerId">ID Petani</Label>
              <Input id="farmerId" name="farmerId" defaultValue={farmer?.farmerId ?? ""} required />
              {errors.farmerId && <p className="text-sm text-destructive">{errors.farmerId[0]}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="nik">NIK</Label>
              <Input id="nik" name="nik" defaultValue={farmer?.nik ?? ""} />
              {errors.nik && <p className="text-sm text-destructive">{errors.nik[0]}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nama Petani</Label>
            <Input id="name" name="name" defaultValue={farmer?.name ?? ""} required />
            {errors.name && <p className="text-sm text-destructive">{errors.name[0]}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gender">Jenis Kelamin</Label>
              <Select name="gender" defaultValue={farmer?.gender ?? "M"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Laki-laki</SelectItem>
                  <SelectItem value="F">Perempuan</SelectItem>
                </SelectContent>
              </Select>
              {errors.gender && <p className="text-sm text-destructive">{errors.gender[0]}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="farmerGroupId">Kelompok Tani</Label>
              <Select name="farmerGroupId" defaultValue={farmer?.farmerGroupId ?? ""}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Kelompok Tani" />
                </SelectTrigger>
                <SelectContent>
                  {farmerGroups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.farmerGroupId && (
                <p className="text-sm text-destructive">{errors.farmerGroupId[0]}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="birthPlace">Tempat Lahir</Label>
              <Input id="birthPlace" name="birthPlace" defaultValue={farmer?.birthPlace ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="birthDate">Tanggal Lahir</Label>
              <Input
                id="birthDate"
                name="birthDate"
                type="date"
                defaultValue={formatDateForInput(farmer?.birthDate)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Alamat</Label>
            <Input id="address" name="address" defaultValue={farmer?.address ?? ""} />
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
