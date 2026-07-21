"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createTrainingActivity, updateTrainingActivity } from "@/server/actions/training";
import { uploadTrainingEvidence } from "@/server/actions/upload";
import { toast } from "sonner";
import { Loader2, Check, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { TRAINING_CATEGORY_LABELS } from "./training-list-client";
import { Calendar } from "@/components/ui/calendar";
import { id } from "date-fns/locale";

interface TrainingActivity {
  id: string;
  packageId: string;
  farmerGroupId: string;
  location: string | null;
  trainingDate: Date | string;
  evidenceKey?: string | null;
  evidenceName?: string | null;
}

interface TrainingPackage {
  id: string;
  code: string;
  name: string;
}

interface FarmerGroup {
  id: string;
  name: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  activity: TrainingActivity | null;
  packages: TrainingPackage[];
  farmerGroups: FarmerGroup[];
}

export function TrainingFormModal({ open, onClose, activity, packages, farmerGroups }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [farmerGroupId, setFarmerGroupId] = useState(activity?.farmerGroupId ?? "");
  const [packageId, setPackageId] = useState(activity?.packageId ?? packages[0]?.id ?? "");
  const [trainingDate, setTrainingDate] = useState<Date>(
    activity?.trainingDate ? new Date(activity.trainingDate) : new Date(),
  );
  const [comboOpen, setComboOpen] = useState(false);
  const router = useRouter();
  const isEdit = !!activity;

  const formatDisplayDate = (d: Date | null) => {
    if (!d) return "Pilih Tanggal";
    const date = new Date(d);
    if (isNaN(date.getTime())) return "Pilih Tanggal";
    const day = String(date.getDate()).padStart(2, "0");
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "Mei",
      "Jun",
      "Jul",
      "Agu",
      "Sep",
      "Okt",
      "Nov",
      "Des",
    ];
    const month = months[date.getMonth()];
    return `${day}/${month}/${date.getFullYear()}`;
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    const form = new FormData(e.currentTarget);
    const file = form.get("evidence") as File | null;

    if (!farmerGroupId) {
      setErrors((prev) => ({ ...prev, farmerGroupId: ["Kelompok tani wajib dipilih"] }));
      setIsLoading(false);
      return;
    }

    // Client-side file validation
    if (file && file.size > 0) {
      if (file.type !== "application/pdf") {
        setErrors((prev) => ({ ...prev, evidence: ["Hanya file PDF yang diizinkan"] }));
        setIsLoading(false);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, evidence: ["Ukuran file maksimal 10 MB"] }));
        setIsLoading(false);
        return;
      }
    }

    const data = {
      packageId: form.get("packageId") as string,
      farmerGroupId,
      location: (form.get("location") as string) || null,
      trainingDate,
    };

    if (isEdit) {
      let evidenceKey = activity.evidenceKey;
      let evidenceName = activity.evidenceName;

      if (file && file.size > 0) {
        const uploadForm = new FormData();
        uploadForm.append("file", file);
        uploadForm.append("activityId", activity.id);

        const uploadRes = await uploadTrainingEvidence(uploadForm);
        if (!uploadRes.success) {
          toast.error(uploadRes.error || "Gagal mengupload evidence");
          setIsLoading(false);
          return;
        }
        evidenceKey = uploadRes.data!.key;
        evidenceName = uploadRes.data!.filename;
      }

      const result = await updateTrainingActivity({
        id: activity.id,
        ...data,
        evidenceKey,
        evidenceName,
      });

      setIsLoading(false);

      if (!result.success) {
        if (typeof result.error === "string") {
          toast.error(result.error);
        } else {
          setErrors((result.error as Record<string, string[]>) ?? {});
        }
        return;
      }
    } else {
      const result = await createTrainingActivity(data);

      if (!result.success) {
        setIsLoading(false);
        if (typeof result.error === "string") {
          toast.error(result.error);
        } else {
          setErrors((result.error as Record<string, string[]>) ?? {});
        }
        return;
      }

      // If a file was selected, upload it now
      if (file && file.size > 0 && result.id) {
        const uploadForm = new FormData();
        uploadForm.append("file", file);
        uploadForm.append("activityId", result.id);

        const uploadRes = await uploadTrainingEvidence(uploadForm);
        if (!uploadRes.success) {
          toast.warning(
            "Pelatihan berhasil dibuat, tetapi gagal mengupload evidence: " + uploadRes.error,
          );
        } else {
          // Update the training activity with the uploaded key/name
          await updateTrainingActivity({
            id: result.id,
            ...data,
            evidenceKey: uploadRes.data!.key,
            evidenceName: uploadRes.data!.filename,
          });
        }
      }

      setIsLoading(false);
    }

    toast.success(isEdit ? "Data pelatihan diupdate" : "Data pelatihan dibuat");
    onClose();
    router.refresh();
  }

  const selectedGroup = farmerGroups.find((g) => g.id === farmerGroupId);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Pelatihan" : "Tambah Pelatihan"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="packageId">Paket Pelatihan</Label>
            <Select name="packageId" value={packageId} onValueChange={(v) => setPackageId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih Paket Pelatihan">
                  {(() => {
                    const pkg = packages.find((p) => p.id === packageId);
                    if (!pkg) return "Pilih Paket Pelatihan";
                    return TRAINING_CATEGORY_LABELS[pkg.code] || pkg.name;
                  })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {packages.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {TRAINING_CATEGORY_LABELS[p.code] || p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.packageId && <p className="text-sm text-destructive">{errors.packageId[0]}</p>}
          </div>

          <div className="space-y-2 flex flex-col">
            <Label htmlFor="farmerGroupId">Lembaga Petani</Label>
            <Popover open={comboOpen} onOpenChange={setComboOpen}>
              <PopoverTrigger
                render={
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={comboOpen}
                    className="w-full justify-between h-10 font-normal text-left"
                  >
                    {farmerGroupId ? (
                      <span>{selectedGroup?.name}</span>
                    ) : (
                      <span className="text-muted-foreground">Pilih Lembaga Petani</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                }
              />
              <PopoverContent className="w-[470px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Cari lembaga petani..." />
                  <CommandList className="max-h-[250px]">
                    <CommandEmpty>Lembaga Petani tidak ditemukan.</CommandEmpty>
                    <CommandGroup>
                      {farmerGroups.map((g) => (
                        <CommandItem
                          key={g.id}
                          value={g.name}
                          onSelect={() => {
                            setFarmerGroupId(g.id);
                            setComboOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              farmerGroupId === g.id ? "opacity-100" : "opacity-0",
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
            {errors.farmerGroupId && (
              <p className="text-sm text-destructive mt-1">{errors.farmerGroupId[0]}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 flex flex-col">
              <Label htmlFor="trainingDate">Tanggal Pelatihan</Label>
              <Popover>
                <PopoverTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start text-left font-normal h-10 border-input bg-transparent"
                    >
                      <span className="flex-1">{formatDisplayDate(trainingDate)}</span>
                      <span className="text-muted-foreground">📅</span>
                    </Button>
                  }
                />
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={trainingDate}
                    onSelect={(date) => date && setTrainingDate(date)}
                    locale={id}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {errors.trainingDate && (
                <p className="text-sm text-destructive">{errors.trainingDate[0]}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Lokasi</Label>
              <Input
                id="location"
                name="location"
                placeholder="Contoh: Balai Desa"
                defaultValue={activity?.location ?? ""}
              />
              {errors.location && <p className="text-sm text-destructive">{errors.location[0]}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="evidence">Evidence (Notulen PDF, maks 10MB)</Label>
            <Input
              id="evidence"
              name="evidence"
              type="file"
              accept="application/pdf"
              className="cursor-pointer"
            />
            {activity?.evidenceName && (
              <p className="text-xs text-muted-foreground mt-1">
                File saat ini:{" "}
                <span className="font-medium text-primary">{activity.evidenceName}</span>
              </p>
            )}
            {errors.evidence && (
              <p className="text-sm text-destructive mt-1">{errors.evidence[0]}</p>
            )}
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
