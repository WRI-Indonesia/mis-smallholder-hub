"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { upsertReferenceBenchmark } from "@/server/actions/benchmark-comparison";
import { BENCHMARK_METRICS } from "@/lib/benchmark-comparison";
import type { BenchmarkComparisonRow } from "@/types/benchmark-comparison";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  row: BenchmarkComparisonRow | null;
}

export function BenchmarkFormModal({ open, onClose, row }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const router = useRouter();

  if (!row) return null;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!row) return;
    setIsLoading(true);
    setErrors({});

    const form = new FormData(e.currentTarget);
    const numberOrNull = (name: string) => {
      const raw = (form.get(name) as string | null)?.trim();
      return raw ? Number(raw.replace(",", ".")) : null;
    };

    const data = {
      farmerGroupId: row.farmerGroupId,
      farmerCount: numberOrNull("farmerCount"),
      parcelCount: numberOrNull("parcelCount"),
      areaHa: numberOrNull("areaHa"),
      trainingP1: numberOrNull("trainingP1"),
      trainingP2Mk: numberOrNull("trainingP2Mk"),
      trainingP2K3: numberOrNull("trainingP2K3"),
      trainingP34: numberOrNull("trainingP34"),
      productionFarmerCount: numberOrNull("productionFarmerCount"),
      notes: ((form.get("notes") as string) || "").trim() || null,
    };

    const result = await upsertReferenceBenchmark(data);
    setIsLoading(false);

    if (result.success) {
      toast.success("Angka acuan disimpan");
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Angka Acuan — {row.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Isi angka acuan manual (GDrive / MD 1st SOW). Kosongkan bila belum ada acuan untuk
            metrik tersebut.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {BENCHMARK_METRICS.map((metric) => (
              <div key={metric.key} className="space-y-1.5">
                <Label htmlFor={metric.key}>{metric.label}</Label>
                <Input
                  id={metric.key}
                  name={metric.key}
                  type="number"
                  min={0}
                  step={metric.decimal ? "0.01" : "1"}
                  defaultValue={row.reference?.[metric.key] ?? ""}
                  disabled={isLoading}
                />
                {errors[metric.key] && (
                  <p className="text-xs text-destructive">{errors[metric.key][0]}</p>
                )}
              </div>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Catatan</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={row.notes ?? ""}
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
