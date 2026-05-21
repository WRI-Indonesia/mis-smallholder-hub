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
import { createFarmerGroup, updateFarmerGroup } from "@/server/actions/farmer-group";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface FarmerGroup {
  id: string;
  code: string | null;
  abrv: string | null;
  abrv3id: string | null;
  name: string;
  category: string;
  districtId: string;
  joinYear: number | null;
  locationLat: number | null;
  locationLong: number | null;
}

interface District {
  id: string;
  name: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  group: FarmerGroup | null;
  districts: District[];
}

export function GroupFormModal({ open, onClose, group, districts }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const router = useRouter();
  const isEdit = !!group;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    const form = new FormData(e.currentTarget);

    const data = {
      districtId: form.get("districtId") as string,
      code: (form.get("code") as string) || null,
      abrv: (form.get("abrv") as string) || null,
      abrv3id: (form.get("abrv3id") as string) || null,
      name: form.get("name") as string,
      category: form.get("category") as "EX_PLASMA" | "SWADAYA",
      joinYear: form.get("joinYear") ? parseInt(form.get("joinYear") as string, 10) : null,
      locationLat: form.get("locationLat") ? parseFloat(form.get("locationLat") as string) : null,
      locationLong: form.get("locationLong") ? parseFloat(form.get("locationLong") as string) : null,
    };

    const result = isEdit
      ? await updateFarmerGroup({ id: group.id, ...data })
      : await createFarmerGroup(data);

    setIsLoading(false);

    if (!result.success) {
      setErrors((result.error as Record<string, string[]>) ?? {});
      return;
    }

    toast.success(isEdit ? "Kelompok Tani diupdate" : "Kelompok Tani dibuat");
    onClose();
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Kelompok Tani" : "Tambah Kelompok Tani"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nama KT</Label>
            <Input id="name" name="name" defaultValue={group?.name ?? ""} required />
            {errors.name && <p className="text-sm text-destructive">{errors.name[0]}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Kode</Label>
              <Input id="code" name="code" defaultValue={group?.code ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="abrv">Singkatan</Label>
              <Input id="abrv" name="abrv" defaultValue={group?.abrv ?? ""} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="districtId">Distrik</Label>
              <Select name="districtId" defaultValue={group?.districtId ?? ""}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih distrik" />
                </SelectTrigger>
                <SelectContent>
                  {districts.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.districtId && <p className="text-sm text-destructive">{errors.districtId[0]}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Kategori</Label>
              <Select name="category" defaultValue={group?.category ?? "SWADAYA"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EX_PLASMA">Ex Plasma</SelectItem>
                  <SelectItem value="SWADAYA">Swadaya</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="joinYear">Tahun</Label>
              <Input id="joinYear" name="joinYear" type="number" defaultValue={group?.joinYear ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="locationLat">Latitude</Label>
              <Input id="locationLat" name="locationLat" type="number" step="any" defaultValue={group?.locationLat ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="locationLong">Longitude</Label>
              <Input id="locationLong" name="locationLong" type="number" step="any" defaultValue={group?.locationLong ?? ""} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="abrv3id">Abrv 3ID</Label>
            <Input id="abrv3id" name="abrv3id" defaultValue={group?.abrv3id ?? ""} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
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
