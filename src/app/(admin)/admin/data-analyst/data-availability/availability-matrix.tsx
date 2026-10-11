"use client";

import Link from "next/link";
import { ArrowUpDown, ExternalLink } from "lucide-react";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { StatTooltipContent, StatTooltipRow } from "@/components/shared/stat-tooltip";
import { HeatCell, HeatLegend } from "@/components/shared/score-visuals";
import { cn } from "@/lib/utils";
import { AVAILABILITY_DOMAIN_KEYS, AVAILABILITY_DOMAIN_LABELS, domainScoreOf, scoreBand, shortDomainLabel } from "@/lib/data-availability-aggregation";
import { BAND_BAR, bandLabel } from "@/lib/score-band-styles";
import type { AvailabilityGroupEntry } from "@/types/dashboard";
import { formatNumber, formatPct } from "@/lib/format";
import type { MatrixSortKey } from "./matrix-rows";
import { emptyRowsMessage, MatrixLimitToggle } from "./matrix-toolbar";

/** Sel skor domain — heatmap solid (#352 putaran 4), tooltip terstruktur (#213). */
function ScoreCell({ score, label, groupName }: { score: number; label: string; groupName: string }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<HeatCell score={score} aria-label={`${label} ${groupName}: ${formatPct(score)}%`} />}>{formatPct(score)}</TooltipTrigger>
      <StatTooltipContent title={label} subtitle={groupName} footer={`Tingkat skor: ${bandLabel(score)}`}>
        <StatTooltipRow chip={BAND_BAR[scoreBand(score)]} label="Skor kelengkapan" value={`${formatPct(score)}%`} />
      </StatTooltipContent>
    </Tooltip>
  );
}

/**
 * Matriks Lembaga × domain sebagai heatmap padat (#352 putaran 4): sel solid
 * bergradasi merah→kuning→hijau dengan angka kecil, sehingga pola kolom (mis.
 * Produksi kosong di hampir semua Lembaga) langsung tertangkap mata. Isi kartu
 * saja — toolbar milik pemanggil (#417 B). Muat tanpa scroll horizontal pada
 * ≥ 1.024 px konten (T5): kolom domain 72 px, nama fleksibel; kode · distrik
 * tampil di samping nama hanya bila kartu cukup lebar (container query).
 */
export function AvailabilityMatrix({
  sorted,
  limited,
  query,
  canLimit,
  showAll,
  hiddenCount,
  onToggleShowAll,
  sortKey,
  sortAsc,
  onSortChange,
}: {
  sorted: AvailabilityGroupEntry[];
  limited: AvailabilityGroupEntry[];
  query: string;
  canLimit: boolean;
  showAll: boolean;
  hiddenCount: number;
  onToggleShowAll: () => void;
  sortKey: MatrixSortKey;
  sortAsc: boolean;
  onSortChange: (key: MatrixSortKey, asc: boolean) => void;
}) {
  // Klik judul yang sama = balik arah; judul lain = kunci baru, menaik
  // (nama A→Z; kolom skor: yang paling rendah muncul dulu).
  const toggleSort = (key: MatrixSortKey) => onSortChange(key, key === sortKey ? !sortAsc : true);

  const headBtn = (key: MatrixSortKey, label: string, title?: string) => (
    <button
      type="button"
      onClick={() => toggleSort(key)}
      title={title}
      aria-label={`Urutkan menurut ${title ?? label}${sortKey === key ? (sortAsc ? " (menaik)" : " (menurun)") : ""}`}
      className={cn("inline-flex items-center gap-1 transition-colors hover:text-foreground", sortKey === key && "text-foreground")}
    >
      {label}
      <ArrowUpDown className={cn("h-3 w-3", sortKey === key ? "text-primary" : "opacity-40")} />
    </button>
  );

  return (
    <div className="@container p-4">
      {sorted.length === 0 ? (
        <div className="flex min-h-[160px] items-center justify-center text-sm text-muted-foreground">{emptyRowsMessage(query)}</div>
      ) : (
        <div className="overflow-x-auto">
          {/* `table-fixed` + lebar kolom eksplisit: lebar tidak dihitung ulang dari
              isi baris saat urutan/irisan berubah (masukan owner: kolom "bergeser").
              `border-spacing-[2px]` = celah tipis antar sel ala heatmap. */}
          <table className="w-full min-w-[720px] table-fixed border-separate border-spacing-[2px] text-sm">
            <colgroup>
              <col />
              <col className="w-[72px]" />
              <col className="w-[64px]" />
              {AVAILABILITY_DOMAIN_KEYS.map((key) => (
                <col key={key} className="w-[72px]" />
              ))}
            </colgroup>
            <thead>
              <tr className="text-xs font-semibold text-muted-foreground">
                <th className="py-1.5 pr-3 text-left font-semibold">{headBtn("name", "Lembaga Petani")}</th>
                <th className="whitespace-nowrap px-1 py-1.5 text-center font-semibold">{headBtn("health", "Total", "Skor Total berbobot lintas domain")}</th>
                <th className="whitespace-nowrap px-1 py-1.5 text-right font-semibold">{headBtn("totalFarmers", "Petani", "Jumlah petani terdaftar")}</th>
                {AVAILABILITY_DOMAIN_KEYS.map((key) => (
                  <th key={key} className="whitespace-nowrap px-1 py-1.5 text-center font-semibold">
                    {headBtn(key, shortDomainLabel(key), AVAILABILITY_DOMAIN_LABELS[key])}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {limited.map((e) => (
                <tr key={e.id} className="group/row align-middle">
                  <td className="rounded-md px-1 py-0 pr-3 transition-colors group-hover/row:bg-muted/50">
                    <div className="flex h-7 min-w-0 items-center gap-2" title={`${e.name}${e.code ? ` · ${e.code}` : ""} · ${e.districtName}`}>
                      <Link href={`/admin/data-analyst/data-completeness?lembaga=${e.id}`} className="flex min-w-0 items-center gap-1 font-medium leading-tight text-primary hover:underline">
                        <span className="truncate">{e.name}</span>
                        <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
                      </Link>
                      <span className="hidden shrink-0 truncate text-[11px] text-muted-foreground @4xl:inline">
                        {e.code ? `${e.code} · ` : ""}
                        {e.districtName}
                      </span>
                    </div>
                  </td>
                  <td className="p-0">
                    <Tooltip>
                      <TooltipTrigger render={<HeatCell score={e.healthScore} emphasis aria-label={`Skor Total ${e.name}: ${formatNumber(e.healthScore)}`} />}>{formatNumber(e.healthScore)}</TooltipTrigger>
                      <StatTooltipContent title="Skor Total — berbobot lintas domain" subtitle={e.name} footer={`Tingkat skor: ${bandLabel(e.healthScore)}`}>
                        <StatTooltipRow chip={BAND_BAR[scoreBand(e.healthScore)]} label="Skor kelengkapan" value={`${formatNumber(e.healthScore)}/100`} />
                        <StatTooltipRow chip="bg-amber-400" label="Temuan anomali" value={e.totalAnomalies} />
                      </StatTooltipContent>
                    </Tooltip>
                  </td>
                  <td className="px-1 py-0 text-right text-xs tabular-nums text-muted-foreground">{formatNumber(e.totalFarmers)}</td>
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
        {canLimit && <MatrixLimitToggle showAll={showAll} onToggle={onToggleShowAll} hiddenCount={hiddenCount} unit="baris" />}
      </div>
    </div>
  );
}
