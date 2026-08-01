"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  createProductionRecord,
  updateProductionRecord,
  deleteProductionRecord,
  getParcelPeriodRecords,
} from "@/server/actions/production";
import { toast } from "sonner";
import { Loader2, Lock } from "lucide-react";

const formatNumber = (n: number) => new Intl.NumberFormat("id-ID").format(n);

const MAX_HARVESTS = 4;

interface SlotState {
  recordId: string | null;
  kg: string; // input mentah; "" = slot kosong
  date: string; // YYYY-MM-DD; "" = belum dipilih
}

const EMPTY_SLOTS: SlotState[] = Array.from({ length: MAX_HARVESTS }, () => ({
  recordId: null,
  kg: "",
  date: "",
}));

// Tanggal lokal → YYYY-MM-DD untuk input type="date" (tanpa geser timezone).
function toDateInputValue(d: Date): string {
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

interface Props {
  open: boolean;
  onClose: () => void;
  parcelDbId: string;
  farmerId: string;
  /** Periode YYYY-MM yang sedang diedit. */
  period: string;
  /** Judul modal, mis. "Produksi Feb 2026". */
  title: string;
}

/**
 * Modal input/edit produksi satu bulan untuk satu lahan: 4 slot panen (kg +
 * tanggal) yang terbuka berurutan, total dihitung otomatis. Mutasi memakai
 * action menu Data Produksi (permission menu tsb yang berlaku).
 */
export function ParcelProductionMonthModal({
  open,
  onClose,
  parcelDbId,
  farmerId,
  period,
  title,
}: Props) {
  const [slots, setSlots] = useState<SlotState[]>(EMPTY_SLOTS);
  const [original, setOriginal] = useState<SlotState[]>(EMPTY_SLOTS);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  const [yearStr, monthStr] = period.split("-");
  const lastDay = new Date(Number(yearStr), Number(monthStr), 0).getDate();
  const minDate = `${period}-01`;
  const maxDate = `${period}-${String(lastDay).padStart(2, "0")}`;

  async function loadSlots() {
    const records = await getParcelPeriodRecords(parcelDbId, period);
    return EMPTY_SLOTS.map((s, i) => {
      const rec = records.find((r) => r.harvestNumber === i + 1);
      return rec
        ? { recordId: rec.id, kg: String(rec.yieldKg), date: toDateInputValue(rec.harvestDate) }
        : s;
    });
  }

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setIsLoading(true);
    setSlots(EMPTY_SLOTS);
    getParcelPeriodRecords(parcelDbId, period)
      .then((records) => {
        if (cancelled) return;
        const next = EMPTY_SLOTS.map((s, i) => {
          const rec = records.find((r) => r.harvestNumber === i + 1);
          return rec
            ? { recordId: rec.id, kg: String(rec.yieldKg), date: toDateInputValue(rec.harvestDate) }
            : s;
        });
        setSlots(next);
        setOriginal(next);
      })
      .catch(() => {
        if (!cancelled) toast.error("Gagal memuat data produksi periode ini");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, parcelDbId, period]);

  const parsedKg = slots.map((s) => {
    const v = parseFloat(s.kg);
    return Number.isFinite(v) && v > 0 ? v : 0;
  });
  const total = parsedKg.reduce((sum, v) => sum + v, 0);

  // Slot terbuka berurutan: slot ke-i aktif bila slot sebelumnya terisi.
  const slotEnabled = slots.map(
    (s, i) => i === 0 || s.recordId != null || slots[i - 1].kg.trim() !== "",
  );

  const setSlot = (i: number, patch: Partial<SlotState>) =>
    setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  async function onSave() {
    if (isSaving) return;

    // Validasi klien: kg terisi wajib punya tanggal dalam bulan ini.
    for (let i = 0; i < MAX_HARVESTS; i++) {
      const filled = slots[i].kg.trim() !== "";
      if (filled && parsedKg[i] <= 0) {
        toast.error(`Panen ${i + 1}: hasil panen harus lebih besar dari 0`);
        return;
      }
      if (filled && !slots[i].date) {
        toast.error(`Panen ${i + 1}: tanggal panen wajib dipilih`);
        return;
      }
      if (filled && (slots[i].date < minDate || slots[i].date > maxDate)) {
        toast.error(`Panen ${i + 1}: tanggal harus dalam periode ${title.replace("Produksi ", "")}`);
        return;
      }
    }

    const toDelete = slots.filter((s) => s.recordId && s.kg.trim() === "");
    if (
      toDelete.length > 0 &&
      !confirm(
        `${toDelete.length} slot panen dikosongkan — record panen tsb akan dinonaktifkan. Lanjutkan?`,
      )
    ) {
      return;
    }

    setIsSaving(true);
    let changed = 0;
    let failed = false;
    try {
      for (let i = 0; i < MAX_HARVESTS; i++) {
        const s = slots[i];
        const o = original[i];
        const filled = s.kg.trim() !== "";
        const harvestDate = s.date ? new Date(`${s.date}T00:00:00`) : null;

        if (s.recordId && !filled) {
          const res = await deleteProductionRecord(s.recordId);
          if (!res.success) {
            toast.error(typeof res.error === "string" ? res.error : `Panen ${i + 1} gagal dihapus`);
            failed = true;
            break;
          }
          changed++;
        } else if (s.recordId && filled && (s.kg !== o.kg || s.date !== o.date)) {
          const res = await updateProductionRecord(s.recordId, {
            yieldKg: parsedKg[i],
            harvestDate: harvestDate!,
          });
          if (!res.success) {
            toast.error(
              typeof res.error === "string"
                ? res.error
                : `Panen ${i + 1} gagal disimpan — periksa isian`,
            );
            failed = true;
            break;
          }
          changed++;
        } else if (!s.recordId && filled) {
          const res = await createProductionRecord({
            farmerId,
            parcelId: parcelDbId,
            period,
            harvestDate: harvestDate!,
            harvestNumber: i + 1,
            yieldKg: parsedKg[i],
            notes: null,
          });
          if (!res.success) {
            toast.error(
              typeof res.error === "string"
                ? res.error
                : `Panen ${i + 1} gagal disimpan — periksa isian`,
            );
            failed = true;
            break;
          }
          changed++;
        }
      }

      // Slot yang terlanjur tersimpan sebelum kegagalan tetap harus tercermin —
      // tanpa reload, state modal basi dan klik Simpan ulang mencoba create
      // ulang slot yang sudah tersimpan (error duplikat yang membingungkan).
      if (changed > 0) router.refresh();

      if (failed) {
        if (changed > 0) {
          try {
            const next = await loadSlots();
            // Nilai isian slot yang gagal dipertahankan agar bisa dikoreksi;
            // hanya recordId/original yang disegarkan dari server.
            setOriginal(next);
            setSlots((prev) =>
              prev.map((s, i) =>
                next[i].recordId != null && s.kg.trim() !== ""
                  ? { ...s, recordId: next[i].recordId }
                  : next[i].recordId == null
                    ? s
                    : next[i],
              ),
            );
          } catch {
            // Gagal reload — biarkan state apa adanya; refresh() di atas sudah
            // menyegarkan tabel di belakang modal.
          }
        }
        return;
      }

      if (changed > 0) toast.success("Data produksi berhasil disimpan");
      onClose();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isSaving && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {slots.map((s, i) => (
              <div key={i} className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor={`kg-${i}`} className="text-xs">
                    Panen {i + 1} (kg)
                  </Label>
                  <Input
                    id={`kg-${i}`}
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="—"
                    value={s.kg}
                    disabled={!slotEnabled[i] || isSaving}
                    onChange={(e) => setSlot(i, { kg: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`date-${i}`} className="text-xs">
                    Tanggal
                  </Label>
                  <Input
                    id={`date-${i}`}
                    type="date"
                    min={minDate}
                    max={maxDate}
                    value={s.date}
                    disabled={!slotEnabled[i] || isSaving}
                    onChange={(e) => setSlot(i, { date: e.target.value })}
                  />
                </div>
              </div>
            ))}

            <p className="flex items-center gap-2 text-sm font-semibold pt-1">
              <Lock className="h-4 w-4 text-muted-foreground" />
              Total: {formatNumber(Math.round(total * 10) / 10)} kg (otomatis)
            </p>
            <p className="text-xs text-muted-foreground">
              Slot panen terbuka berurutan dari yang pertama; total dihitung otomatis (maks.{" "}
              {MAX_HARVESTS} panen per bulan). Mengosongkan slot yang sudah terisi akan
              menonaktifkan record panen tsb.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose} disabled={isSaving}>
                Batal
              </Button>
              <Button onClick={onSave} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
