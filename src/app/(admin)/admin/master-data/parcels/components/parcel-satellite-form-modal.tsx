"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { LAND_DOCUMENT_TYPES, LAND_DOCUMENT_TYPE_LABELS } from "@/lib/land-parcel-detail-import";
import {
  createLandParcelDocument,
  updateLandParcelDocument,
  createLandStdb,
  updateLandStdb,
  createLandParcelExternalId,
  updateLandParcelExternalId,
  createLandParcelProgram,
  updateLandParcelProgram,
} from "@/server/actions/land-parcel-satellite";
import {
  PARCEL_MAPPERS,
  DEFAULT_PARCEL_MAPPER,
  LAND_STDB_STAGES,
  LAND_STDB_STAGE_LABELS,
} from "@/lib/land-parcel-satellite-format";
import type {
  LandParcelDocumentItem,
  LandStdbItem,
  LandParcelExternalIdItem,
  LandParcelProgramItem,
} from "@/types/land-parcel";

/**
 * Satu modal untuk tambah/ubah empat jenis satelit lahan (#296 tahap 3c).
 * Form uncontrolled (FormData) mengikuti pola parcel-form-modal; error per
 * field dari Zod server ditampilkan di bawah input.
 */

export type SatelliteFormTarget =
  | { kind: "document"; item: LandParcelDocumentItem | null }
  | { kind: "stdb"; item: LandStdbItem | null }
  | { kind: "externalId"; item: LandParcelExternalIdItem | null }
  | { kind: "program"; item: LandParcelProgramItem | null };

interface Props {
  open: boolean;
  onClose: () => void;
  landParcelId: string;
  target: SatelliteFormTarget;
}

const TITLES: Record<SatelliteFormTarget["kind"], string> = {
  document: "Surat Kepemilikan",
  stdb: "STDB",
  externalId: "UL Parcel Code",
  program: "Program",
};

const STATUS_OPTIONS = [
  ["PLANNED", "Direncanakan"],
  ["ACTIVE", "Berjalan"],
  ["COMPLETED", "Selesai"],
  ["CANCELLED", "Dibatalkan"],
] as const;

const toDateInput = (d: Date | null | undefined) => (d ? new Date(d).toISOString().slice(0, 10) : "");
const str = (form: FormData, k: string) => ((form.get(k) as string) ?? "").trim();

