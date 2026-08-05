"use client";

import { useMemo, useState } from "react";
import { Grid3x3, ArrowUpDown, ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { StatTooltipContent, StatTooltipRow } from "@/components/shared/stat-tooltip";
import {
  TRAINING_PACKAGE_SHORT,
  TRAINING_PACKAGE_LABELS,
  TRAINING_COVERAGE_TARGET,
  trainingTargetGap,
  trainingTotalTargetGap,
} from "@/lib/training-dashboard-aggregation";
import { TrainingUntrainedModal, type UntrainedTarget } from "./training-untrained-modal";
import type { TrainingCoverageRow, TrainingPackageCode } from "@/types/dashboard";

const formatNumber = (n: number) => new Intl.NumberFormat("id-ID").format(n);
/**
 * Dibulatkan ke BAWAH: 999 dari 1.000 petani harus terbaca "99%", bukan "100%"
 * sementara selnya masih bisa diklik dengan keterangan "kurang 1 menuju target".
 * 100% hanya boleh muncul bila target benar-benar sudah tercapai.
 */
const formatPct = (n: number) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(Math.floor(n));

/**
 * Gradasi hijau 6 tingkat untuk sel heatmap. Nol sengaja dibedakan (merah muda)
 * — "belum tersentuh" adalah temuan, bukan sekadar nilai rendah. 100% (#194)
 * dibedakan dari 75–99% agar lembaga yang sudah complete langsung terlihat.
 */
function cellClass(pct: number, hasFarmers: boolean): string {
  if (!hasFarmers) return "bg-muted/40 text-muted-foreground";
  if (pct <= 0) return "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300";
  if (pct < 25)
    return "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300";
  if (pct < 50)
    return "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200";
  if (pct < 75)
    return "bg-emerald-300 text-emerald-950 dark:bg-emerald-800/60 dark:text-emerald-100";
  if (pct < 100) return "bg-emerald-500 text-white dark:bg-emerald-600";
  return "bg-emerald-800 text-white dark:bg-emerald-400 dark:text-emerald-950";
}

type SortKey = "name" | "totalFarmers" | "any" | TrainingPackageCode;

/**
 * Satu sel heatmap. Bisa diklik selama masih ada kekurangan menuju target —
 * membuka daftar petani yang belum dilatih. Sel yang sudah memenuhi target
 * (atau Lembaga tanpa petani aktif) tidak bisa diklik: tidak ada yang didaftar.
 *
 * Tooltip terstruktur (#213, pola #205): judul paket + Lembaga, baris chip
 * warna per status, footer total + status target. Warna chip sinkron dengan
 * segmen bar Capaian per Distrik agar kedua panel terbaca sebagai satu bahasa.
 */
function CoverageCell({
  row,
  trained,
  trainedOther = 0,
  target,
  label,
  year,
  ring,
  onOpen,
}: {
  row: TrainingCoverageRow;
  trained: number;
  /** Dilatih hanya di tahun lain (#202) — hanya terisi saat filter tahun aktif. */
  trainedOther?: number;
  target: number | null;
  label: string;
  /** Tahun terpilih pada filter — menentukan label baris tooltip (#201/#202). */
  year: number | null;
  ring?: boolean;
  onOpen: () => void;
}) {
  const hasFarmers = row.totalFarmers > 0;
  const pct = hasFarmers ? (trained / row.totalFarmers) * 100 : 0;
  const gap = trainingTargetGap(row.totalFarmers, trained, target);
  const clickable = hasFarmers && gap > 0;
  // Peserta bisa tercatat melebihi populasi baris (data historis) → jangan
  // pernah menampilkan angka negatif.
  const belum = Math.max(0, row.totalFarmers - trained - trainedOther);

  const body = (
    <>
      <div className="text-sm font-semibold leading-none">
        {hasFarmers ? `${formatPct(pct)}%` : "—"}
      </div>
      <div className="text-[10px] opacity-80 leading-none mt-0.5">{formatNumber(trained)}</div>
    </>
  );

  const cls = `w-full rounded-md px-2 py-1.5 text-center tabular-nums ${ring ? "ring-1 ring-inset ring-border/60 " : ""}${cellClass(pct, hasFarmers)}`;

  const trigger = clickable ? (
    <TooltipTrigger
      render={
        <button
          type="button"
          onClick={onOpen}
          className={`${cls} cursor-pointer transition-transform hover:scale-[1.04] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`}
        />
      }
    >
      {body}
    </TooltipTrigger>
  ) : (
    <TooltipTrigger render={<div className={cls} />}>{body}</TooltipTrigger>
  );

  if (!hasFarmers) {
    return (
      <Tooltip>
        {trigger}
        <StatTooltipContent
          title={label}
          subtitle={row.groupName}
          footer="Lembaga belum punya petani aktif"
        />
      </Tooltip>
    );
  }

  // Paket di luar program (Lainnya) tidak punya target — jangan mengklaim
  // "target tercapai" untuk sesuatu yang memang tidak ditargetkan.
  const targetLine =
    target == null
      ? "Di luar paket program — tanpa target"
      : gap > 0
        ? `Kurang ${formatNumber(gap)} menuju target ${target}% — klik sel untuk daftar petaninya`
        : `Target ${target}% tercapai`;

  return (
    <Tooltip>
      {trigger}
      <StatTooltipContent
        title={label}
        subtitle={row.groupName}
        footer={
          <>
            <span className="block">dari {formatNumber(row.totalFarmers)} petani aktif</span>
            <span className="block">{targetLine}</span>
          </>
        }
      >
        {year == null ? (
          <>
            <StatTooltipRow
              chip="bg-emerald-600 dark:bg-emerald-500"
              label="Sudah ikut"
              value={trained}
              pct={pct}
            />
            <StatTooltipRow
              chip="bg-muted border border-border"
              label="Belum"
              value={belum}
              pct={(belum / row.totalFarmers) * 100}
            />
          </>
        ) : (
          <>
            <StatTooltipRow
              chip="bg-emerald-600 dark:bg-emerald-500"
              label={`Ikut ${year}`}
              value={trained}
              pct={pct}
            />
            <StatTooltipRow
              chip="bg-emerald-300 dark:bg-emerald-800"
              label="Ikut tahun lain"
              value={trainedOther}
              pct={(trainedOther / row.totalFarmers) * 100}
            />
            <StatTooltipRow
              chip="bg-muted border border-border"
              label="Belum pernah"
              value={belum}
              pct={(belum / row.totalFarmers) * 100}
            />
          </>
        )}
      </StatTooltipContent>
    </Tooltip>
  );
}

export function TrainingCoverageMatrix({
  rows,
  packages,
  year,
}: {
  rows: TrainingCoverageRow[];
  packages: TrainingPackageCode[];
  /** Diteruskan ke modal drill-down agar daftar petani ikut irisan tahun yang tampil. */
  year: number | null;
}) {
  const [drilldown, setDrilldown] = useState<UntrainedTarget | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("any");
  const [asc, setAsc] = useState(true);
  // Terbuka secara default — ini panel inti dashboard; tabelnya panjang bila
  // Lembaga banyak, jadi bisa dilipat untuk mencapai panel di bawahnya.
  const [open, setOpen] = useState(true);

  // Cakupan dipersen terhadap seluruh petani aktif Lembaga; Lembaga tanpa petani
  // aktif tidak bisa dipersen sama sekali (dibedakan sebagai sel abu "—").
  const pctOf = (row: TrainingCoverageRow, n: number) =>
    row.totalFarmers > 0 ? (n / row.totalFarmers) * 100 : 0;

  const sorted = useMemo(() => {
    const value = (r: TrainingCoverageRow): string | number => {
      if (sortKey === "name") return r.groupName.toLowerCase();
      if (sortKey === "totalFarmers") return r.totalFarmers;
      if (sortKey === "any") return pctOf(r, r.anyPackage);
      return pctOf(r, r.byPackage[sortKey]);
    };
    return [...rows].sort((a, b) => {
      const va = value(a);
      const vb = value(b);
      const cmp =
        typeof va === "string" ? va.localeCompare(vb as string) : (va as number) - (vb as number);
      return asc ? cmp : -cmp;
    });
  }, [rows, sortKey, asc]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setAsc((v) => !v);
    else {
      setSortKey(key);
      // Nama menaik A→Z; kolom cakupan menaik agar yang paling tertinggal muncul dulu.
      setAsc(true);
    }
  };

  const headBtn = (key: SortKey, label: string, title?: string) => (
    <button
      type="button"
      onClick={() => toggleSort(key)}
      title={title}
      className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
    >
      {label}
      <ArrowUpDown className={`h-3 w-3 ${sortKey === key ? "text-primary" : "opacity-40"}`} />
    </button>
  );

  // Ringkasan yang tetap terbaca saat panel dilipat.
  const summaryFarmers = rows.reduce((s, r) => s + r.totalFarmers, 0);
  const summaryTrained = rows.reduce((s, r) => s + r.anyPackage, 0);
  const untouched = rows.filter((r) => r.anyPackage === 0).length;
  const targetGap = trainingTotalTargetGap(rows);

  return (
    <Card className="border border-border/60 shadow-sm">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger
          render={
            <button
              type="button"
              className="flex w-full items-start justify-between gap-3 px-6 py-4 text-left"
            >
              <span className="min-w-0">
                <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Grid3x3 className="h-4 w-4 text-primary" /> Capaian Paket per Lembaga
                </span>
                <span className="block text-xs text-muted-foreground mt-1">
                  {open
                    ? "% petani aktif Lembaga yang sudah mengikuti paket tersebut, dibaca terhadap target program. Klik judul kolom untuk mengurutkan; klik sel yang belum mencapai target untuk melihat daftar petaninya."
                    : `${formatNumber(rows.length)} Lembaga · ${formatPct(
                        summaryFarmers > 0 ? (summaryTrained / summaryFarmers) * 100 : 0,
                      )}% petani terlatih${untouched > 0 ? ` · ${formatNumber(untouched)} Lembaga belum tersentuh` : ""}${targetGap > 0 ? ` · kurang ${formatNumber(targetGap)} petani menuju target` : ""}`}
                </span>
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 mt-0.5 text-muted-foreground transition-transform ${
                  open ? "rotate-180" : ""
                }`}
              />
            </button>
          }
        />
        <CollapsibleContent>
          <CardContent className="border-t pt-4">
            {sorted.length === 0 ? (
              <div className="flex min-h-[200px] items-center justify-center text-sm text-muted-foreground">
                Tidak ada Lembaga Petani pada filter ini.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-separate border-spacing-y-1">
                  <thead>
                    <tr className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="text-left py-2 pr-4 font-semibold">
                        {headBtn("name", "Lembaga Petani")}
                      </th>
                      <th className="text-right py-2 px-3 font-semibold">
                        {headBtn("totalFarmers", "Petani")}
                      </th>
                      {/* Lebar seragam per kolom sel agar grid simetris (#198) —
                          tanpa ini lebar mengikuti panjang judul paket. */}
                      {packages.map((code) => (
                        <th
                          key={code}
                          style={{ width: `${62 / (packages.length + 1)}%` }}
                          className="text-center py-2 px-2 font-semibold whitespace-nowrap"
                        >
                          {headBtn(
                            code,
                            TRAINING_PACKAGE_SHORT[code],
                            TRAINING_PACKAGE_LABELS[code],
                          )}
                        </th>
                      ))}
                      <th
                        style={{ width: `${62 / (packages.length + 1)}%` }}
                        className="text-center py-2 px-2 font-semibold whitespace-nowrap"
                      >
                        {headBtn("any", "Min. 1 Paket", "Petani yang mengikuti paket apa pun")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((row) => (
                      <tr key={row.groupId} className="align-middle">
                        <td className="py-1.5 pr-4">
                          <div className="font-medium leading-tight">{row.groupName}</div>
                          <div className="text-xs text-muted-foreground">
                            {row.groupCode ? `${row.groupCode} · ` : ""}
                            {row.districtName}
                          </div>
                        </td>
                        <td className="py-1.5 px-3 text-right tabular-nums text-muted-foreground">
                          {formatNumber(row.totalFarmers)}
                        </td>
                        {packages.map((code) => (
                          <td key={code} className="py-1.5 px-1">
                            <CoverageCell
                              row={row}
                              trained={row.byPackage[code]}
                              trainedOther={row.byPackageOtherYears?.[code] ?? 0}
                              target={TRAINING_COVERAGE_TARGET[code]}
                              label={TRAINING_PACKAGE_LABELS[code]}
                              year={year}
                              onOpen={() =>
                                setDrilldown({
                                  groupId: row.groupId,
                                  groupName: row.groupName,
                                  packageCode: code,
                                  year,
                                })
                              }
                            />
                          </td>
                        ))}
                        <td className="py-1.5 px-1">
                          <CoverageCell
                            row={row}
                            trained={row.anyPackage}
                            trainedOther={row.anyPackageOtherYears ?? 0}
                            target={100}
                            label="Mengikuti paket apa pun"
                            year={year}
                            ring
                            onOpen={() =>
                              setDrilldown({
                                groupId: row.groupId,
                                groupName: row.groupName,
                                packageCode: "ANY",
                                year,
                              })
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 mt-4 text-xs text-muted-foreground">
              <span className="font-medium">Skala:</span>
              {[
                { label: "0%", cls: cellClass(0, true) },
                { label: "<25%", cls: cellClass(10, true) },
                { label: "25–49%", cls: cellClass(30, true) },
                { label: "50–74%", cls: cellClass(60, true) },
                { label: "75–99%", cls: cellClass(90, true) },
                { label: "100%", cls: cellClass(100, true) },
              ].map((s) => (
                <span key={s.label} className="inline-flex items-center gap-1.5">
                  <span className={`inline-block h-3 w-5 rounded ${s.cls}`} />
                  {s.label}
                </span>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>

      <TrainingUntrainedModal target={drilldown} onClose={() => setDrilldown(null)} />
    </Card>
  );
}
