"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Pentagon, ArrowDownAZ, ArrowUpZA, ExternalLink, Search, Maximize2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { StatTooltipContent, StatTooltipRow } from "@/components/shared/stat-tooltip";
import { HeatCell, HeatLegend } from "@/components/shared/score-visuals";
import { cn } from "@/lib/utils";
import { AVAILABILITY_DOMAIN_KEYS, AVAILABILITY_DOMAIN_LABELS, bandDistribution, domainScoreOf, scoreBand } from "@/lib/data-availability-aggregation";
import { BAND_BAR } from "@/lib/score-band-styles";
import type { AvailabilityGroupEntry } from "@/types/dashboard";
import { formatNumber } from "@/lib/format";
import { bandLabel, formatScore, shortDomainLabel, entryDomainScores } from "./domain-meta";
import { filterMatrixRows, sortKeyLabel, sortMatrixRows, type MatrixSortKey } from "./matrix-rows";
import { RadarChart } from "@/components/shared/radar-chart";
import { RadarDetailDialog } from "./availability-radar-dialog";

const LOWEST_N = 10;

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
              return <StatTooltipRow key={k} chip={BAND_BAR[scoreBand(s)]} label={AVAILABILITY_DOMAIN_LABELS[k]} value={`${formatScore(s)}%`} />;
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
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(true);
  /** Indeks kartu yang dibuka di modal (pada `sorted`, bukan `limited`, agar ◀ ▶ menjangkau semua). */
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const sorted = useMemo(() => sortMatrixRows(filterMatrixRows(rows, query), sortKey, sortAsc), [rows, query, sortKey, sortAsc]);
  const limited = showAll || query ? sorted : sorted.slice(0, LOWEST_N);
  const hiddenCount = sorted.length - limited.length;
  const critical = bandDistribution(rows).bad;
  const DirIcon = sortAsc ? ArrowDownAZ : ArrowUpZA;

  return (
    <Card className="border border-border/60 shadow-sm">
      <div className="flex flex-col gap-3 px-6 py-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Pentagon className="h-4 w-4 text-primary" /> Radar per Lembaga
          </span>
          <span className="mt-1 block text-xs text-muted-foreground">
            {formatNumber(rows.length)} Lembaga{critical > 0 ? ` · ${formatNumber(critical)} berskor kritis (<50)` : ""} — pentagon penuh = lengkap, gepeng ke satu
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
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari Lembaga / kode / distrik"
              className="h-8 w-[220px] pl-8 text-xs"
              aria-label="Cari Lembaga"
            />
          </div>
        </div>
      </div>
      <CardContent className="border-t pt-4">
        {sorted.length === 0 ? (
          <div className="flex min-h-[160px] items-center justify-center text-sm text-muted-foreground">
            {query ? `Tidak ada Lembaga yang cocok dengan "${query}".` : "Tidak ada Lembaga Petani pada filter ini."}
          </div>
        ) : (
          <div className={cn("grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5")}>
            {limited.map((e, i) => (
              <RadarCard key={e.id} entry={e} onOpen={() => setOpenIndex(i)} />
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <HeatLegend label="Skala warna">
            <span>isian = Skor Total · titik sudut = skor domain · cincin = ambang 50 / 80 / 100</span>
          </HeatLegend>
          {!query && sorted.length > LOWEST_N && (
            <Button variant="ghost" size="sm" className="h-7" onClick={() => setShowAll((v) => !v)}>
              {showAll
                ? `Ringkas — ${LOWEST_N} kartu pertama saja (urut ${sortKeyLabel(sortKey)} ${sortAsc ? "menaik" : "menurun"})`
                : `Tampilkan semua (${formatNumber(sorted.length)}) — ${formatNumber(hiddenCount)} tersembunyi`}
            </Button>
          )}
        </div>
      </CardContent>
      <RadarDetailDialog entries={sorted} index={openIndex} onIndexChange={setOpenIndex} onClose={() => setOpenIndex(null)} />
    </Card>
  );
}
