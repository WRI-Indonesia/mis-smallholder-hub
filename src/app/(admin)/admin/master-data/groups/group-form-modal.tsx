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
  groupType: string | null;
  districtId: string;
  joinYear: number | null;
  establishedYear: number | null;
  rspoCertYear: number | null;
  rspoCertStatus: string | null;
  ispoCertYear: number | null;
  ispoCertStatus: string | null;
  sapMapAssuranceYear: number | null;
  sapMapAssuranceStatus: string | null;
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

// Mapping value → label agar trigger Select menampilkan label, bukan nilai
// mentah ("SWADAYA"/"NONE"/id distrik) — Base UI me-render raw value tanpa
// `items` (#170).
const CATEGORY_ITEMS = { EX_PLASMA: "Ex Plasma", SWADAYA: "Swadaya" };
const GROUP_TYPE_ITEMS = { NONE: "—", ASOSIASI: "Asosiasi", KOPERASI: "Koperasi" };
const CERT_STATUS_ITEMS = { NONE: "—", CERTIFIED: "Tersertifikasi", PLANNED: "Plan" };

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1.5">
        {title}
      </p>
      {children}
    </div>
  );
}

export function GroupFormModal({ open, onClose, group, districts }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const router = useRouter();
  const isEdit = !!group;

  const districtItems = Object.fromEntries(districts.map((d) => [d.id, d.name]));

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
      groupType:
        form.get("groupType") && form.get("groupType") !== "NONE"
          ? (form.get("groupType") as "ASOSIASI" | "KOPERASI")
          : null,
      joinYear: form.get("joinYear") ? parseInt(form.get("joinYear") as string, 10) : null,
      establishedYear: form.get("establishedYear") ? parseInt(form.get("establishedYear") as string, 10) : null,
      rspoCertYear: form.get("rspoCertYear") ? parseInt(form.get("rspoCertYear") as string, 10) : null,
      rspoCertStatus:
        form.get("rspoCertStatus") && form.get("rspoCertStatus") !== "NONE"
          ? (form.get("rspoCertStatus") as "CERTIFIED" | "PLANNED")
          : null,
      ispoCertYear: form.get("ispoCertYear") ? parseInt(form.get("ispoCertYear") as string, 10) : null,
      ispoCertStatus:
        form.get("ispoCertStatus") && form.get("ispoCertStatus") !== "NONE"
          ? (form.get("ispoCertStatus") as "CERTIFIED" | "PLANNED")
          : null,
      sapMapAssuranceYear: form.get("sapMapAssuranceYear") ? parseInt(form.get("sapMapAssuranceYear") as string, 10) : null,
      sapMapAssuranceStatus:
        form.get("sapMapAssuranceStatus") && form.get("sapMapAssuranceStatus") !== "NONE"
          ? (form.get("sapMapAssuranceStatus") as "CERTIFIED" | "PLANNED")
          : null,
      locationLat: form.get("locationLat") ? parseFloat(form.get("locationLat") as string) : null,
      locationLong: form.get("locationLong") ? parseFloat(form.get("locationLong") as string) : null,
    };

    const result = isEdit
      ? await updateFarmerGroup({ id: group.id, ...data })
      : await createFarmerGroup(data);

    setIsLoading(false);

    if (!result.success) {
      if (typeof result.error === "string") {
        toast.error(result.error);
      } else {
        setErrors((result.error as Record<string, string[]>) ?? {});
      }
      return;
    }

    toast.success(isEdit ? "Lembaga Petani diupdate" : "Lembaga Petani dibuat");
    onClose();
    router.refresh();
  }

  // Baris status + tahun untuk satu skema sertifikasi/assurance (RSPO/ISPO/SAP-MAP).
  const certRow = (scheme: string, statusName: string, yearName: string, statusValue: string | null | undefined, yearValue: number | null | undefined) => (
    <div className="grid grid-cols-[minmax(90px,auto)_1fr_1fr] items-center gap-4">
      <span className="text-sm font-medium">{scheme}</span>
      <div className="space-y-1">
        <Select name={statusName} defaultValue={statusValue ?? "NONE"} items={CERT_STATUS_ITEMS}>
          <SelectTrigger className="w-full" aria-label={`Status ${scheme}`}>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NONE">—</SelectItem>
            <SelectItem value="CERTIFIED">Tersertifikasi</SelectItem>
            <SelectItem value="PLANNED">Plan</SelectItem>
          </SelectContent>
        </Select>
        {errors[statusName] && <p className="text-sm text-destructive">{errors[statusName][0]}</p>}
      </div>
      <div className="space-y-1">
        <Input
          name={yearName}
          type="number"
          min={1900}
          max={2100}
          placeholder="Tahun, cth. 2024"
          defaultValue={yearValue ?? ""}
          aria-label={`Tahun ${scheme}`}
        />
        {errors[yearName] && <p className="text-sm text-destructive">{errors[yearName][0]}</p>}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[640px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Lembaga Petani" : "Tambah Lembaga Petani"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-5">
          <FormSection title="Identitas">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Lembaga Petani</Label>
              <Input id="name" name="name" defaultValue={group?.name ?? ""} required />
              {errors.name && <p className="text-sm text-destructive">{errors.name[0]}</p>}
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Kode</Label>
                <Input id="code" name="code" defaultValue={group?.code ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="abrv">Singkatan</Label>
                <Input id="abrv" name="abrv" defaultValue={group?.abrv ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="abrv3id">Abrv 3ID</Label>
                <Input id="abrv3id" name="abrv3id" defaultValue={group?.abrv3id ?? ""} />
              </div>
            </div>
          </FormSection>

          <FormSection title="Klasifikasi">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="districtId">Distrik</Label>
                <Select name="districtId" defaultValue={group?.districtId ?? ""} items={districtItems}>
                  <SelectTrigger className="w-full">
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
                <Select name="category" defaultValue={group?.category ?? "SWADAYA"} items={CATEGORY_ITEMS}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EX_PLASMA">Ex Plasma</SelectItem>
                    <SelectItem value="SWADAYA">Swadaya</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="groupType">Tipe Grup</Label>
                <Select name="groupType" defaultValue={group?.groupType ?? "NONE"} items={GROUP_TYPE_ITEMS}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih tipe grup" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">—</SelectItem>
                    <SelectItem value="ASOSIASI">Asosiasi</SelectItem>
                    <SelectItem value="KOPERASI">Koperasi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </FormSection>

          <FormSection title="Tahun">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="establishedYear">Tahun Berdiri Lembaga</Label>
                <Input id="establishedYear" name="establishedYear" type="number" min={1900} max={2100} placeholder="cth. 2015" defaultValue={group?.establishedYear ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="joinYear">Tahun Bergabung Program</Label>
                <Input id="joinYear" name="joinYear" type="number" min={1900} max={2100} placeholder="cth. 2024" defaultValue={group?.joinYear ?? ""} />
              </div>
            </div>
          </FormSection>

          <FormSection title="Sertifikasi & Assurance">
            {certRow("RSPO", "rspoCertStatus", "rspoCertYear", group?.rspoCertStatus, group?.rspoCertYear)}
            {certRow("ISPO", "ispoCertStatus", "ispoCertYear", group?.ispoCertStatus, group?.ispoCertYear)}
            {certRow("SAP/MAP", "sapMapAssuranceStatus", "sapMapAssuranceYear", group?.sapMapAssuranceStatus, group?.sapMapAssuranceYear)}
          </FormSection>

          <FormSection title="Lokasi">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="locationLat">Latitude</Label>
                <Input id="locationLat" name="locationLat" type="number" step="any" defaultValue={group?.locationLat ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="locationLong">Longitude</Label>
                <Input id="locationLong" name="locationLong" type="number" step="any" defaultValue={group?.locationLong ?? ""} />
              </div>
            </div>
          </FormSection>

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
