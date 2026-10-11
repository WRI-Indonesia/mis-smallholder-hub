"use client";

import Link from "next/link";
import { AlertTriangle, ChevronDown, ClipboardList, Columns3, ListOrdered } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { domainLaggards, topAnomalies, topSystemicAnomalies, AVAILABILITY_DOMAIN_KEYS } from "@/lib/data-availability-aggregation";
import { anomalyDef, SYSTEMIC_THRESHOLD } from "@/lib/data-completeness-registry";
import type { AvailabilityAnomalySummary, AvailabilityGroupEntry } from "@/types/dashboard";
import { formatNumber } from "@/lib/format";
import { DomainLaggardsGrid } from "./availability-domain-laggards";

/** Tab Daftar Kerja (#417 C) — kunci URL `?kerja=`; bawaan Sistemik (urusan terbesar, unggah massal). */
export type WorklistTab = "sistemik" | "entitas" | "tertinggal";
export const WORKLIST_TABS: WorklistTab[] = ["sistemik", "entitas", "tertinggal"];
export const WORKLIST_TOP_N = 8;

/**
 * Istilah UI (#417 D): registri check masih menulis "persil" (kunci & kolom Excel
 * Per Lembaga tetap, supaya berkas lama tidak putus); di layar dibaca "lahan",
 * sama dengan menu lain.
 */
export const uiAnomalyLabel = (label: string) => label.replace(/\bPersil\b/g, "Lahan").replace(/\bpersil\b/g, "lahan");

