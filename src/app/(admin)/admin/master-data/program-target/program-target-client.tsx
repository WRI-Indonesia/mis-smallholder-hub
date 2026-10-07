"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatNumber } from "@/lib/format";
import {
  PROGRAM_TARGET_INDICATORS,
  PROGRAM_TARGET_LABELS,
  PROGRAM_TARGET_TOTAL_LABEL,
  PROGRAM_TARGET_YEAR_MAX,
  PROGRAM_TARGET_YEAR_MIN,
  buildProgramTargetGrid,
  type ProgramTargetIndicatorCode,
} from "@/lib/program-target";
import { saveProgramTargets, type ProgramTargetView } from "@/server/actions/program-target";
import type { ProgramTargetCellInput } from "@/validations/program-target.schema";

type Draft = Record<string, string>; // kunci "indikator|BASELINE" / "indikator|tahun" → isian teks
const baseKey = (ind: ProgramTargetIndicatorCode) => `${ind}|BASELINE`;
const yearKey = (ind: ProgramTargetIndicatorCode, y: number) => `${ind}|${y}`;
const toNumber = (s: string | undefined): number | null => {
  const t = (s ?? "").replace(/\./g, "").trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isInteger(n) && n >= 0 ? n : NaN;
};

/**
 * Grid isian Target Program (#403): baris = indikator kontrak, kolom = Start of the Program
 * (kumulatif s.d. tahun baseline) + tahun target; Total & baris "Total farmers trained"
 * dihitung. Seluruh grid disimpan sekali; sel dikosongkan = target dihapus (soft delete).
 */
