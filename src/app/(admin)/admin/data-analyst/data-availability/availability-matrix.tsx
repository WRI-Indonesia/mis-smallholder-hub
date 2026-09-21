"use client";

import Link from "next/link";
import { Grid3x3, ArrowUpDown, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { StatTooltipContent, StatTooltipRow } from "@/components/shared/stat-tooltip";
import { HeatCell, HeatLegend } from "@/components/shared/score-visuals";
import { cn } from "@/lib/utils";
import { AVAILABILITY_DOMAIN_KEYS, AVAILABILITY_DOMAIN_LABELS, BAND_THRESHOLDS, domainScoreOf, scoreBand, shortDomainLabel } from "@/lib/data-availability-aggregation";
import { BAND_BAR, bandLabel } from "@/lib/score-band-styles";
import type { AvailabilityGroupEntry } from "@/types/dashboard";
import { formatNumber, formatPct } from "@/lib/format";
import { useMatrixRows, type MatrixSortKey } from "./matrix-rows";
import { emptyRowsMessage, MatrixLimitToggle, MatrixSearch } from "./matrix-toolbar";

/** Sel skor domain — heatmap solid (#352 putaran 4), tooltip terstruktur (#213). */
function ScoreCell({ score, label, groupName }: { score: number; label: string; groupName: string }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<HeatCell score={score} />}>{formatPct(score)}</TooltipTrigger>
      <StatTooltipContent title={label} subtitle={groupName} footer={`Band: ${bandLabel(score)}`}>
        <StatTooltipRow chip={BAND_BAR[scoreBand(score)]} label="Skor kelengkapan" value={`${formatPct(score)}%`} />
      </StatTooltipContent>
    </Tooltip>
  );
}

/**
 * Matriks Lembaga × domain sebagai heatmap padat (#352 putaran 4, pilihan
 * owner dari tiga opsi — sebelumnya pil pastel per sel yang terasa monoton):
 * baris rapat satu garis, sel solid dengan gradasi merah→kuning→hijau
 * (`heatStyle`, jangkar di ambang band) dan angka kecil di dalamnya, sehingga
 * pola kolom (mis. Produksi kosong di hampir semua Lembaga) langsung
 * tertangkap mata. Bawaannya semua baris tampil — nilai heatmap ada pada
 * gambaran utuhnya; "Ringkas" menyisakan 10 baris pertama. Skor Total tepat di
 * samping nama, urutan (kunci + arah) dikendalikan pemanggil lewat URL, dan
 * segmented control tampilan (radar | heatmap | modul) lewat `headerControl`.
 * State cari/ringkas dari `useMatrixRows` (bersama dengan grid radar).
 */
