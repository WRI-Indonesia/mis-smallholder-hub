"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  staffActivitySchema,
  type StaffActivityFormValues,
} from "@/validations/staff-activity.schema";
import {
  createStaffActivity,
  updateStaffActivity,
  addActivityPhoto,
  deleteActivityPhoto,
  type StaffActivityRow,
} from "@/server/actions/staff-activity";
import { uploadActivityPhoto } from "@/server/actions/upload";
import { toast } from "sonner";
import { UploadCloud, X, FileImage, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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

// ─── Types ───────────────────────────────────────────────────────────────────

interface ActivityFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffId: string;
  activity?: StaffActivityRow | null;
  defaultDate?: string; // YYYY-MM-DD
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ActivityFormModal({
  isOpen,
  onClose,
  staffId,
  activity,
  defaultDate,
}: ActivityFormModalProps) {
  const isEditing = !!activity;
  const [isPending, setIsPending] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track photos: existing (from DB) + newly uploaded (pending save)
  const [existingPhotos, setExistingPhotos] = useState<
    { id: string; filename: string; presignedUrl: string }[]
  >(activity?.photos ?? []);
  const [pendingPhotos, setPendingPhotos] = useState<
    { key: string; filename: string; previewUrl: string }[]
  >([]);

  const form = useForm<StaffActivityFormValues>({
    resolver: zodResolver(staffActivitySchema as any),
    defaultValues: {
      activityDate: activity
        ? new Date(activity.activityDate).toISOString().split("T")[0]
        : (defaultDate ?? new Date().toISOString().split("T")[0]),
      planning: activity?.planning ?? "",
      realization: activity?.realization ?? "",
      comment: activity?.comment ?? "",
    },
  });

  // ─── Photo upload ──────────────────────────────────────────────────────

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const totalPhotos =
      existingPhotos.length + pendingPhotos.length + files.length;
    if (totalPhotos > 10) {
      toast.error("Maksimal 10 foto per aktivitas.");
      e.target.value = "";
      return;
    }

    setUploadingPhoto(true);
    for (const file of files) {
      // Need activityId for S3 key — use temp id for new activities
      const tempId = activity?.id ?? `tmp-${Date.now()}`;
      const fd = new FormData();
      fd.append("file", file);
      fd.append("activityId", tempId);

      const result = await uploadActivityPhoto(fd);
      if (result.success) {
        const previewUrl = URL.createObjectURL(file);
        setPendingPhotos((prev) => [
          ...prev,
          { key: result.data!.key, filename: result.data!.filename, previewUrl },
        ]);
      } else {
        toast.error(`Gagal upload ${file.name}: ${result.error}`);
      }
    }
    setUploadingPhoto(false);
    e.target.value = "";
  }

  async function handleDeleteExistingPhoto(photoId: string) {
    const result = await deleteActivityPhoto(photoId, staffId);
    if (result.success) {
      setExistingPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } else {
      toast.error(result.error);
    }
  }

  function removePendingPhoto(key: string) {
    setPendingPhotos((prev) => prev.filter((p) => p.key !== key));
  }

  // ─── Submit ────────────────────────────────────────────────────────────

  async function onSubmit(data: StaffActivityFormValues) {
    setIsPending(true);
    try {
      let activityId: string;

      if (isEditing) {
        const result = await updateStaffActivity(activity!.id, staffId, data);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        activityId = activity!.id;
      } else {
        const result = await createStaffActivity(staffId, data);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        activityId = result.data!.id;
      }

      // Save pending photos to DB
      for (const p of pendingPhotos) {
        await addActivityPhoto(activityId, staffId, p.key, p.filename);
      }

      toast.success(
        isEditing ? "Aktivitas berhasil diperbarui." : "Aktivitas berhasil ditambahkan."
      );
      onClose();
    } finally {
      setIsPending(false);
    }
  }

  const totalPhotos = existingPhotos.length + pendingPhotos.length;

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Aktivitas" : "Tambah Aktivitas Harian"}
          </DialogTitle>
        </DialogHeader>

        {/* Rejection note warning */}
        {isEditing && activity?.rejectionNote && (
          <div className="rounded-md border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 px-3 py-2 text-sm text-red-700 dark:text-red-400">
            <span className="font-medium">Catatan penolakan: </span>
            {activity.rejectionNote}
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-1">

            {/* Tanggal */}
            <FormField
              control={form.control}
              name="activityDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tanggal *</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      max={new Date().toISOString().split("T")[0]}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Planning */}
            <FormField
              control={form.control}
              name="planning"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Planning *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Rencana kegiatan hari ini..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Realization */}
            <FormField
              control={form.control}
              name="realization"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Realisasi</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Hasil / realisasi kegiatan..."
                      rows={3}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Komentar */}
            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Komentar</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Catatan tambahan..."
                      rows={2}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Foto */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  Dokumentasi Foto
                  <span className="ml-2 text-xs text-muted-foreground font-normal">
                    ({totalPhotos}/10)
                  </span>
                </p>
                {totalPhotos < 10 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                  >
                    {uploadingPhoto ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <UploadCloud className="h-3 w-3 mr-1" />
                    )}
                    Upload Foto
                  </Button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/jpg,application/pdf"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />

              {totalPhotos === 0 ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted/40"
                >
                  <UploadCloud className="h-4 w-4" />
                  Klik untuk upload foto (JPG, PNG, PDF — maks. 5MB)
                </button>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {/* Existing photos */}
                  {existingPhotos.map((p) => (
                    <div
                      key={p.id}
                      className="relative group rounded-md border bg-muted/30 aspect-square flex items-center justify-center overflow-hidden"
                    >
                      {p.presignedUrl.match(/\.(jpg|jpeg|png)(\?|$)/i) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.presignedUrl}
                          alt={p.filename}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <FileImage className="h-6 w-6 text-muted-foreground" />
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteExistingPhoto(p.id)}
                        className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-1 truncate">
                        {p.filename}
                      </span>
                    </div>
                  ))}
                  {/* Pending photos */}
                  {pendingPhotos.map((p) => (
                    <div
                      key={p.key}
                      className="relative group rounded-md border bg-muted/30 aspect-square flex items-center justify-center overflow-hidden"
                    >
                      {p.previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.previewUrl}
                          alt={p.filename}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <FileImage className="h-6 w-6 text-muted-foreground" />
                      )}
                      <button
                        type="button"
                        onClick={() => removePendingPhoto(p.key)}
                        className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-1 truncate">
                        {p.filename}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
                Batal
              </Button>
              <Button type="submit" disabled={isPending || uploadingPhoto}>
                {isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
