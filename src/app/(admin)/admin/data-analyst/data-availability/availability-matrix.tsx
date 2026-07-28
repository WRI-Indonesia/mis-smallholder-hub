"use client";

import { useMemo, useState } from "react";
import { Grid3x3, ArrowUpDown, ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AVAILABILITY_DOMAIN_LABELS,
  scoreBand,
} from "@/lib/data-availability-aggregation";
import { BAND_CELL, BAND_LEGEND } from "./score-band-styles";
import type { AvailabilityDomainKey, AvailabilityGroupEntry } from "@/types/dashboard";

const formatNumber = (n: number) => new Intl.NumberFormat("id-ID").format(n);
const formatScore = (n: number) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(n);

type SortKey = "name" | "totalFarmers" | "health" | AvailabilityDomainKey;

const DOMAIN_COLUMNS: AvailabilityDomainKey[] = [
  "profil",
  "petani",
  "lahan",
  "pelatihan",
  "produksi",
];

function domainScore(e: AvailabilityGroupEntry, key: AvailabilityDomainKey): number {
  return key === "profil" ? e.profileScore : e.domainScores[key];
}

function ScoreCell({ score, label }: { score: number; label: string }) {
  return (
    <div
      className={`w-full rounded-md px-2 py-1.5 text-center tabular-nums text-sm font-semibold ${BAND_CELL[scoreBand(score)]}`}
      title={`${label} — skor ${formatScore(score)}%`}
    >
      {formatScore(score)}%
    </div>
  );
}

export function AvailabilityMatrix({ rows }: { rows: AvailabilityGroupEntry[] }) {
  // Default urut skor total menaik — Lembaga yang paling tertinggal tampil dulu.
  const [sortKey, setSortKey] = useState<SortKey>("health");
  const [asc, setAsc] = useState(true);
  const [open, setOpen] = useState(true);

  const sorted = useMemo(() => {
    const value = (e: AvailabilityGroupEntry): string | number => {
      if (sortKey === "name") return e.name.toLowerCase();
      if (sortKey === "totalFarmers") return e.totalFarmers;
      if (sortKey === "health") return e.healthScore;
      return domainScore(e, sortKey);
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
      // Nama menaik A→Z; kolom skor menaik agar yang paling rendah muncul dulu.
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

  const critical = rows.filter((r) => scoreBand(r.healthScore) === "bad").length;

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
                  <Grid3x3 className="h-4 w-4 text-primary" /> Matriks Kelengkapan per Lembaga &amp;
                  Domain
                </span>
                <span className="block text-xs text-muted-foreground mt-1">
                  {open
                    ? "Skor kelengkapan tiap domain data per Lembaga Petani. Klik judul kolom untuk mengurutkan; detail anomali per Lembaga ada di halaman Analisa Ketersediaan Data."
                    : `${formatNumber(rows.length)} Lembaga${critical > 0 ? ` · ${formatNumber(critical)} berskor kritis (<50)` : ""}`}
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
                      {DOMAIN_COLUMNS.map((key) => (
                        <th key={key} className="text-center py-2 px-2 font-semibold whitespace-nowrap">
                          {headBtn(key, AVAILABILITY_DOMAIN_LABELS[key].replace("Profil Lembaga", "Profil"))}
                        </th>
                      ))}
                      <th className="text-center py-2 px-2 font-semibold whitespace-nowrap">
                        {headBtn("health", "Skor Total", "Skor kelengkapan berbobot lintas domain")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((e) => (
                      <tr key={e.id} className="align-middle">
                        <td className="py-1.5 pr-4">
                          <div className="font-medium leading-tight">{e.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {e.code ? `${e.code} · ` : ""}
                            {e.districtName}
                          </div>
                        </td>
                        <td className="py-1.5 px-3 text-right tabular-nums text-muted-foreground">
                          {formatNumber(e.totalFarmers)}
                        </td>
                        {DOMAIN_COLUMNS.map((key) => (
                          <td key={key} className="py-1.5 px-1">
                            <ScoreCell
                              score={domainScore(e, key)}
                              label={AVAILABILITY_DOMAIN_LABELS[key]}
                            />
                          </td>
                        ))}
                        <td className="py-1.5 px-1">
                          <div
                            className={`w-full rounded-md px-2 py-1.5 text-center tabular-nums text-sm font-bold ring-1 ring-inset ring-border/60 ${BAND_CELL[scoreBand(e.healthScore)]}`}
                            title={`Skor kelengkapan berbobot — ${formatNumber(e.totalAnomalies)} anomali`}
                          >
                            {formatNumber(e.healthScore)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 mt-4 text-xs text-muted-foreground">
              <span className="font-medium">Band skor:</span>
              {BAND_LEGEND.map((s) => (
                <span key={s.band} className="inline-flex items-center gap-1.5">
                  <span className={`inline-block h-3 w-5 rounded ${BAND_CELL[s.band]}`} />
                  {s.label}
                </span>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
