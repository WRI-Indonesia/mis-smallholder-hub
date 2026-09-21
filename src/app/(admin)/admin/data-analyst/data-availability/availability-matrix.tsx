"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Grid3x3, ArrowUpDown, ExternalLink, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { StatTooltipContent, StatTooltipRow } from "@/components/shared/stat-tooltip";
import { cn } from "@/lib/utils";
import { AVAILABILITY_DOMAIN_LABELS, domainScoreOf, scoreBand } from "@/lib/data-availability-aggregation";
import { BAND_BAR, BAND_CELL, BAND_CELL_SOFT, BAND_LEGEND } from "@/lib/score-band-styles";
import type { AvailabilityDomainKey, AvailabilityGroupEntry } from "@/types/dashboard";
import { formatNumber } from "@/lib/format";

const formatScore = (n: number) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(n);

export type MatrixSortKey = "name" | "totalFarmers" | "health" | AvailabilityDomainKey;

const DOMAIN_COLUMNS: AvailabilityDomainKey[] = ["profil", "petani", "lahan", "pelatihan", "produksi"];
const LOWEST_N = 10;

const bandLabel = (score: number) => BAND_LEGEND.find((s) => s.band === scoreBand(score))?.label ?? "";

/** Sel skor domain — latar lembut + teks band (#352 putaran 3), tooltip terstruktur (#213). */
function ScoreCell({ score, label, groupName }: { score: number; label: string; groupName: string }) {
  const band = scoreBand(score);
  return (
    <Tooltip>
      <TooltipTrigger
        render={<div className={cn("w-full rounded-md px-2 py-1.5 text-center text-sm font-semibold tabular-nums", BAND_CELL_SOFT[band])} />}
      >
        {formatScore(score)}%
      </TooltipTrigger>
      <StatTooltipContent title={label} subtitle={groupName} footer={`Band: ${bandLabel(score)}`}>
        <StatTooltipRow chip={BAND_BAR[band]} label="Skor kelengkapan" value={`${formatScore(score)}%`} />
      </StatTooltipContent>
    </Tooltip>
  );
}

/**
 * Matriks Lembaga × domain (#352 putaran 3): Skor Total tepat di samping nama
 * (angka terpenting dulu), sel domain lembut supaya outlier terbaca, kolom
 * jumlah berlabel "Petani (n)", kotak cari, toggle "10 terendah / semua",
 * urutan bisa dikendalikan dari kartu domain. Segmented control tampilan
 * (inti | modul) diserahkan ke pemanggil lewat `headerControl`.
 */
