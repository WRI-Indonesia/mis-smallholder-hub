"use client";

import { Factory, Lightbulb, Route, ShieldQuestion, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";
import type { SupplyChainInsight } from "@/lib/supply-chain-insights";
import { CollapsibleCard } from "./collapsible-card";
import type { GroupSortKey } from "./supply-chain-group-table";
import { fmtKm, fmtShare } from "@/lib/supply-chain-format";
import { UlBadge } from "./ul-badge";

const MAX_NAMES = 3;

/** Tombol kecil bergaya chip — nama entitas yang bisa dijadikan filter. */
function Chip({ onClick, title, children, className }: { onClick: () => void; title: string; children: React.ReactNode; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn("inline-flex max-w-full items-center gap-1 rounded border border-border/70 bg-background px-1.5 py-0.5 text-left text-xs hover:border-primary hover:text-primary", className)}
    >
      {children}
    </button>
  );
}

/**
 * Kartu Sorotan (owner 2026-10-10): empat temuan otomatis atas filter aktif —
 * konsentrasi ke Mill, ketergantungan offtaker, kepastian Mill, jarak garis
 * lurus. Tiap angka bisa diklik: jadi filter, atau membuka tabel Lembaga
 * terurut menurut temuannya.
 */
export function SupplyChainInsightsCard({
  insights,
  onFilterMill,
  onFilterGroup,
  onFocusGroups,
}: {
  insights: SupplyChainInsight[];
  onFilterMill: (millId: string | null, label: string) => void;
  onFilterGroup: (code: string, label: string) => void;
  onFocusGroups: (sort: GroupSortKey) => void;
}) {
  if (insights.length === 0) return null;

  const names = (items: { code: string; abrv: string; title: string }[], sort: GroupSortKey) => (
    <span className="inline-flex flex-wrap items-center gap-1">
      {items.slice(0, MAX_NAMES).map((g) => (
        <Chip key={g.code} onClick={() => onFilterGroup(g.code, g.abrv)} title={g.title}>
          {g.abrv}
        </Chip>
      ))}
      {items.length > MAX_NAMES && (
        <button type="button" onClick={() => onFocusGroups(sort)} className="text-xs text-primary underline-offset-2 hover:underline" title="Buka tabel Volume per Lembaga terurut menurut temuan ini">
          +{formatNumber(items.length - MAX_NAMES)} lagi
        </button>
      )}
    </span>
  );

  const tiles = insights.map((ins) => {
    switch (ins.kind) {
      case "KONSENTRASI":
        return {
          key: ins.kind,
          icon: Factory,
          caption: "Konsentrasi ke Mill",
          value: fmtShare(ins.topShare),
          body: (
            <>
              TBS ke{" "}
              <Chip onClick={() => onFilterMill(ins.topMill.millId, ins.topMill.name)} title="Klik untuk memfilter Mill ini">
                <span className="truncate">{ins.topMill.name}</span>
                {ins.topMill.isUl && <UlBadge />}
              </Chip>
              . Tiga Mill terbesar menampung <span className="font-medium text-foreground">{fmtShare(ins.top3Share)}</span> dari {formatNumber(ins.millCount)} Mill.
            </>
          ),
        };
      case "KETERGANTUNGAN":
        return {
          key: ins.kind,
          icon: Users,
          caption: "Ketergantungan offtaker",
          value: `${formatNumber(ins.groups.length)} Lembaga`,
          body:
            ins.groups.length === 0 ? (
              <>Tidak ada Lembaga yang ≥ {Math.round(ins.threshold * 100)}% tonasenya lewat satu offtaker luar (koperasi Lembaga sendiri tak dihitung).</>
            ) : (
              <>
                ≥ {Math.round(ins.threshold * 100)}% tonasenya lewat satu offtaker luar:{" "}
                {names(ins.groups.map((g) => ({ code: g.code, abrv: g.abrv, title: `${fmtShare(g.share)} lewat ${g.offtakerName} — klik untuk memfilter` })), "OFFTAKER")}
              </>
            ),
        };
      case "KEPASTIAN":
        return {
          key: ins.kind,
          icon: ShieldQuestion,
          caption: "Mill belum pasti",
          value: fmtShare(ins.uncertainShare),
          body: (
            <>
              TBS tanpa PKS pasti; <span className="font-medium text-foreground">{fmtShare(ins.unknownShare)}</span> tak diketahui sama sekali.
              {ins.groups.length > 0 && (
                <>
                  {" "}
                  {formatNumber(ins.groups.length)} Lembaga ≥ {Math.round(ins.threshold * 100)}% tak pasti: {names(ins.groups.map((g) => ({ code: g.code, abrv: g.abrv, title: `${fmtShare(g.share)} tak pasti — klik untuk memfilter` })), "PASTI")}
                </>
              )}
            </>
          ),
        };
      case "JARAK":
        return {
          key: ins.kind,
          icon: Route,
          caption: "Jarak garis lurus",
          value: ins.avgKm == null ? "—" : fmtKm(ins.avgKm),
          body:
            ins.avgKm == null ? (
              <>Tidak ada Lembaga dan Mill yang sama-sama berkoordinat.</>
            ) : (
              <>
                rata-rata Lembaga → Mill tertimbang tonase ({fmtShare(ins.coveredShare)} TBS berkoordinat).
                {ins.farthestMill && (
                  <>
                    {" "}
                    Terjauh:{" "}
                    <Chip onClick={() => onFilterMill(ins.farthestMill!.millId, ins.farthestMill!.name)} title="Klik untuk memfilter Mill ini">
                      <span className="truncate">{ins.farthestMill.name}</span>
                    </Chip>{" "}
                    {fmtKm(ins.farthestMill.avgKm)}.
                  </>
                )}
              </>
            ),
        };
    }
  });

  return (
    <CollapsibleCard
      id="sorotan"
      title={
        <span className="inline-flex items-center gap-1.5">
          <Lightbulb className="h-4 w-4 text-amber-500" /> Sorotan
        </span>
      }
      aside={<span className="text-xs text-muted-foreground">dihitung dari filter aktif · klik nama untuk memfilter</span>}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <div key={t.key} className="rounded-lg border border-border/60 bg-muted/20 p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium">{t.caption}</span>
                <Icon className="h-4 w-4" />
              </div>
              <div className="mt-1 text-xl font-bold tabular-nums">{t.value}</div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t.body}</p>
            </div>
          );
        })}
      </div>
    </CollapsibleCard>
  );
}
