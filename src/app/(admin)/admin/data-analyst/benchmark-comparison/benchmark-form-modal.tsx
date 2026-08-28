"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { upsertReferenceBenchmark } from "@/server/actions/benchmark-comparison";
import { BENCHMARK_METRICS } from "@/lib/benchmark-comparison";
import type { ReferenceBenchmarkInput } from "@/validations/reference-benchmark.schema";
import type { BenchmarkComparisonRow, BenchmarkMetricKey } from "@/types/benchmark-comparison";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  row: BenchmarkComparisonRow | null;
  /** Dipanggil setelah simpan sukses dengan input tervalidasi (update optimistis di parent). */
  onSaved?: (input: ReferenceBenchmarkInput) => void;
}

function initialValues(row: BenchmarkComparisonRow | null): Record<BenchmarkMetricKey, string> {
  const values = {} as Record<BenchmarkMetricKey, string>;
  for (const m of BENCHMARK_METRICS) {
    const v = row?.reference?.[m.key];
    values[m.key] = v == null ? "" : String(v);
  }
  return values;
}

function parseValue(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number(trimmed.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function BenchmarkFormModal({ open, onClose, row, onSaved }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [values, setValues] = useState<Record<BenchmarkMetricKey, string>>(() => initialValues(row));
  const [notes, setNotes] = useState(row?.notes ?? "");
  const router = useRouter();

  // Reset isi form tiap ganti lembaga / buka ulang dialog.
  const rowId = row?.farmerGroupId ?? null;
  useEffect(() => {
    if (open) {
      setValues(initialValues(row));
      setNotes(row?.notes ?? "");
      setErrors({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, rowId]);

  if (!row) return null;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!row) return;
    setIsLoading(true);
    setErrors({});

    const data = {
      farmerGroupId: row.farmerGroupId,
      farmerCount: parseValue(values.farmerCount),
      parcelCount: parseValue(values.parcelCount),
      areaHa: parseValue(values.areaHa),
      trainingP1: parseValue(values.trainingP1),
      trainingP2Mk: parseValue(values.trainingP2Mk),
      trainingP2K3: parseValue(values.trainingP2K3),
      trainingP34: parseValue(values.trainingP34),
      productionFarmerCount: parseValue(values.productionFarmerCount),
      notes: notes.trim() || null,
    };

    const result = await upsertReferenceBenchmark(data);
    setIsLoading(false);

    if (result.success) {
      toast.success("Angka acuan disimpan");
      onSaved?.(data);
      onClose();
      router.refresh();
    } else if (typeof result.error === "string") {
      toast.error(result.error);
    } else {
      setErrors(result.error ?? {});
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      {/* `sm:max-w-*` berprefiks — tanpa prefiks akan menimpa penjaga
          `max-w-[calc(100%-2rem)]` milik DialogContent via tailwind-merge (#292). */}
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Angka Acuan — {row.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Isi angka acuan manual (GDrive / MD 1st SOW). Kosongkan bila belum ada acuan untuk
            metrik tersebut. Angka MIS di bawah tiap kolom adalah nilai live saat ini.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {BENCHMARK_METRICS.map((metric) => {
              const mis = row.mis[metric.key];
              const parsed = parseValue(values[metric.key]);
              const delta = parsed === null ? null : Math.round((parsed - mis) * 100) / 100;
              return (
                <div key={metric.key} className="space-y-1">
                  <Label htmlFor={metric.key}>{metric.label}</Label>
                  <Input
                    id={metric.key}
                    type="number"
                    min={0}
                    step={metric.decimal ? "0.01" : "1"}
                    value={values[metric.key]}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, [metric.key]: e.target.value }))
                    }
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground tabular-nums">
                    MIS: {mis.toLocaleString("id-ID", { maximumFractionDigits: 2 })}
                    {delta !== null && delta !== 0 && (
                      <span
                        className={
                          delta > 0
                            ? " text-amber-700 dark:text-amber-400 font-medium"
                            : " text-sky-700 dark:text-sky-400 font-medium"
                        }
                      >
                        {" "}
                        · Δ {delta > 0 ? "+" : ""}
                        {delta.toLocaleString("id-ID", { maximumFractionDigits: 2 })}
                      </span>
                    )}
                    {delta === 0 && (
                      <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                        {" "}
                        · cocok
                      </span>
                    )}
                  </p>
                  {errors[metric.key] && (
                    <p className="text-xs text-destructive">{errors[metric.key][0]}</p>
                  )}
                </div>
              );
            })}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Catatan</Label>
            <Textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Mis. 56 petani belum ada data produksi"
              disabled={isLoading}
            />
            {errors.notes && <p className="text-xs text-destructive">{errors.notes[0]}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Batal
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
