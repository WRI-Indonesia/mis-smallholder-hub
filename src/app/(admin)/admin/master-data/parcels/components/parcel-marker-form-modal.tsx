"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { createLandMarker, updateLandMarker, uploadLandMarkerPhoto } from "@/server/actions/land-marker";
import {
  LAND_MARKER_CONDITIONS,
  LAND_MARKER_CONDITION_LABELS,
  LAND_MARKER_TYPES,
  LAND_MARKER_TYPE_LABELS,
  MARKER_MAX_DISTANCE_M,
  labelOf,
} from "@/lib/land-marker";
import type { LandMarkerItem } from "@/types/land-parcel";

/**
 * Form patok (#329) — komponen sendiri, bukan `parcel-satellite-form-modal`:
 * field koordinat + unggah foto berbeda dari satelit lain. Form uncontrolled
 * (FormData); error per field dari Zod server tampil di bawah input. Foto hanya
 * bisa diunggah pada patok yang sudah ada (butuh markerId).
 */
interface Props {
  open: boolean;
  onClose: () => void;
  landParcelId: string;
  item: LandMarkerItem | null;
}

const toDateInput = (d: Date | null | undefined) => (d ? new Date(d).toISOString().slice(0, 10) : "");
const str = (form: FormData, k: string) => ((form.get(k) as string) ?? "").trim();

export function ParcelMarkerFormModal({ open, onClose, landParcelId, item }: Props) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [condition, setCondition] = useState<string>(item?.condition ?? "NOT_INSTALLED");
  const [type, setType] = useState<string>(item?.type ?? "_none");
  const [photoUrl, setPhotoUrl] = useState<string | null>(item?.photoUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const isEdit = Boolean(item);

  const fieldError = (k: string) => (errors[k]?.length ? <p className="text-xs text-destructive">{errors[k][0]}</p> : null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});
    const form = new FormData(e.currentTarget);
    const data = {
      landParcelId,
      longitude: str(form, "longitude"),
      latitude: str(form, "latitude"),
      condition,
      type: type === "_none" ? "" : type,
      installedAt: str(form, "installedAt"),
      installedBy: str(form, "installedBy"),
      notes: str(form, "notes"),
    };
    try {
      const result = item ? await updateLandMarker({ ...data, markerId: item.id }) : await createLandMarker(data);
      if (!result.success) {
        if (typeof result.error === "string") toast.error(result.error);
        else setErrors((result.error as Record<string, string[]>) ?? {});
        return;
      }
      toast.success(`Patok berhasil ${isEdit ? "diubah" : "ditambahkan"}`);
      onClose();
      router.refresh();
    } catch {
      toast.error("Gagal menyimpan — periksa koneksi lalu coba lagi");
    } finally {
      setIsLoading(false);
    }
  }

  async function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !item) return;
    setUploading(true);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("landParcelId", landParcelId);
    fd.set("markerId", item.id);
    try {
      const res = await uploadLandMarkerPhoto(fd);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      setPhotoUrl(res.data!.url);
      toast.success("Foto patok tersimpan");
      router.refresh();
    } catch {
      toast.error("Gagal mengunggah foto — periksa koneksi lalu coba lagi");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Ubah Patok #${item!.sequenceNo} · ${item!.code}` : "Tambah Patok"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          {isEdit && item!.sharedWith.length > 0 && (
            <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Patok ini juga dipakai lahan {item!.sharedWith.map((s) => s.parcelId).join(", ")} — perubahan koordinat/kondisi/foto berlaku untuk semuanya.
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="latitude">Lintang (lat) *</Label>
              <Input id="latitude" name="latitude" inputMode="decimal" placeholder="0.523456" defaultValue={item ? item.latitude.toFixed(6) : ""} />
              {fieldError("latitude")}
            </div>
            <div className="space-y-2">
              <Label htmlFor="longitude">Bujur (long) *</Label>
              <Input id="longitude" name="longitude" inputMode="decimal" placeholder="101.191234" defaultValue={item ? item.longitude.toFixed(6) : ""} />
              {fieldError("longitude")}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            WGS84, desimal. Koordinat harus berada ≤ {MARKER_MAX_DISTANCE_M} m dari batas lahan — lat/long tertukar akan ditolak dengan petunjuk.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Kondisi *</Label>
              <Select value={condition} onValueChange={(v) => setCondition(v ?? "NOT_INSTALLED")}>
                <SelectTrigger className="w-full h-9">
                  <SelectValue>{(v: string) => labelOf(LAND_MARKER_CONDITION_LABELS, v)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {LAND_MARKER_CONDITIONS.map((c) => (
                    <SelectItem key={c} value={c}>{LAND_MARKER_CONDITION_LABELS[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldError("condition")}
            </div>
            <div className="space-y-2">
              {/* "Bahan" (owner 2026-09-20, #345): beton/kayu/pipa/tanda alam — bukan "jenis" patok. */}
              <Label>Bahan</Label>
              <Select value={type} onValueChange={(v) => setType(v ?? "_none")}>
                <SelectTrigger className="w-full h-9">
                  <SelectValue>{(v: string) => (v === "_none" ? "—" : labelOf(LAND_MARKER_TYPE_LABELS, v))}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">—</SelectItem>
                  {LAND_MARKER_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{LAND_MARKER_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldError("type")}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="installedAt">Tanggal Pemasangan</Label>
              <Input id="installedAt" name="installedAt" type="date" defaultValue={toDateInput(item?.installedAt)} />
              {fieldError("installedAt")}
            </div>
            <div className="space-y-2">
              <Label htmlFor="installedBy">Dipasang oleh</Label>
              <Input id="installedBy" name="installedBy" defaultValue={item?.installedBy ?? ""} />
              {fieldError("installedBy")}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Keterangan</Label>
            <Textarea id="notes" name="notes" rows={2} defaultValue={item?.notes ?? ""} placeholder='mis. "di tepi jalan", "berbatasan dengan Pak Budi"' />
            {fieldError("notes")}
          </div>

          {isEdit && (
            <div className="space-y-2">
              <Label>Foto patok</Label>
              <div className="flex items-start gap-3">
                {photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoUrl} alt={`Foto patok #${item!.sequenceNo}`} className="h-20 w-20 rounded-md border object-cover" />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">Belum ada</div>
                )}
                <div className="space-y-1">
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onPhotoChange} />
                  <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
                    {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    {photoUrl ? "Ganti foto" : "Unggah foto"}
                  </Button>
                  <p className="text-xs text-muted-foreground">JPG/PNG/WebP ≤ 5 MB. Foto tersimpan langsung, tak perlu klik Simpan.</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>Batal</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Simpan" : "Tambah"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
