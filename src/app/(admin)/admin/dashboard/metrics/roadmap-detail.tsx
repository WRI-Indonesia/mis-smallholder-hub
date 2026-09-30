"use client";

import { ChevronRight } from "lucide-react";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { StatTooltipContent } from "@/components/shared/stat-tooltip";
import { groupRemainingByHorizon } from "@/lib/roadmap";
import { cn } from "@/lib/utils";
import type { PhaseHorizon, RoadmapPhase, RoadmapSummary } from "@/types/roadmap";
import { PHASE_STATUS, fmt2, fmtInt, fmtPct1, fmtPoints, phaseStatusColor, docUrl } from "./metrics-shared";

/**
 * Section Detail Roadmap (#250) — pembuktian angka "Progres roadmap" yang di
 * kartu KPI hanya satu persen. Sumber: `docs/project/roadmap.md` diparse saat
 * build (`src/lib/roadmap.ts`), jadi tidak ada angka yang diketik ulang di sini.
 *
 * Bentuknya sengaja bukan kanvas graf: data ini tidak punya relasi antar fase,
 * yang ditanyakan pembaca adalah "dari mana angka Roadmap %" (rincian angka),
 * "sisanya menumpuk di mana" (part-to-whole per stream), dan "kapan sisanya
 * dijadwalkan" (blok per horizon, #392 — menggantikan peringkat pp yang tak
 * bermakna saat hampir semua fase belum mulai), bukan node/edge.
 */

type StatusKey = keyof typeof PHASE_STATUS;

const statusKey = (p: RoadmapPhase): StatusKey =>
  p.status === "Done" ? "done" : p.status === "Partial" ? "partial" : "open";

/**
 * Cadangan judul blok bila tabel Horizon Definition tak mencatat periodenya.
 * Urutan & pengelompokan blok ada di `groupRemainingByHorizon` (lib, ber-test).
 */
const HORIZON_NOTE: Record<PhaseHorizon, string> = {
  Done: "sudah selesai",
  Now: "sedang dikerjakan",
  Next: "antrean berikutnya",
  Later: "paruh akhir horizon roadmap",
  Blocked: "terhambat prasyarat",
};

/** Baris tooltip dengan chip warna hex (StatTooltipRow hanya menerima kelas Tailwind). */
function PhaseTooltipRow({ color, label, value }: { color?: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      {color && <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />}
      <span className={cn("text-background/75", !color && "pl-[18px]")}>{label}</span>
      <span className="ml-auto pl-4 font-semibold tabular-nums">{value}</span>
    </div>
  );
}

/** Kotak angka pada blok rincian hitung — komponen, nilai, lalu hasilnya. */
function TallyBox({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-medium tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">{sub}</p>
    </div>
  );
}

