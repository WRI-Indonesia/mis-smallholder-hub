"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { id as localeId } from "date-fns/locale";
import { toast } from "sonner";
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createBmpAssessment,
  getFarmerParcelOptions,
  getFarmersForBmpSelect,
  updateBmpAssessment,
  type BmpAssessmentListItem,
} from "@/server/actions/bmp-assessment";
import { BMP_SCORE_MAX, BMP_SCORE_MIN, bmpAssessmentCategory, formatUtcDate, fromUtcDay, parseScore, toUtcDay } from "@/lib/bmp-assessment";
import { BmpCategoryBadge } from "@/components/shared/bmp-category-badge";

interface FarmerGroupOption {
  id: string;
  name: string;
}

interface FarmerOption {
  id: string;
  name: string;
  farmerId: string;
}

/** Petani terkunci — dipakai dari tab Monev BMP di Detail Petani. */
interface FixedFarmer extends FarmerOption {
  farmerGroupId: string;
  farmerGroupName: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** Baris yang diedit; null = tambah. */
  assessment: BmpAssessmentListItem | null;
  farmerGroups: FarmerGroupOption[];
  fixedFarmer?: FixedFarmer;
}

const NO_PARCEL = "_none";


export function BmpAssessmentFormModal({ open, onClose, assessment, farmerGroups, fixedFarmer }: Props) {
  const router = useRouter();
  const isEdit = !!assessment;
  const lockFarmer = isEdit || !!fixedFarmer;

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [farmerGroupId, setFarmerGroupId] = useState(assessment?.farmerGroupId ?? fixedFarmer?.farmerGroupId ?? "");
  const [farmerId, setFarmerId] = useState(assessment?.farmerId ?? fixedFarmer?.id ?? "");
  const [farmers, setFarmers] = useState<FarmerOption[]>(fixedFarmer ? [fixedFarmer] : []);
  const [parcels, setParcels] = useState<{ parcelUid: string; parcelId: string; blok: string | null }[]>([]);
  const [parcelUid, setParcelUid] = useState(assessment?.parcelUid ?? NO_PARCEL);
  const [surveyYear, setSurveyYear] = useState(String(assessment?.surveyYear ?? new Date().getFullYear()));
  const [surveyDate, setSurveyDate] = useState<Date | null>(assessment?.surveyDate ? new Date(assessment.surveyDate) : null);
  const [scoreText, setScoreText] = useState(assessment ? String(assessment.score) : "");
  const [groupOpen, setGroupOpen] = useState(false);
  const [farmerOpen, setFarmerOpen] = useState(false);

  // Daftar petani mengikuti Lembaga terpilih (mode tambah tanpa petani terkunci).
  useEffect(() => {
    if (!open || lockFarmer || !farmerGroupId) return;
    let cancelled = false;
    getFarmersForBmpSelect(farmerGroupId)
      .then((list) => {
        if (!cancelled) setFarmers(list);
      })
      .catch((err: unknown) => toast.error(err instanceof Error ? err.message : "Gagal memuat daftar petani"));
    return () => {
      cancelled = true;
    };
  }, [open, lockFarmer, farmerGroupId]);

  // Opsi lahan mengikuti petani terpilih; daftar lama dikosongkan lewat hasil
  // fetch (bukan setState sinkron di badan effect) — pilihan lahan sudah
  // di-reset di handler pemilihan petani.
  useEffect(() => {
    if (!open || !farmerId) return;
    let cancelled = false;
    getFarmerParcelOptions(farmerId)
      .then((list) => {
        if (!cancelled) setParcels(list);
      })
      .catch(() => {
        if (!cancelled) setParcels([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, farmerId]);

  const parsedScore = parseScore(scoreText);
  const previewCategory =
    parsedScore != null && parsedScore >= BMP_SCORE_MIN && parsedScore <= BMP_SCORE_MAX
      ? bmpAssessmentCategory(parsedScore)
      : null;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    if (!farmerId) {
      setErrors({ farmerId: ["Petani wajib dipilih"] });
      return;
    }
    if (parsedScore == null) {
      setErrors({ score: ["Skor harus berupa angka 0–3, mis. 1,83"] });
      return;
    }
    const form = new FormData(e.currentTarget);
    const payload = {
      farmerId,
      surveyYear: Number(surveyYear),
      surveyDate,
      score: parsedScore,
      parcelUid: parcelUid === NO_PARCEL ? null : parcelUid,
      assessor: (form.get("assessor") as string) || null,
      notes: (form.get("notes") as string) || null,
    };

    setIsLoading(true);
    try {
      const result = isEdit ? await updateBmpAssessment({ id: assessment.id, ...payload }) : await createBmpAssessment(payload);
      if (!result.success) {
        if (typeof result.error === "string") toast.error(result.error);
        else setErrors(result.error);
        return;
      }
      toast.success(isEdit ? "Penilaian Monev BMP diperbarui" : "Penilaian Monev BMP disimpan");
      onClose();
      router.refresh();
    } catch (err) {
      // Action melempar (sesi kedaluwarsa, jaringan) — tombol tidak boleh terkunci tanpa pesan (pola parcel-marker-section).
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan penilaian");
    } finally {
      setIsLoading(false);
    }
  }

  const selectedGroup = farmerGroups.find((g) => g.id === farmerGroupId);
  const selectedFarmer = farmers.find((f) => f.id === farmerId);
  const groupLabel = lockFarmer
    ? (assessment?.farmerGroupName ?? fixedFarmer?.farmerGroupName ?? selectedGroup?.name ?? "")
    : selectedGroup?.name;
  const farmerLabel = lockFarmer
    ? `${assessment?.farmerName ?? fixedFarmer?.name ?? ""} (${assessment?.farmerCode ?? fixedFarmer?.farmerId ?? ""})`
    : selectedFarmer
      ? `${selectedFarmer.name} (${selectedFarmer.farmerId})`
      : "";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Penilaian Monev BMP" : "Tambah Penilaian Monev BMP"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 flex flex-col">
              <Label>Lembaga Petani</Label>
              {lockFarmer ? (
                <Input value={groupLabel ?? ""} readOnly className="bg-muted/40" />
              ) : (
                <Popover open={groupOpen} onOpenChange={setGroupOpen}>
                  <PopoverTrigger
                    render={
                      <Button variant="outline" role="combobox" className="w-full justify-between h-10 font-normal text-left">
                        <span className={cn("truncate", !farmerGroupId && "text-muted-foreground")}>
                          {selectedGroup?.name ?? "Pilih Lembaga Petani"}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    }
                  />
                  <PopoverContent className="w-[300px] p-0" align="start">
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
                                setFarmerId("");
                                setParcelUid(NO_PARCEL);
                                setGroupOpen(false);
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", farmerGroupId === g.id ? "opacity-100" : "opacity-0")} />
                              {g.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
            </div>

            <div className="space-y-2 flex flex-col">
              <Label>Petani</Label>
              {lockFarmer ? (
                <Input value={farmerLabel} readOnly className="bg-muted/40" />
              ) : (
                <Popover open={farmerOpen} onOpenChange={setFarmerOpen}>
                  <PopoverTrigger
                    render={
                      <Button
                        variant="outline"
                        role="combobox"
                        disabled={!farmerGroupId}
                        className="w-full justify-between h-10 font-normal text-left"
                      >
                        <span className={cn("truncate", !farmerId && "text-muted-foreground")}>
                          {farmerLabel || (farmerGroupId ? "Pilih petani" : "Pilih Lembaga dulu")}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    }
                  />
                  <PopoverContent className="w-[320px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Cari nama / ID petani..." />
                      <CommandList className="max-h-[250px]">
                        <CommandEmpty>Petani tidak ditemukan.</CommandEmpty>
                        <CommandGroup>
                          {farmers.map((f) => (
                            <CommandItem
                              key={f.id}
                              value={`${f.name} ${f.farmerId}`}
                              onSelect={() => {
                                setFarmerId(f.id);
                                setParcelUid(NO_PARCEL);
                                setFarmerOpen(false);
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", farmerId === f.id ? "opacity-100" : "opacity-0")} />
                              <span className="flex flex-col">
                                <span>{f.name}</span>
                                <span className="font-mono text-[11px] text-muted-foreground">{f.farmerId}</span>
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
              {errors.farmerId && <p className="text-sm text-destructive">{errors.farmerId[0]}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="surveyYear">Tahun Survei</Label>
              <Input
                id="surveyYear"
                type="number"
                inputMode="numeric"
                min={2020}
                max={new Date().getFullYear() + 1}
                value={surveyYear}
                onChange={(e) => setSurveyYear(e.target.value)}
                required
              />
              {errors.surveyYear && <p className="text-sm text-destructive">{errors.surveyYear[0]}</p>}
            </div>
            <div className="space-y-2 flex flex-col">
              <Label>Tanggal Survei</Label>
              <div className="flex gap-1">
                <Popover>
                  <PopoverTrigger
                    render={
                      <Button type="button" variant="outline" className="flex-1 justify-start text-left font-normal h-10 border-input bg-transparent">
                        <span className={cn("flex-1 truncate", !surveyDate && "text-muted-foreground")}>{formatUtcDate(surveyDate, "Pilih tanggal (opsional)")}</span>
                      </Button>
                    }
                  />
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={surveyDate ? fromUtcDay(surveyDate) : undefined}
                      onSelect={(d) => d && setSurveyDate(toUtcDay(d))}
                      locale={localeId}
                      disabled={{ after: new Date() }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {surveyDate && (
                  <Button type="button" variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={() => setSurveyDate(null)} title="Kosongkan tanggal">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {errors.surveyDate && <p className="text-sm text-destructive">{errors.surveyDate[0]}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="score">Skor (0–3)</Label>
              <Input
                id="score"
                inputMode="decimal"
                placeholder="mis. 1,83"
                value={scoreText}
                onChange={(e) => setScoreText(e.target.value)}
                required
              />
              <div className="min-h-5">
                {previewCategory ? <BmpCategoryBadge category={previewCategory} /> : null}
              </div>
              {errors.score && <p className="text-sm text-destructive">{errors.score[0]}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Lahan Dikunjungi</Label>
              <Select value={parcelUid} onValueChange={(v) => setParcelUid(v ?? NO_PARCEL)} disabled={!farmerId}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(v: string) => {
                      if (!v || v === NO_PARCEL) return "— tidak dicatat —";
                      const p = parcels.find((x) => x.parcelUid === v);
                      return p ? p.parcelId : (assessment?.parcelId ?? v);
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PARCEL}>— tidak dicatat —</SelectItem>
                  {parcels.map((p) => (
                    <SelectItem key={p.parcelUid} value={p.parcelUid}>
                      <span className="font-mono text-xs">{p.parcelId}</span>
                      {p.blok ? <span className="text-muted-foreground"> · {p.blok}</span> : null}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {farmerId && parcels.length === 0 && (
                <p className="text-xs text-muted-foreground">Petani ini belum punya lahan terdaftar.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="assessor">Penilai / Fasilitator</Label>
              <Input id="assessor" name="assessor" placeholder="Nama penilai" defaultValue={assessment?.assessor ?? ""} maxLength={120} />
              {errors.assessor && <p className="text-sm text-destructive">{errors.assessor[0]}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Catatan</Label>
            <Textarea id="notes" name="notes" rows={2} placeholder="Opsional" defaultValue={assessment?.notes ?? ""} maxLength={2000} />
            {errors.notes && <p className="text-sm text-destructive">{errors.notes[0]}</p>}
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