export function AvailabilityMatrix({
  rows,
  sortKey,
  onSortKeyChange,
  headerControl,
}: {
  rows: AvailabilityGroupEntry[];
  sortKey: MatrixSortKey;
  onSortKeyChange: (key: MatrixSortKey) => void;
  headerControl?: React.ReactNode;
}) {
  const [asc, setAsc] = useState(true);
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((e) => e.name.toLowerCase().includes(q) || (e.code ?? "").toLowerCase().includes(q) || e.districtName.toLowerCase().includes(q));
  }, [rows, query]);

  const sorted = useMemo(() => {
    const value = (e: AvailabilityGroupEntry): string | number => {
      if (sortKey === "name") return e.name.toLowerCase();
      if (sortKey === "totalFarmers") return e.totalFarmers;
      if (sortKey === "health") return e.healthScore;
      return domainScoreOf(e, sortKey);
    };
    return [...filtered].sort((a, b) => {
      const va = value(a);
      const vb = value(b);
      const cmp = typeof va === "string" ? va.localeCompare(vb as string) : (va as number) - (vb as number);
      return asc ? cmp : -cmp;
    });
  }, [filtered, sortKey, asc]);

  const limited = showAll || query ? sorted : sorted.slice(0, LOWEST_N);
  const hiddenCount = sorted.length - limited.length;

  const toggleSort = (key: MatrixSortKey) => {
    if (key === sortKey) setAsc((v) => !v);
    else {
      onSortKeyChange(key);
      // Nama menaik A→Z; kolom skor menaik agar yang paling rendah muncul dulu.
      setAsc(true);
    }
  };

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

  const critical = rows.filter((r) => scoreBand(r.healthScore) === "bad").length;

  return (
    <Card className="border border-border/60 shadow-sm">
      <div className="flex flex-col gap-3 px-6 py-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Grid3x3 className="h-4 w-4 text-primary" /> Matriks per Lembaga
          </span>
          <span className="mt-1 block text-xs text-muted-foreground">
            {formatNumber(rows.length)} Lembaga{critical > 0 ? ` · ${formatNumber(critical)} berskor kritis (<50)` : ""} — klik judul kolom untuk mengurutkan,
            klik nama Lembaga untuk rincian & daftar kerjanya.
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {headerControl}
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
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-y-1 text-sm">
              <thead>
                <tr className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-4 text-left font-semibold">{headBtn("name", "Lembaga Petani")}</th>
                  <th className="whitespace-nowrap px-2 py-2 text-center font-semibold">
                    {headBtn("health", "Skor Total", "Skor kelengkapan berbobot lintas domain")}
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 text-right font-semibold">{headBtn("totalFarmers", "Petani (n)", "Jumlah petani aktif")}</th>
                  {DOMAIN_COLUMNS.map((key) => (
                    <th key={key} className="whitespace-nowrap px-2 py-2 text-center font-semibold">
                      {headBtn(key, AVAILABILITY_DOMAIN_LABELS[key].replace("Profil Lembaga", "Profil"))}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {limited.map((e) => (
                  <tr key={e.id} className="group/row align-middle">
                    <td className="rounded-l-md py-1.5 pr-4 transition-colors group-hover/row:bg-muted/50">
                      {/* Deep link ke DA-02 dengan Lembaga terpilih (#352 B3). */}
                      <Link
                        href={`/admin/data-analyst/data-completeness?lembaga=${e.id}`}
                        className="inline-flex items-center gap-1 font-medium leading-tight text-primary hover:underline"
                      >
                        {e.name}
                        <ExternalLink className="h-3 w-3 opacity-50" />
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {e.code ? `${e.code} · ` : ""}
                        {e.districtName}
                      </div>
                    </td>
                    <td className="px-1 py-1.5">
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <div className={cn("w-full rounded-md px-2 py-1.5 text-center text-base font-bold tabular-nums ring-1 ring-inset ring-border/60", BAND_CELL[scoreBand(e.healthScore)])} />
                          }
                        >
                          {formatNumber(e.healthScore)}
                        </TooltipTrigger>
                        <StatTooltipContent title="Skor Total — berbobot lintas domain" subtitle={e.name} footer={`Band: ${bandLabel(e.healthScore)}`}>
                          <StatTooltipRow chip={BAND_BAR[scoreBand(e.healthScore)]} label="Skor kelengkapan" value={`${formatNumber(e.healthScore)}/100`} />
                          <StatTooltipRow chip="bg-amber-400" label="Temuan anomali" value={e.totalAnomalies} />
                        </StatTooltipContent>
                      </Tooltip>
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">{formatNumber(e.totalFarmers)}</td>
                    {DOMAIN_COLUMNS.map((key) => (
                      <td key={key} className="px-1 py-1.5 last:rounded-r-md">
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
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-medium">Band skor:</span>
            {BAND_LEGEND.map((s) => (
              <span key={s.band} className="inline-flex items-center gap-1.5">
                <span className={cn("inline-block h-3 w-5 rounded", BAND_CELL[s.band])} />
                {s.label}
              </span>
            ))}
          </div>
          {!query && sorted.length > LOWEST_N && (
            <Button variant="ghost" size="sm" className="h-7" onClick={() => setShowAll((v) => !v)}>
              {showAll ? `Tampilkan ${LOWEST_N} teratas saja` : `Tampilkan semua (${formatNumber(sorted.length)}) — ${formatNumber(hiddenCount)} tersembunyi`}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