export function RoadmapDetail({ summary, dark }: { summary: RoadmapSummary; dark: boolean }) {
  const { streams, remaining } = summary;
  // Skala absolut: strip terpanjang = stream dengan bobot maksimum terbesar.
  // Bukan 100% per stream — panjang batang harus mencerminkan berapa besar
  // porsi stream itu pada penyebut total poin, bukan sekadar persen internalnya.
  const maxStreamPoints = Math.max(...streams.map((s) => s.maxPoints));
  const gapPp = 100 - summary.pct;
  const groups = groupRemainingByHorizon(summary);

  return (
    <div className="space-y-6 px-6 pb-6">
      {/* 1. Rincian hitung % — kartu KPI jadi punya "kenapa segitu" */}
      <section>
        <h3 className="text-sm font-medium">Dari mana angkanya</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Poin satu fase = skor status (✅ 1 · 🟠 0,5 · lainnya 0) × bobotnya (inti 2 · pendukung 1). Roadmap % = total
          poin diperoleh ÷ total poin maksimum.
        </p>
        <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3">
          <TallyBox
            label="Fase inti (×2)"
            value={`${fmtPoints(summary.coreEarned)} / ${fmtInt(summary.coreMax)}`}
            sub={`${fmtInt(summary.coreCount)} fase komitmen roadmap`}
          />
          <TallyBox
            label="Fase pendukung (×1)"
            value={`${fmtPoints(summary.supportEarned)} / ${fmtInt(summary.supportMax)}`}
            sub={`${fmtInt(summary.supportCount)} fase pelengkap`}
          />
          <TallyBox
            label="Total poin"
            value={`${fmtPoints(summary.earned)} / ${fmtInt(summary.max)}`}
            sub={`${fmtInt(summary.total)} fase pada ${fmtInt(streams.length)} stream`}
          />
          <div className="rounded-lg border border-primary/40 bg-primary/5 p-3">
            <p className="text-xs text-muted-foreground">Roadmap</p>
            <p className="mt-0.5 text-lg font-medium tabular-nums">{fmtPct1(summary.pct)}</p>
            <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">sisa {fmt2(gapPp)} pp menuju target roadmap</p>
          </div>
        </div>
      </section>

      {/* 2. Strip per stream — satu sel = satu fase, lebar ∝ bobot */}
      <section>
        <h3 className="text-sm font-medium">Sebaran per stream</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Satu kotak = satu fase; lebarnya mengikuti bobot (inti dua kali pendukung), panjang baris mengikuti porsi
          stream itu pada total {fmtInt(summary.max)} poin. Arahkan kursor ke kotak untuk melihat fasenya.
        </p>
        <div className="mt-3 space-y-2.5">
          {streams.map((s) => {
            const phases = summary.phases.filter((p) => p.stream === s.stream);
            return (
              <div key={s.stream}>
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="truncate">
                    <span className="font-medium">{s.stream}</span>
                    <span className="text-muted-foreground"> · {s.label}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {fmtPoints(s.points)}/{fmtInt(s.maxPoints)} poin · {fmtInt(s.done)} selesai
                    {s.partial > 0 && ` · ${fmtInt(s.partial)} sebagian`}
                    {s.open > 0 && ` · ${fmtInt(s.open)} belum`}
                  </span>
                </div>
                <div
                  className="mt-1 flex gap-[2px]"
                  style={{ width: `${(s.maxPoints / maxStreamPoints) * 100}%` }}
                  role="img"
                  aria-label={`${s.stream} ${s.label}: ${fmtInt(s.done)} selesai, ${fmtInt(s.partial)} sebagian, ${fmtInt(s.open)} belum dari ${fmtInt(s.total)} fase — ${fmtPoints(s.points)} dari ${fmtInt(s.maxPoints)} poin`}
                >
                  {phases.map((p) => {
                    const key = statusKey(p);
                    return (
                      <Tooltip key={p.key}>
                        <TooltipTrigger
                          render={
                            <div
                              className="h-3.5 rounded-[3px]"
                              style={{
                                flex: `${p.maxPoints} 1 0%`,
                                backgroundColor: phaseStatusColor(key, dark),
                              }}
                            />
                          }
                        />
                        <StatTooltipContent title={`${p.key} · ${p.description}`} subtitle={s.label}>
                          <PhaseTooltipRow
                            color={phaseStatusColor(key, dark)}
                            label="Status"
                            value={`${p.statusIcon} ${p.status}`}
                          />
                          <PhaseTooltipRow
                            label="Bobot"
                            value={`${p.weight} ×${fmtInt(p.maxPoints)}`}
                          />
                          <PhaseTooltipRow
                            label="Poin"
                            value={`${fmtPoints(p.points)} dari ${fmtInt(p.maxPoints)}`}
                          />
                          {p.status !== "Done" && (
                            <PhaseTooltipRow
                              label="Bila selesai"
                              value={`+${fmt2(((p.maxPoints - p.points) / summary.max) * 100)} pp`}
                            />
                          )}
                        </StatTooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {(Object.keys(PHASE_STATUS) as StatusKey[]).map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-5 rounded-[3px]"
                style={{ backgroundColor: phaseStatusColor(k, dark) }}
              />
              {PHASE_STATUS[k].label}
            </span>
          ))}
        </div>
      </section>

      {/* 3. Sisa fase roadmap — satu blok per horizon (periode dari roadmap.md) */}
      <section>
        <h3 className="text-sm font-medium">Sisa fase roadmap</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {fmtInt(remaining.length)} fase yang belum ✅, dikelompokkan menurut kapan dijadwalkan. Di tiap kelompok, fase
          inti tampil dulu. Klik satu baris untuk melihat apa yang sudah ada dan langkah berikutnya.
        </p>
        <div className="mt-3 space-y-3">
          {groups.map((g) => (
            <div key={g.horizon} className="overflow-hidden rounded-lg border border-border/60">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 bg-muted/40 px-3 py-2">
                <p className="text-sm">
                  <span className="font-medium">{g.horizon}</span>
                  <span className="text-muted-foreground"> · {g.label ?? HORIZON_NOTE[g.horizon]}</span>
                </p>
                <p className="text-xs tabular-nums text-muted-foreground">
                  {fmtInt(g.items.length)} fase · {fmtPoints(g.openPoints)} poin terbuka · +{fmt2(g.gainPp)} pp bila tuntas
                </p>
              </div>
              <ul className="divide-y divide-border/40">
                {g.items.map(({ phase: p, gainPp }) => (
                  <li key={p.key}>
                    <details className="group">
                      {/* < sm: 3 kolom, bobot+pp turun ke baris kedua di bawah deskripsi —
                          4 kolom nowrap menyisakan ±40px untuk deskripsi di layar ponsel. */}
                      <summary className="grid cursor-pointer list-none grid-cols-[1rem_auto_1fr] items-baseline gap-x-3 gap-y-0.5 px-3 py-2 text-sm hover:bg-muted/30 focus-visible:outline-2 focus-visible:outline-ring sm:grid-cols-[1rem_minmax(7.5rem,auto)_1fr_auto] [&::-webkit-details-marker]:hidden">
                        <ChevronRight
                          className="h-3.5 w-3.5 self-center text-muted-foreground transition-transform group-open:rotate-90"
                          aria-hidden
                        />
                        <span className="whitespace-nowrap font-medium">
                          <span className="mr-1.5" aria-hidden>
                            {p.statusIcon}
                          </span>
                          {p.key}
                          <span className="sr-only"> — {p.status}</span>
                        </span>
                        <span className="leading-snug">{p.description}</span>
                        <span className="col-start-3 whitespace-nowrap text-xs tabular-nums text-muted-foreground sm:col-start-auto sm:text-right">
                          {p.weight} ×{fmtInt(p.maxPoints)} · +{fmt2(gainPp)} pp
                        </span>
                      </summary>
                      <div className="space-y-1 pb-3 pl-[calc(1rem+0.75rem+0.75rem)] pr-3 text-xs leading-snug text-muted-foreground">
                        {p.evidence && (
                          <p>
                            <span className="font-medium text-foreground/80">Sudah ada:</span> {p.evidence}
                          </p>
                        )}
                        {p.nextStep && (
                          <p>
                            <span className="font-medium text-foreground/80">Langkah berikutnya:</span> {p.nextStep}
                          </p>
                        )}
                      </div>
                    </details>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Sumber & rincian lengkap tiap fase:{" "}
          <a
            href={docUrl("docs/project/roadmap.md")}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline-offset-2 hover:underline dark:text-amber-400"
          >
            docs/project/roadmap.md
          </a>{" "}
          — angka di section ini dihitung ulang dari tabel Phase Status saat build, bukan diketik manual.
        </p>
      </section>
    </div>
  );
}
