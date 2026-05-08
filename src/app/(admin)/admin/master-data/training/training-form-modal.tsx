"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  trainingActivitySchema,
  type TrainingActivityFormValues,
} from "@/validations/training-activity.schema";
import {
  createTrainingActivity,
  updateTrainingActivity,
  type TrainingActivityRow,
  type FarmerGroupDropdownItem,
  type TrainingPackageDropdownItem,
} from "@/server/actions/training";
import { uploadTrainingEvidence } from "@/server/actions/upload";
import { toast } from "sonner";
import { Check, ChevronsUpDown, FileText, UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/utils";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TrainingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  activity?: TrainingActivityRow | null;
  farmerGroups: FarmerGroupDropdownItem[];
  trainingPackages: TrainingPackageDropdownItem[];
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TrainingFormModal({
  isOpen,
  onClose,
  activity,
  farmerGroups,
  trainingPackages,
}: TrainingFormModalProps) {
  const [isPending, setIsPending] = useState(false);
  const [openGroup, setOpenGroup] = useState(false);
  const [openPackage, setOpenPackage] = useState(false);

  // ─── File upload state ─────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Existing evidence from edit mode
  const existingEvidence = activity?.evidences?.[0] ?? null;

  const isEditing = !!activity;

  // ─── Form ──────────────────────────────────────────────────────────────

  const defaultDate = activity?.trainingDate
    ? new Date(activity.trainingDate).toISOString().split("T")[0]
    : "";

  const form = useForm<TrainingActivityFormValues>({
    resolver: zodResolver(trainingActivitySchema as any),
    defaultValues: {
      packageId: activity?.packageId ?? "",
      farmerGroupId: activity?.farmerGroupId ?? "",
      location: activity?.location ?? "",
      trainingDate: defaultDate,
    },
  });

  // ─── File picker handler ───────────────────────────────────────────────

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setUploadError(null);

    if (!file) {
      setSelectedFile(null);
      return;
    }
    if (file.type !== "application/pdf") {
      setUploadError("Hanya file PDF yang diizinkan.");
      setSelectedFile(null);
      e.target.value = "";
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("Ukuran file maksimal 10 MB.");
      setSelectedFile(null);
      e.target.value = "";
      return;
    }
    setSelectedFile(file);
  }

  function clearFile() {
    setSelectedFile(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ─── Submit ────────────────────────────────────────────────────────────

  async function onSubmit(data: TrainingActivityFormValues) {
    setIsPending(true);
    setUploadError(null);

    try {
      let evidenceUrl: string | undefined;
      let evidenceFilename: string | undefined;

      // Step 1: Upload PDF to bucket if a file was selected
      if (selectedFile) {
        // We need an activityId for the bucket path.
        // For create: generate a temp cuid-like placeholder, then use the
        // real id returned from createTrainingActivity.
        // Simplest approach: upload first with a temp id, then save.
        // For edit: use the existing activity id.
        const uploadId = isEditing ? activity!.id : `tmp-${Date.now()}`;

        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("activityId", uploadId);

        const uploadResult = await uploadTrainingEvidence(formData);

        if (!uploadResult.success) {
          setUploadError(uploadResult.error);
          setIsPending(false);
          return;
        }

        evidenceUrl = uploadResult.data!.key;
        evidenceFilename = uploadResult.data!.filename;
      }

      // Step 2: Save activity + evidence to DB
      const result = isEditing
        ? await updateTrainingActivity(activity!.id, data, evidenceUrl, evidenceFilename)
        : await createTrainingActivity(data, evidenceUrl, evidenceFilename);

      if (result.success) {
        toast.success(
          isEditing
            ? "Data training berhasil diperbarui."
            : "Kegiatan training berhasil ditambahkan."
        );
        onClose();
      } else {
        toast.error(result.error);
      }
    } finally {
      setIsPending(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Kegiatan Training" : "Tambah Kegiatan Training"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">

            {/* Kelompok Tani */}
            <FormField
              control={form.control}
              name="farmerGroupId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Kelompok Tani *</FormLabel>
                  <Popover open={openGroup} onOpenChange={setOpenGroup}>
                    <PopoverTrigger
                      render={
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        />
                      }
                    >
                      {field.value
                        ? (farmerGroups.find((g) => g.id === field.value)?.name ?? "Pilih kelompok tani")
                        : "Pilih kelompok tani"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </PopoverTrigger>
                    <PopoverContent className="w-[460px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Cari kelompok tani..." />
                        <CommandList>
                          <CommandEmpty>Kelompok tani tidak ditemukan.</CommandEmpty>
                          <CommandGroup>
                            {farmerGroups.map((g) => (
                              <CommandItem
                                key={g.id}
                                value={`${g.name} ${g.code ?? ""}`}
                                onSelect={() => {
                                  form.setValue("farmerGroupId", g.id);
                                  setOpenGroup(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    field.value === g.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <span>{g.name}</span>
                                {g.code && (
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    {g.code}
                                  </span>
                                )}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Paket Training */}
            <FormField
              control={form.control}
              name="packageId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Paket Training *</FormLabel>
                  <Popover open={openPackage} onOpenChange={setOpenPackage}>
                    <PopoverTrigger
                      render={
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        />
                      }
                    >
                      {field.value
                        ? (trainingPackages.find((p) => p.id === field.value)?.name ?? "Pilih paket training")
                        : "Pilih paket training"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </PopoverTrigger>
                    <PopoverContent className="w-[460px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Cari paket training..." />
                        <CommandList>
                          <CommandEmpty>Paket training tidak ditemukan.</CommandEmpty>
                          <CommandGroup>
                            {trainingPackages.map((p) => (
                              <CommandItem
                                key={p.id}
                                value={`${p.name} ${p.code}`}
                                onSelect={() => {
                                  form.setValue("packageId", p.id);
                                  setOpenPackage(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    field.value === p.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <span>{p.name}</span>
                                <span className="ml-2 text-xs font-mono text-muted-foreground">
                                  {p.code}
                                </span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tanggal Training */}
            <FormField
              control={form.control}
              name="trainingDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tanggal Training *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Lokasi */}
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lokasi</FormLabel>
                  <FormControl>
                    <Input placeholder="Balai Desa Makmur" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Evidence PDF Upload */}
            <div className="space-y-2">
              <p className="text-sm font-medium leading-none">
                Evidence (PDF)
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  — maks. 10 MB
                </span>
              </p>

              {/* Existing evidence in edit mode */}
              {isEditing && existingEvidence && !selectedFile && (
                <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <a
                    href={existingEvidence.presignedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 truncate text-primary hover:underline"
                  >
                    {existingEvidence.name}
                  </a>
                  <span className="text-xs text-muted-foreground">
                    (upload baru untuk mengganti)
                  </span>
                </div>
              )}

              {/* Selected new file preview */}
              {selectedFile ? (
                <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
                  <FileText className="h-4 w-4 shrink-0 text-primary" />
                  <span className="flex-1 truncate font-medium">
                    {selectedFile.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                  <button
                    type="button"
                    onClick={clearFile}
                    className="ml-1 rounded p-0.5 hover:bg-accent"
                    title="Hapus file"
                  >
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                >
                  <UploadCloud className="h-4 w-4" />
                  Klik untuk pilih file PDF
                </button>
              )}

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleFileChange}
              />

              {/* Upload error */}
              {uploadError && (
                <p className="text-xs text-destructive">{uploadError}</p>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isPending}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    {selectedFile ? "Mengupload..." : "Menyimpan..."}
                  </span>
                ) : (
                  "Simpan"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
