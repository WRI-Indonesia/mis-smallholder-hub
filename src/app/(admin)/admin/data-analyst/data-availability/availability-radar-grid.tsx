"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, Maximize2 } from "lucide-react";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { StatTooltipContent, StatTooltipRow } from "@/components/shared/stat-tooltip";
import { HeatCell, HeatLegend } from "@/components/shared/score-visuals";
import { RadarChart } from "@/components/shared/radar-chart";
import { AVAILABILITY_DOMAIN_KEYS, AVAILABILITY_DOMAIN_LABELS, BAND_THRESHOLDS, domainScoreOf, scoreBand } from "@/lib/data-availability-aggregation";
import { BAND_BAR, bandLabel } from "@/lib/score-band-styles";
import type { AvailabilityGroupEntry } from "@/types/dashboard";
import { formatNumber, formatPct } from "@/lib/format";
import { entryDomainScores } from "./domain-meta";
import { emptyRowsMessage, MatrixLimitToggle } from "./matrix-toolbar";
import type { MatrixRowsView } from "./matrix-rows";
import { RadarDetailDialog } from "./availability-radar-dialog";

function RadarCard({ entry, onOpen }: { entry: AvailabilityGroupEntry; onOpen: () => void }) {
  return (
    <div className="group/radar rounded-xl border bg-card p-3 shadow-sm transition-colors hover:bg-muted/30">
      <div className="flex items-center justify-between gap-2">
        {/* Deep link ke DA-02 dengan Lembaga terpilih (#352 B3). */}
        <Link
          href={`/admin/data-analyst/data-completeness?lembaga=${entry.id}`}
          className="flex min-w-0 items-center gap-1 text-sm font-medium leading-tight text-primary hover:underline"
          title={`${entry.name} — buka Per Lembaga`}
        >
          <span className="truncate">{entry.name}</span>
          <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
        </Link>
        <Tooltip>
          <TooltipTrigger render={<HeatCell score={entry.healthScore} emphasis className="h-6 w-11 shrink-0" aria-label={`Skor Total ${formatNumber(entry.healthScore)}`} />}>
            {formatNumber(entry.healthScore)}
          </TooltipTrigger>
          <StatTooltipContent title="Skor Total — berbobot lintas domain" subtitle={entry.name} footer={`Tingkat skor: ${bandLabel(entry.healthScore)}`}>
            {AVAILABILITY_DOMAIN_KEYS.map((k) => {
              const s = domainScoreOf(entry, k);
              return <StatTooltipRow key={k} chip={BAND_BAR[scoreBand(s)]} label={AVAILABILITY_DOMAIN_LABELS[k]} value={`${formatPct(s)}%`} />;
            })}
          </StatTooltipContent>
        </Tooltip>
      </div>
      {/* Area grafik = tombol perbesar (modal); tombol "Perbesar" eksplisit muncul saat hover/fokus (T4). */}
      <button
        type="button"
        onClick={onOpen}
        className="relative block w-full cursor-zoom-in rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        aria-label={`Perbesar radar ${entry.name}`}
      >
        <RadarChart name={entry.name} total={entry.healthScore} scores={entryDomainScores(entry)} roomyLabels />
        <span className="pointer-events-none absolute right-1 top-1 inline-flex items-center gap-1 rounded-md border bg-background/90 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground opacity-0 shadow-sm transition-opacity group-hover/radar:opacity-100 group-focus-within/radar:opacity-100">
          <Maximize2 className="h-3 w-3" /> Perbesar
        </span>
      </button>
      <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span className="truncate">
          {entry.code ? `${entry.code} · ` : ""}
          {entry.districtName}
        </span>
        <span className="shrink-0 tabular-nums">{formatNumber(entry.totalFarmers)} petani</span>
      </div>
    </div>
  );
}

/**
 * Radar "sidik jari" per Lembaga (#352 putaran 4, tampilan bawaan; #417 K2):
 * grid kartu kecil, tiap Lembaga satu pentagon lima domain. Isi kartu saja —
 * toolbar (tab · Urut · arah · Cari) milik pemanggil (#417 B). Jumlah kolom
 * mengikuti lebar KONTEN lewat container query, bukan viewport (T1).
 */
export function AvailabilityRadarGrid({
  rows,
}: {
  rows: MatrixRowsView;
}) {
  const { sorted, limited, query, canLimit, showAll, hiddenCount, onToggleShowAll } = rows;
  // Modal: Lembaga terpilih disimpan sebagai id (bukan indeks) supaya tetap
  // menunjuk Lembaga yang sama bila urutan/irisan berubah, dan `open` terpisah
  // agar isi tetap terpasang selama animasi tutup. Indeks pada `sorted` (bukan
  // `limited`) agar ◀ ▶ menjangkau semua kartu.
  const [openId, setOpenId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const openIndex = openId == null ? -1 : sorted.findIndex((e) => e.id === openId);

  return (
    <div className="@container p-4">
      {sorted.length === 0 ? (
        <div className="flex min-h-[160px] items-center justify-center text-sm text-muted-foreground">{emptyRowsMessage(query)}</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 @md:grid-cols-2 @2xl:grid-cols-3 @4xl:grid-cols-4 @6xl:grid-cols-5">
          {limited.map((e) => (
            <RadarCard
              key={e.id}
              entry={e}
              onOpen={() => {
                setOpenId(e.id);
                setOpen(true);
              }}
            />
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <HeatLegend label="Skala warna">
          <span>
            isian = Skor Total · titik sudut = skor domain · cincin = ambang {BAND_THRESHOLDS.warn} / {BAND_THRESHOLDS.good} / {BAND_THRESHOLDS.full}
          </span>
        </HeatLegend>
        {canLimit && <MatrixLimitToggle showAll={showAll} onToggle={onToggleShowAll} hiddenCount={hiddenCount} unit="kartu" />}
      </div>
      <RadarDetailDialog entries={sorted} index={openIndex} open={open} onIndexChange={(i) => setOpenId(sorted[i]?.id ?? null)} onClose={() => setOpen(false)} />
    </div>
  );
}