export function AvailabilityMatrix({
  rows,
  sortKey,
  sortAsc,
  onSortChange,
  headerControl,
}: {
  rows: AvailabilityGroupEntry[];
  sortKey: MatrixSortKey;
  sortAsc: boolean;
  onSortChange: (key: MatrixSortKey, asc: boolean) => void;
  headerControl?: React.ReactNode;
}) {
  const m = useMatrixRows(rows, sortKey, sortAsc);

  // Klik judul yang sama = balik arah; judul lain = kunci baru, menaik
  // (nama A→Z; kolom skor: yang paling rendah muncul dulu).
  const toggleSort = (key: MatrixSortKey) => onSortChange(key, key === sortKey ? !sortAsc : true);

  const headBtn = (key: MatrixSortKey, label: string, title?: string) => (
    <button
      type="button"
      onClick={() => toggleSort(key)}
      title={title}
      className={cn("inline-flex items-center gap-1 transition-colors hover:text-foreground", sortKey === key && "text-foreground")}
    >
      {label}
      <ArrowUpDown className={cn("h-3 w-3", sortKey === key ? "text-primary" : "opacity-40")} />
    </button>
  );

  return (
    <Card className="border border-border/60 shadow-sm">
      <div className="flex flex-col gap-3 px-6 py-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Grid3x3 className="h-4 w-4 text-primary" /> Matriks per Lembaga
          </span>
          <span className="mt-1 block text-xs text-muted-foreground">
            {formatNumber(rows.length)} Lembaga{m.critical > 0 ? ` · ${formatNumber(m.critical)} berskor kritis (<${BAND_THRESHOLDS.warn})` : ""} — warna sel mengikuti skor (merah → hijau);
            klik judul kolom untuk mengurutkan, klik nama Lembaga untuk rincian & daftar kerjanya.
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {headerControl}
          <MatrixSearch value={m.query} onChange={m.setQuery} />
        </div>
      </div>
      <CardContent className="border-t pt-4">
        {m.sorted.length === 0 ? (
          <div className="flex min-h-[160px] items-center justify-center text-sm text-muted-foreground">{emptyRowsMessage(m.query)}</div>
        ) : (
          <div className="overflow-x-auto">
            {/* `table-fixed` + lebar kolom eksplisit: lebar tidak dihitung ulang dari
                isi baris saat urutan/irisan berubah (masukan owner: kolom "bergeser").
                `border-spacing-[2px]` = celah tipis antar sel ala heatmap. */}
            <table className="w-full min-w-[880px] table-fixed border-separate border-spacing-[2px] text-sm">
              <colgroup>
                <col />
                <col className="w-[80px]" />
                <col className="w-[72px]" />
                {AVAILABILITY_DOMAIN_KEYS.map((key) => (
                  <col key={key} className="w-[96px]" />
                ))}
              </colgroup>
              <thead>
                <tr className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="py-1.5 pr-3 text-left font-semibold">{headBtn("name", "Lembaga Petani")}</th>
                  <th className="whitespace-nowrap px-1 py-1.5 text-center font-semibold">
                    {headBtn("health", "Skor Total", "Skor kelengkapan berbobot lintas domain")}
                  </th>
                  <th className="whitespace-nowrap px-2 py-1.5 text-right font-semibold">{headBtn("totalFarmers", "Petani (n)", "Jumlah petani aktif")}</th>
                  {AVAILABILITY_DOMAIN_KEYS.map((key) => (
                    <th key={key} className="whitespace-nowrap px-1 py-1.5 text-center font-semibold">
                      {headBtn(key, shortDomainLabel(key))}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {m.limited.map((e) => (
                  <tr key={e.id} className="group/row align-middle">
                    <td className="rounded-md px-1 py-0 pr-3 transition-colors group-hover/row:bg-muted/50">
                      {/* Satu baris: nama (deep link ke DA-02, #352 B3) + kode · distrik. */}
                      <div className="flex h-7 min-w-0 items-center gap-2">
                        <Link
                          href={`/admin/data-analyst/data-completeness?lembaga=${e.id}`}
                          className="flex min-w-0 items-center gap-1 font-medium leading-tight text-primary hover:underline"
                          title={e.name}
                        >
                          <span className="truncate">{e.name}</span>
                          <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
                        </Link>
                        <span className="shrink-0 truncate text-[11px] text-muted-foreground">
                          {e.code ? `${e.code} · ` : ""}
                          {e.districtName}
                        </span>
                      </div>
                    </td>
                    <td className="p-0">
                      <Tooltip>
                        <TooltipTrigger render={<HeatCell score={e.healthScore} emphasis />}>{formatNumber(e.healthScore)}</TooltipTrigger>
                        <StatTooltipContent title="Skor Total — berbobot lintas domain" subtitle={e.name} footer={`Band: ${bandLabel(e.healthScore)}`}>
                          <StatTooltipRow chip={BAND_BAR[scoreBand(e.healthScore)]} label="Skor kelengkapan" value={`${formatNumber(e.healthScore)}/100`} />
                          <StatTooltipRow chip="bg-amber-400" label="Temuan anomali" value={e.totalAnomalies} />
                        </StatTooltipContent>
                      </Tooltip>
                    </td>
                    <td className="px-2 py-0 text-right text-xs tabular-nums text-muted-foreground">{formatNumber(e.totalFarmers)}</td>
                    {AVAILABILITY_DOMAIN_KEYS.map((key) => (
                      <td key={key} className="p-0">
                        <ScoreCell score={domainScoreOf(e, key)} label={AVAILABILITY_DOMAIN_LABELS[key]} groupName={e.name} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <HeatLegend />
          {m.canLimit && (
            <MatrixLimitToggle
              showAll={m.showAll}
              onToggle={() => m.setShowAll((v) => !v)}
              total={m.sorted.length}
              hiddenCount={m.hiddenCount}
              sortKey={sortKey}
              sortAsc={sortAsc}
              unit="baris"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