export function ParcelSatelliteFormModal({ open, onClose, landParcelId, target }: Props) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [docType, setDocType] = useState<string>(target.kind === "document" ? (target.item?.type ?? "") : "");
  const [status, setStatus] = useState<string>(target.kind === "program" ? (target.item?.status ?? "ACTIVE") : "ACTIVE");
  // Tahap STDB (#306): menentukan field mana yang muncul/wajib — nomor & tanggal
  // terbit hanya untuk TERBIT, catatan wajib untuk REVISI/DITOLAK.
  const [stdbStage, setStdbStage] = useState<string>(target.kind === "stdb" ? (target.item?.stage ?? "TERBIT") : "TERBIT");
  const isTerbit = stdbStage === "TERBIT";
  const needsStageNote = stdbStage === "REVISI" || stdbStage === "DITOLAK";
  const isEdit = Boolean(target.item);

  // Fungsi biasa (bukan komponen) — komponen yang dibuat saat render melanggar rules-of-hooks/react-compiler.
  const fieldError = (k: string) => (errors[k]?.length ? <p className="text-xs text-destructive">{errors[k][0]}</p> : null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});
    const form = new FormData(e.currentTarget);
    let result: { success: boolean; error?: unknown };

    if (target.kind === "document") {
      const data = {
        type: docType,
        number: str(form, "number"),
        holderName: str(form, "holderName"),
        statedArea: str(form, "statedArea"),
        issuedYear: str(form, "issuedYear"),
        custodyNote: str(form, "custodyNote"),
        notes: str(form, "notes"),
      };
      result = target.item
        ? await updateLandParcelDocument({ id: target.item.id, ...data })
        : await createLandParcelDocument({ landParcelId, ...data });
    } else if (target.kind === "stdb") {
      // Nomor & tanggal/tahun terbit hanya dikirim saat TERBIT — field-nya
      // memang disembunyikan, dan nilai sisa dari tahap sebelumnya tidak boleh
      // ikut terkirim lalu ditolak Zod (#306).
      const data = {
        stage: stdbStage,
        number: isTerbit ? str(form, "number") : "",
        holderName: str(form, "holderName"),
        statedArea: str(form, "statedArea"),
        issuedYear: isTerbit ? str(form, "issuedYear") : "",
        issuedAt: isTerbit ? str(form, "issuedAt") : "",
        preparedAt: str(form, "preparedAt"),
        submittedAt: str(form, "submittedAt"),
        submittedTo: str(form, "submittedTo"),
        stageNote: str(form, "stageNote"),
        notes: str(form, "notes"),
      };
      result = target.item ? await updateLandStdb({ id: target.item.id, ...data }) : await createLandStdb({ landParcelId, ...data });
    } else if (target.kind === "externalId") {
      const data = { source: str(form, "source"), code: str(form, "code"), mappedAt: str(form, "mappedAt"), notes: str(form, "notes") };
      result = target.item
        ? await updateLandParcelExternalId({ id: target.item.id, ...data })
        : await createLandParcelExternalId({ landParcelId, ...data });
    } else {
      const data = { programType: "DEMPLOT_PBU", status, startDate: str(form, "startDate"), endDate: str(form, "endDate"), notes: str(form, "notes") };
      result = target.item ? await updateLandParcelProgram({ id: target.item.id, ...data }) : await createLandParcelProgram({ landParcelId, ...data });
    }

    setIsLoading(false);
    if (!result.success) {
      if (typeof result.error === "string") toast.error(result.error);
      else setErrors((result.error as Record<string, string[]>) ?? {});
      return;
    }
    toast.success(`${TITLES[target.kind]} berhasil ${isEdit ? "diubah" : "ditambahkan"}`);
    onClose();
    router.refresh();
  }

  const doc = target.kind === "document" ? target.item : null;
  const stdb = target.kind === "stdb" ? target.item : null;
  const ext = target.kind === "externalId" ? target.item : null;
  const prog = target.kind === "program" ? target.item : null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Ubah" : "Tambah"} {TITLES[target.kind]}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          {target.kind === "document" && (
            <>
              <div className="space-y-2">
                <Label>Jenis Surat *</Label>
                <Select value={docType} onValueChange={(v) => setDocType(v ?? "")}>
                  <SelectTrigger className="w-full h-9"><SelectValue placeholder="Pilih jenis surat" /></SelectTrigger>
                  <SelectContent>
                    {LAND_DOCUMENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{LAND_DOCUMENT_TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldError("type")}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="number">Nomor Surat</Label>
                  <Input id="number" name="number" defaultValue={doc?.number ?? ""} />
                  {fieldError("number")}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="issuedYear">Tahun Terbit</Label>
                  <Input id="issuedYear" name="issuedYear" type="number" min={1900} max={2100} defaultValue={doc?.issuedYear ?? ""} />
                  {fieldError("issuedYear")}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="holderName">Nama Tertera di Surat</Label>
                  <Input id="holderName" name="holderName" defaultValue={doc?.holderName ?? ""} />
                  {fieldError("holderName")}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="statedArea">Luas Tertera (Ha)</Label>
                  <Input id="statedArea" name="statedArea" type="number" step="0.0001" min={0} defaultValue={doc?.statedArea ?? ""} />
                  {fieldError("statedArea")}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="custodyNote">Catatan Penguasaan</Label>
                <Input id="custodyNote" name="custodyNote" placeholder="mis. surat di bank, lahan sudah dijual" defaultValue={doc?.custodyNote ?? ""} />
                {fieldError("custodyNote")}
              </div>
            </>
          )}

          {target.kind === "stdb" && (
            <>
              <div className="space-y-2">
                <Label>Tahap *</Label>
                <Select value={stdbStage} onValueChange={(v) => setStdbStage(v ?? "TERBIT")}>
                  <SelectTrigger className="w-full h-9"><SelectValue placeholder="Pilih tahap" /></SelectTrigger>
                  <SelectContent>
                    {LAND_STDB_STAGES.map((s) => (
                      <SelectItem key={s} value={s}>{LAND_STDB_STAGE_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldError("stage")}
                {/* Aturan ini WAJIB terbaca di UI: tanpa kalimat ini Revisi dan
                    Ditolak akan dipakai bergantian dan funnel jadi tak terbaca (#306). */}
                <p className="text-xs text-muted-foreground">
                  <strong>Revisi</strong> = berkas dikembalikan untuk diperbaiki, prosesnya masih berjalan.{" "}
                  <strong>Ditolak</strong> = proses berhenti; mengajukan lagi berarti membuat berkas baru.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="number">Nomor STDB {isTerbit && "*"}</Label>
                <Input
                  id="number"
                  name="number"
                  defaultValue={stdb?.number ?? ""}
                  placeholder={isTerbit ? "mis. 1637/53/1401/6/2025" : "Belum ada — nomor terbit di tahap terakhir"}
                  disabled={!isTerbit}
                />
                {fieldError("number")}
                {!isEdit && isTerbit && (
                  <p className="text-xs text-muted-foreground">
                    Bila nomor ini sudah terdaftar untuk petani yang sama, lahan ini ditautkan ke STDB tersebut (satu STDB dapat menutup beberapa lahan).
                  </p>
                )}
                {!isTerbit && (
                  <p className="text-xs text-muted-foreground">
                    Satu petani hanya boleh punya satu berkas yang sedang berjalan. Lahan lain yang ikut diajukan ditautkan ke berkas yang sama.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="holderName">Nama Pemegang</Label>
                  <Input id="holderName" name="holderName" defaultValue={stdb?.holderName ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="statedArea">Luas Tertera (Ha)</Label>
                  <Input id="statedArea" name="statedArea" type="number" step="0.0001" min={0} defaultValue={stdb?.statedArea ?? ""} />
                  {fieldError("statedArea")}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="preparedAt">Tanggal Persiapan</Label>
                  <Input id="preparedAt" name="preparedAt" type="date" defaultValue={toDateInput(stdb?.preparedAt)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="submittedAt">Tanggal Pengajuan</Label>
                  <Input id="submittedAt" name="submittedAt" type="date" defaultValue={toDateInput(stdb?.submittedAt)} />
                </div>
              </div>

              {isTerbit && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="issuedAt">Tanggal Terbit</Label>
                    <Input id="issuedAt" name="issuedAt" type="date" defaultValue={toDateInput(stdb?.issuedAt)} />
                    {fieldError("issuedAt")}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="issuedYear">Tahun Terbit</Label>
                    <Input id="issuedYear" name="issuedYear" type="number" min={1900} max={2100} defaultValue={stdb?.issuedYear ?? ""} />
                    {fieldError("issuedYear")}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="submittedTo">Dinas Penerima</Label>
                <Input id="submittedTo" name="submittedTo" defaultValue={stdb?.submittedTo ?? ""} placeholder="mis. Dinas Perkebunan Kab. Kampar" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stageNote">
                  Catatan Tahap {needsStageNote && "*"}
                </Label>
                <Input
                  id="stageNote"
                  name="stageNote"
                  defaultValue={stdb?.stageNote ?? ""}
                  placeholder={needsStageNote ? "Alasan revisi/penolakan" : "Keterangan tahap (opsional)"}
                />
                {fieldError("stageNote")}
              </div>
            </>
          )}

          {target.kind === "externalId" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="source">Pemeta *</Label>
                  <Input id="source" name="source" list="parcel-mapper-options" defaultValue={ext?.source ?? DEFAULT_PARCEL_MAPPER} />
                  <datalist id="parcel-mapper-options">
                    {PARCEL_MAPPERS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </datalist>
                  {fieldError("source")}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Kode *</Label>
                  <Input id="code" name="code" defaultValue={ext?.code ?? ""} />
                  {fieldError("code")}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mappedAt">Tanggal Pemetaan</Label>
                <Input id="mappedAt" name="mappedAt" type="date" defaultValue={toDateInput(ext?.mappedAt)} />
                {fieldError("mappedAt")}
              </div>
            </>
          )}

          {target.kind === "program" && (
            <>
              <div className="space-y-2">
                <Label>Jenis Program</Label>
                <Input value="Demplot PBU (Productive Business Unit)" disabled />
              </div>
              <div className="space-y-2">
                <Label>Status *</Label>
                <Select value={status} onValueChange={(v) => setStatus(v ?? "ACTIVE")}>
                  <SelectTrigger className="w-full h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldError("status")}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Tanggal Mulai</Label>
                  <Input id="startDate" name="startDate" type="date" defaultValue={toDateInput(prog?.startDate)} />
                  {fieldError("startDate")}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">Tanggal Selesai</Label>
                  <Input id="endDate" name="endDate" type="date" defaultValue={toDateInput(prog?.endDate)} />
                  {fieldError("endDate")}
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Catatan</Label>
            <Textarea id="notes" name="notes" rows={2} defaultValue={target.item?.notes ?? ""} />
            {fieldError("notes")}
          </div>

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
