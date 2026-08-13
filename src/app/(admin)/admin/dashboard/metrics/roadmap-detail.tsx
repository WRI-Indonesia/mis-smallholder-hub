"use client";

import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { StatTooltipContent } from "@/components/shared/stat-tooltip";
import { cn } from "@/lib/utils";
import type { PhaseHorizon, RoadmapPhase, RoadmapSummary } from "@/types/roadmap";
import { PHASE_STATUS, fmt2, fmtInt, fmtPct1, fmtPoints, phaseStatusColor, REPO_URL } from "./metrics-shared";

/**
 * Section Detail Roadmap (#250) — pembuktian angka "Progres roadmap" yang di
 * kartu KPI hanya satu persen. Sumber: `docs/project/roadmap.md` diparse saat
 * build (`src/lib/roadmap.ts`), jadi tidak ada angka yang diketik ulang di sini.
 *
 * Bentuknya sengaja bukan kanvas graf: data ini tidak punya relasi antar fase,
 * yang ditanyakan pembaca adalah "dari mana 87,1%" (rincian angka), "sisanya
 * menumpuk di mana" (part-to-whole per stream), dan "mana yang paling
 * menggerakkan jarum" (peringkat pp) — tiga pekerjaan yang dilayani bar unit +
 * tabel, bukan node/edge.
 */

type StatusKey = keyof typeof PHASE_STATUS;

const statusKey = (p: RoadmapPhase): StatusKey =>
  p.status === "Done" ? "done" : p.status === "Partial" ? "partial" : "open";

/**
 * Urutan tampil horizon pada blok "Sisa menuju 1.0" — paling dekat dulu.
 * Bukan daftar penyaring: horizon apa pun yang muncul di data tetap ditampilkan
 * (termasuk "Done" pada baris ber-status Partial, yang sah menurut parser).
 * Kalau ia dipakai menyaring, chip-nya berhenti menjumlah angka gap tepat di
 * atasnya — tanpa tanda apa pun.
 */
const HORIZON_ORDER: PhaseHorizon[] = ["Now", "Next", "Later", "Blocked", "Done"];

const HORIZON_NOTE: Record<PhaseHorizon, string> = {
  Done: "sudah selesai",
  Now: "sedang dikerjakan",
  Next: "antrean berikutnya",
  Later: "sesudah go-live 1.0",
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
  // porsi stream itu pada penyebut 85 poin, bukan sekadar persen internalnya.
  const maxStreamPoints = Math.max(...streams.map((s) => s.maxPoints));
  const gapPp = 100 - summary.pct;

  const horizons = [
    ...HORIZON_ORDER,
    ...remaining.map((r) => r.phase.horizon).filter((h) => !HORIZON_ORDER.includes(h)),
  ];
  const byHorizon = [...new Set(horizons)]
    .map((horizon) => {
      const items = remaining.filter((r) => r.phase.horizon === horizon);
      return { horizon, count: items.length, pp: items.reduce((acc, r) => acc + r.gainPp, 0) };
    })
    .filter((h) => h.count > 0);

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
            sub={`${fmtInt(summary.coreCount)} fase penentu go-live`}
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
            <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">sisa {fmt2(gapPp)} pp menuju 1.0</p>
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

      {/* 3 & 4. Sisa menuju 1.0 — pengelompokan horizon lalu peringkat pp */}
      <section>
        <h3 className="text-sm font-medium">Sisa menuju 1.0</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Isi dari gap {fmt2(gapPp)} pp: {fmtInt(remaining.length)} fase yang belum ✅. Kolom terakhir = tambahan
          Roadmap % bila fase itu selesai penuh — urut dari yang paling menggerakkan jarum.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {byHorizon.map((h) => (
            <span
              key={h.horizon}
              className="rounded-md border border-border/60 bg-muted/30 px-2.5 py-1 text-xs tabular-nums"
              title={HORIZON_NOTE[h.horizon]}
            >
              <span className="font-medium">{h.horizon}</span>
              <span className="text-muted-foreground">
                {" "}
                · {fmtInt(h.count)} fase · +{fmt2(h.pp)} pp
              </span>
            </span>
          ))}
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Fase</th>
                <th className="py-2 pr-3 font-medium">Deskripsi</th>
                <th className="py-2 pr-3 font-medium">Bobot</th>
                <th className="py-2 pr-3 font-medium">Horizon</th>
                <th className="py-2 text-right font-medium">Bila selesai</th>
              </tr>
            </thead>
            <tbody>
              {remaining.map(({ phase: p, gainPp }) => (
                <tr key={p.key} className="border-b border-border/40 align-top last:border-0">
                  <td className="whitespace-nowrap py-2 pr-3 font-medium">
                    <span className="mr-1.5" aria-hidden>
                      {p.statusIcon}
                    </span>
                    {p.key}
                    <span className="sr-only"> — {p.status}</span>
                  </td>
                  <td className="py-2 pr-3">
                    <span className="leading-snug">{p.description}</span>
                    {p.evidence && (
                      <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                        Sudah ada: {p.evidence}
                      </span>
                    )}
                    {p.nextStep && (
                      <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                        Langkah berikutnya: {p.nextStep}
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap py-2 pr-3 text-xs text-muted-foreground">
                    {p.weight} ×{fmtInt(p.maxPoints)}
                  </td>
                  <td className="whitespace-nowrap py-2 pr-3 text-xs text-muted-foreground" title={HORIZON_NOTE[p.horizon]}>
                    {p.horizon}
                  </td>
                  <td className="whitespace-nowrap py-2 text-right tabular-nums">+{fmt2(gainPp)} pp</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Sumber & rincian lengkap tiap fase:{" "}
          <a
            href={`${REPO_URL}/blob/mvp/docs/project/roadmap.md`}
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