export function ProgramTargetClient({ view, canEdit }: { view: ProgramTargetView; canEdit: boolean }) {
  const router = useRouter();
  const initial = useMemo(() => buildProgramTargetGrid(view.records), [view.records]);
  const thisYear = new Date().getFullYear();
  const [baselineYear, setBaselineYear] = useState<number>(initial.baselineYear ?? thisYear - 1);
  const [years, setYears] = useState<number[]>(initial.years.length ? initial.years : [thisYear, thisYear + 1, thisYear + 2]);
  const [draft, setDraft] = useState<Draft>(() => {
    const d: Draft = {};
    for (const ind of PROGRAM_TARGET_INDICATORS) {
      if (initial.baseline[ind] != null) d[baseKey(ind)] = String(initial.baseline[ind]);
      for (const [y, v] of Object.entries(initial.annual[ind] ?? {})) d[yearKey(ind, Number(y))] = String(v);
    }
    return d;
  });
  const [saving, setSaving] = useState(false);

  const num = (k: string) => {
    const n = toNumber(draft[k]);
    return n == null || Number.isNaN(n) ? 0 : n;
  };
  const invalid = Object.values(draft).some((v) => Number.isNaN(toNumber(v)));
  const rowTotal = (ind: ProgramTargetIndicatorCode) => num(baseKey(ind)) + years.reduce((s, y) => s + num(yearKey(ind, y)), 0);
  const yearTotal = (y: number) => PROGRAM_TARGET_INDICATORS.reduce((s, ind) => s + num(yearKey(ind, y)), 0);

  const addYear = () => setYears((ys) => [...ys, (ys.length ? Math.max(...ys) : thisYear - 1) + 1].filter((y) => y <= PROGRAM_TARGET_YEAR_MAX));
  const removeYear = (y: number) => {
    setYears((ys) => ys.filter((x) => x !== y));
    setDraft((d) => {
      const n = { ...d };
      for (const ind of PROGRAM_TARGET_INDICATORS) delete n[yearKey(ind, y)];
      return n;
    });
  };

  const save = async () => {
    const cells: ProgramTargetCellInput[] = [];
    for (const ind of PROGRAM_TARGET_INDICATORS) {
      cells.push({ indicator: ind, periodType: "BASELINE", year: baselineYear, value: toNumber(draft[baseKey(ind)]) });
      for (const y of years) cells.push({ indicator: ind, periodType: "ANNUAL", year: y, value: toNumber(draft[yearKey(ind, y)]) });
      // Tahun yang dihapus dari grid → kosongkan target lamanya.
      for (const y of initial.years) {
        if (!years.includes(y) && initial.annual[ind]?.[y] != null) cells.push({ indicator: ind, periodType: "ANNUAL", year: y, value: null });
      }
    }
    setSaving(true);
    try {
      const res = await saveProgramTargets(cells);
      if (!res.success) {
        toast.error(typeof res.error === "string" ? res.error : "Gagal menyimpan target");
        return;
      }
      toast.success(`Target disimpan (${formatNumber(res.data?.saved ?? 0)} sel terisi)`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  // Fungsi biasa, BUKAN komponen: komponen yang dibuat saat render me-remount input tiap ketikan (fokus hilang).
  const numberCell = (k: string) =>
    canEdit ? (
      <Input
        inputMode="numeric"
        value={draft[k] ?? ""}
        onChange={(e) => setDraft((d) => ({ ...d, [k]: e.target.value }))}
        className={`h-9 w-28 text-right tabular-nums ${Number.isNaN(toNumber(draft[k])) ? "border-destructive" : ""}`}
        placeholder="—"
        aria-label={k}
      />
    ) : (
      <span className="tabular-nums">{draft[k] ? formatNumber(Number(draft[k])) : "—"}</span>
    );

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="py-2 pr-4 text-left">Indikator</th>
                <th className="px-2 py-2 text-right">
                  <div>Start of the Program</div>
                  <div className="mt-1 flex items-center justify-end gap-1 font-normal normal-case tracking-normal">
                    s.d.
                    {canEdit ? (
                      <Input
                        type="number"
                        min={PROGRAM_TARGET_YEAR_MIN}
                        max={PROGRAM_TARGET_YEAR_MAX}
                        value={baselineYear}
                        onChange={(e) => setBaselineYear(Number(e.target.value))}
                        className="h-7 w-20 text-right"
                        aria-label="Tahun Start of the Program"
                      />
                    ) : (
                      baselineYear
                    )}
                  </div>
                </th>
                {years.map((y) => (
                  <th key={y} className="px-2 py-2 text-right">
                    <span className="inline-flex items-center gap-1">
                      {y}
                      {canEdit && (
                        <button type="button" onClick={() => removeYear(y)} title={`Hapus kolom ${y}`} className="rounded p-0.5 hover:bg-muted">
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </span>
                  </th>
                ))}
                <th className="px-2 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {PROGRAM_TARGET_INDICATORS.map((ind) => (
                <tr key={ind} className="border-b border-border/40">
                  <td className="max-w-[22rem] py-2 pr-4 font-medium">{PROGRAM_TARGET_LABELS[ind]}</td>
                  <td className="px-2 py-2 text-right">
                    {numberCell(baseKey(ind))}
                  </td>
                  {years.map((y) => (
                    <td key={y} className="px-2 py-2 text-right">
                      {numberCell(yearKey(ind, y))}
                    </td>
                  ))}
                  <td className="px-2 py-2 text-right font-semibold tabular-nums">{formatNumber(rowTotal(ind))}</td>
                </tr>
              ))}
              <tr className="bg-muted/40 font-semibold">
                <td className="py-2 pr-4 italic">{PROGRAM_TARGET_TOTAL_LABEL}</td>
                <td className="px-2 py-2" />
                {years.map((y) => (
                  <td key={y} className="px-2 py-2 text-right tabular-nums">
                    {formatNumber(yearTotal(y))}
                  </td>
                ))}
                <td className="px-2 py-2" />
              </tr>
            </tbody>
          </table>
        </div>

        {canEdit && (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={addYear}>
              <Plus className="h-4 w-4" />
              Tambah tahun
            </Button>
            <Button size="sm" className="ml-auto gap-2" onClick={save} disabled={saving || invalid}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Simpan target
            </Button>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Start of the Program = jumlah penerima manfaat s.d. akhir tahun yang dipilih; kolom tahun = target penerima manfaat
          baru pada tahun itu. Total dan baris {PROGRAM_TARGET_TOTAL_LABEL} dihitung otomatis. Kosongkan sel untuk menghapus
          targetnya.
          {view.lastModified &&
            ` Terakhir diubah ${new Date(view.lastModified.at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}${view.lastModified.by ? ` oleh ${view.lastModified.by}` : ""}.`}
        </p>
      </CardContent>
    </Card>
  );
}
