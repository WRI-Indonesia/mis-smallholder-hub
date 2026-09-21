"use client";

import { useState } from "react";
import Link from "next/link";
import { Pentagon, ArrowDownAZ, ArrowUpZA, ExternalLink, Maximize2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { StatTooltipContent, StatTooltipRow } from "@/components/shared/stat-tooltip";
import { HeatCell, HeatLegend } from "@/components/shared/score-visuals";
import { RadarChart } from "@/components/shared/radar-chart";
import { AVAILABILITY_DOMAIN_KEYS, AVAILABILITY_DOMAIN_LABELS, BAND_THRESHOLDS, domainScoreOf, scoreBand, shortDomainLabel } from "@/lib/data-availability-aggregation";
import { BAND_BAR, bandLabel } from "@/lib/score-band-styles";
import type { AvailabilityGroupEntry } from "@/types/dashboard";
import { formatNumber, formatPct } from "@/lib/format";
import { entryDomainScores } from "./domain-meta";
import { useMatrixRows, type MatrixSortKey } from "./matrix-rows";
import { emptyRowsMessage, MatrixLimitToggle, MatrixSearch, rowsSummary } from "./matrix-toolbar";
import { RadarDetailDialog } from "./availability-radar-dialog";

const SORT_OPTIONS: { key: MatrixSortKey; label: string }[] = [
  { key: "health", label: "Skor Total" },
  { key: "name", label: "Nama" },
  { key: "totalFarmers", label: "Jumlah petani" },
  ...AVAILABILITY_DOMAIN_KEYS.map((key) => ({ key, label: shortDomainLabel(key) })),
];

function RadarCard({ entry, onOpen }: { entry: AvailabilityGroupEntry; onOpen: () => void }) {
  return (
    <div className="group/radar rounded-xl border bg-card p-3 shadow-sm transition-colors hover:bg-muted/30">
      <div className="flex items-center justify-between gap-2">
        {/* Deep link ke DA-02 dengan Lembaga terpilih (#352 B3). */}
        <Link
          href={`/admin/data-analyst/data-completeness?lembaga=${entry.id}`}
          className="flex min-w-0 items-center gap-1 text-sm font-medium leading-tight text-primary hover:underline"
          title={entry.name}
        >
          <span className="truncate">{entry.name}</span>
          <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
        </Link>
        <Tooltip>
          <TooltipTrigger render={<HeatCell score={entry.healthScore} emphasis className="h-6 w-11 shrink-0" />}>{formatNumber(entry.healthScore)}</TooltipTrigger>
          <StatTooltipContent title="Skor Total — berbobot lintas domain" subtitle={entry.name} footer={`Band: ${bandLabel(entry.healthScore)}`}>
            {AVAILABILITY_DOMAIN_KEYS.map((k) => {
              const s = domainScoreOf(entry, k);
              return <StatTooltipRow key={k} chip={BAND_BAR[scoreBand(s)]} label={AVAILABILITY_DOMAIN_LABELS[k]} value={`${formatPct(s)}%`} />;
            })}
          </StatTooltipContent>
        </Tooltip>
      </div>
      {/* Area grafik = tombol perbesar (modal); nama tetap tautan ke daftar kerja. */}
      <button
        type="button"
        onClick={onOpen}
        className="relative block w-full cursor-zoom-in rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        aria-label={`Perbesar radar ${entry.name}`}
        title="Klik untuk memperbesar"
      >
        <RadarChart name={entry.name} total={entry.healthScore} scores={entryDomainScores(entry)} />
        <Maximize2 className="absolute right-1 top-1 h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover/radar:opacity-70" />
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
 * Radar "sidik jari" per Lembaga (#352 putaran 4, pilihan owner "visualisasi
 * out of the box", lalu dijadikan tampilan bawaan): grid kartu kecil, tiap
 * Lembaga satu pentagon lima domain — bentuknya yang dibaca, bukan angkanya
 * (angka ada di label sumbu & tooltip). Urutan (kunci + arah) sama dengan
 * heatmap lewat URL, jadi klik kartu domain juga mengurutkan grid ini; ada
 * pilih-urut sendiri karena tak ada judul kolom yang bisa diklik.
 */
export function AvailabilityRadarGrid({
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
  // Modal: Lembaga terpilih disimpan sebagai id (bukan indeks) supaya tetap
  // menunjuk Lembaga yang sama bila urutan/irisan berubah, dan `open` terpisah
  // agar isi tetap terpasang selama animasi tutup. Indeks pada `sorted` (bukan
  // `limited`) agar ◀ ▶ menjangkau semua kartu.
  const [openId, setOpenId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const openIndex = openId == null ? -1 : m.sorted.findIndex((e) => e.id === openId);
  const DirIcon = sortAsc ? ArrowDownAZ : ArrowUpZA;

  return (
    <Card className="border border-border/60 shadow-sm">
      <div className="flex flex-col gap-3 px-6 py-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Pentagon className="h-4 w-4 text-primary" /> Radar per Lembaga
          </span>
          <span className="mt-1 block text-xs text-muted-foreground">
            {rowsSummary(rows.length, m.critical)} — pentagon penuh = lengkap, gepeng ke satu
            sisi = domain itu kosong. Klik grafik untuk memperbesar, klik nama Lembaga untuk daftar kerjanya; kartu domain di atas mengurutkan per domain.
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {headerControl}
          <Select
            value={sortKey}
            onValueChange={(v) => onSortChange(v as MatrixSortKey, true)}
            items={SORT_OPTIONS.map((o) => ({ value: o.key, label: `Urut: ${o.label}` }))}
          >
            <SelectTrigger className="h-8 w-[150px] text-xs" aria-label="Urutkan menurut">
              <SelectValue placeholder="Urutkan" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.key} value={o.key} className="text-xs">
                  Urut: {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onSortChange(sortKey, !sortAsc)}
            title={sortAsc ? "Menaik — klik untuk menurun" : "Menurun — klik untuk menaik"}
            aria-label="Balik arah urutan"
          >
            <DirIcon className="h-4 w-4" />
          </Button>
          <MatrixSearch value={m.query} onChange={m.setQuery} />
        </div>
      </div>
      <CardContent className="border-t pt-4">
        {m.sorted.length === 0 ? (
          <div className="flex min-h-[160px] items-center justify-center text-sm text-muted-foreground">{emptyRowsMessage(m.query)}</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {m.limited.map((e) => (
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
          {m.canLimit && (
            <MatrixLimitToggle
              showAll={m.showAll}
              onToggle={() => m.setShowAll((v) => !v)}
              total={m.sorted.length}
              hiddenCount={m.hiddenCount}
              sortKey={sortKey}
              sortAsc={sortAsc}
              unit="kartu"
            />
          )}
        </div>
      </CardContent>
      <RadarDetailDialog
        entries={m.sorted}
        index={openIndex}
        open={open}
        onIndexChange={(i) => setOpenId(m.sorted[i]?.id ?? null)}
        onClose={() => setOpen(false)}
      />
    </Card>
  );
}