/** Daftar Lembaga terdampak — tombol "n Lembaga ▾" yang bisa dibuka keyboard & sentuh (bukan tooltip hover saja, T4). */
function AffectedGroups({ a }: { a: AvailabilityAnomalySummary }) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="inline-flex shrink-0 items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={`Lihat ${formatNumber(a.groupsAffected)} Lembaga terdampak: ${uiAnomalyLabel(a.label)}`}
          />
        }
      >
        {formatNumber(a.groupsAffected)} Lembaga <ChevronDown className="h-3 w-3" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-2">
        <div className="mb-1 px-1 text-xs font-medium">{uiAnomalyLabel(a.label)}</div>
        <ul className="max-h-64 space-y-0.5 overflow-y-auto">
          {a.groups.map((g) => (
            <li key={g.id}>
              <Link href={`/admin/data-analyst/data-completeness?lembaga=${g.id}`} className="flex items-baseline justify-between gap-2 rounded px-1 py-0.5 text-xs hover:bg-muted">
                <span className="truncate">{g.name}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">{formatNumber(g.count)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

/** Satu baris anomali: label = tautan ke Lembaga terdampak terbanyak (tetap, #352 B3) · jumlah · menu pengisian · bar. */
function WorkRow({ a, max, chip, showFix }: { a: AvailabilityAnomalySummary; max: number; chip: string; showFix: boolean }) {
  const top = a.groups[0];
  const fix = anomalyDef(a.key).fix;
  const primaryMenu = fix.menu.split(" · ")[0];
  return (
    <li className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <Link href={`/admin/data-analyst/data-completeness?lembaga=${top.id}`} className="min-w-0 truncate font-medium hover:text-primary hover:underline" title={`Buka ${top.name} — Lembaga terdampak terbanyak`}>
          {uiAnomalyLabel(a.label)}
        </Link>
        <span className="flex shrink-0 items-center gap-2">
          <span className="text-xs font-semibold tabular-nums">{formatNumber(a.count)}</span>
          <AffectedGroups a={a} />
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted">
        <div className={`h-full rounded-full ${chip}`} style={{ width: max > 0 ? `${(a.count / max) * 100}%` : 0 }} />
      </div>
      {showFix && (
        <div className="truncate text-xs text-muted-foreground" title={fix.field ? `${fix.menu} › ${fix.field}` : fix.menu}>
          Isi lewat{" "}
          {fix.href ? (
            <Link href={fix.href} className="text-primary hover:underline">
              {primaryMenu}
              {fix.field ? ` › ${fix.field}` : ""}
            </Link>
          ) : (
            primaryMenu
          )}
        </div>
      )}
    </li>
  );
}

/**
 * Daftar Kerja (#417 C, keputusan K1): satu kartu bertab menggantikan kolom
 * "Aksi lintas Lembaga" hero + panel "Paling tertinggal per domain" + panel
 * "Anomali Terbanyak" (T2: satu informasi satu tempat). Mengikuti pilihan filter
 * yang tampil (termasuk tingkat skor). Tab di URL (`?kerja=`).
 */
export function AvailabilityWorklist({ groups, tab, onTabChange }: { groups: AvailabilityGroupEntry[]; tab: WorklistTab; onTabChange: (t: WorklistTab) => void }) {
  const systemic = topSystemicAnomalies(groups, WORKLIST_TOP_N);
  const perEntity = topAnomalies(groups, WORKLIST_TOP_N);
  // Badge Tertinggal = Lembaga unik yang muncul di lima kolom (berskor < 100 %).
  const laggardIds = new Set(AVAILABILITY_DOMAIN_KEYS.flatMap((k) => domainLaggards(groups, k, 5).filter((r) => r.score < 100).map((r) => r.id)));
  const counts: Record<WorklistTab, number> = { sistemik: systemic.length, entitas: perEntity.length, tertinggal: laggardIds.size };
  const META: Record<WorklistTab, { label: string; icon: typeof Columns3 }> = {
    sistemik: { label: "Sistemik (unggah massal)", icon: Columns3 },
    entitas: { label: "Per entitas", icon: AlertTriangle },
    tertinggal: { label: "Tertinggal per domain", icon: ListOrdered },
  };

  return (
    <section className="rounded-xl border border-border/60 bg-card shadow-sm" aria-labelledby="worklist-title">
      <div className="flex flex-wrap items-center gap-3 border-b px-4 py-2.5">
        <h2 id="worklist-title" className="mr-auto flex items-center gap-2 text-sm font-semibold">
          <ClipboardList className="h-4 w-4 text-primary" /> Daftar Kerja
        </h2>
        <Tabs value={tab} onValueChange={(v) => onTabChange(v as WorklistTab)}>
          <TabsList className="h-8">
            {WORKLIST_TABS.map((t) => {
              const Icon = META[t].icon;
              return (
                <TabsTrigger key={t} value={t} className="gap-1.5 text-xs">
                  <Icon className="h-3.5 w-3.5" />
                  {META[t].label}
                  <span className="rounded-full bg-muted px-1.5 text-[10px] font-semibold tabular-nums" aria-label={`${counts[t]} butir`}>
                    {counts[t]}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </div>
      <div className="p-4">
        {tab === "sistemik" && (
          <>
            <p className="mb-3 text-xs text-muted-foreground">
              Kolom yang ≥ {Math.round(SYSTEMIC_THRESHOLD * 100)} % kosong di suatu Lembaga — urusan alur pengisian (unggah massal), bukan perbaikan satu per satu. Angka = entitas kosong.
            </p>
            {systemic.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tidak ada kolom yang kosong sistemik pada pilihan filter ini.</p>
            ) : (
              <ol className="grid gap-x-8 gap-y-3 md:grid-cols-2">
                {systemic.map((a) => (
                  <WorkRow key={a.key} a={a} max={systemic[0].count} chip="bg-slate-400" showFix />
                ))}
              </ol>
            )}
          </>
        )}
        {tab === "entitas" && (
          <>
            <p className="mb-3 text-xs text-muted-foreground">Masalah yang dikejar per petani/lahan. Klik label untuk membuka Lembaga terdampak terbanyak di Per Lembaga.</p>
            {perEntity.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tidak ada anomali per entitas pada pilihan filter ini.</p>
            ) : (
              <ol className="grid gap-x-8 gap-y-3 md:grid-cols-2">
                {perEntity.map((a) => (
                  <WorkRow key={a.key} a={a} max={perEntity[0].count} chip="bg-amber-400" showFix={false} />
                ))}
              </ol>
            )}
          </>
        )}
        {tab === "tertinggal" && (
          <>
            <p className="mb-3 text-xs text-muted-foreground">Sampai 5 Lembaga berskor terendah (di bawah 100 %) tiap domain — daftar kunjungan per urusan. Lembaga tanpa petani tidak diikutkan.</p>
            <DomainLaggardsGrid groups={groups} />
          </>
        )}
      </div>
    </section>
  );
}
