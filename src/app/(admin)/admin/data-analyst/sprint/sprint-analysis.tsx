"use client";

import type { CSSProperties, ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  SPRINT_CATEGORIES,
  carryOvers,
  pendingDecisions,
  sprintComposition,
  sprintVelocity,
  type SprintPhase,
  type SprintPlan,
} from "@/lib/sprint-plan";
import { CATEGORY_COLOR, Inline } from "./sprint-shared";

const PHASE_SHORT: Record<SprintPhase, string> = { active: "berjalan", upcoming: "rencana", past: "selesai" };
const PHASE_DECISION: Record<SprintPhase, string> = { active: "minggu ini", upcoming: "mendatang", past: "terlambat" };

/** Warna kategori sebagai variabel CSS light/dark — satu elemen, dua mode. */
const catVars = (c: (typeof SPRINT_CATEGORIES)[number]) =>
  ({ "--c-light": CATEGORY_COLOR[c].light, "--c-dark": CATEGORY_COLOR[c].dark }) as CSSProperties;
const CAT_BG = "bg-[var(--c-light)] dark:bg-[var(--c-dark)]";

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <Card className="border border-border/60 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <Card className="border border-border/60 shadow-sm">
      <CardContent className="space-y-1 pt-5">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{note}</p>
      </CardContent>
    </Card>
  );
}

/**
 * Velocity: dua batang horizontal per sprint (rencana = netral, selesai =
 * slot 1) dengan label angka langsung — sedikit batang, jadi angka di setiap
 * batang tetap terbaca tanpa hover.
 */
function VelocityChart({ rows, average }: ReturnType<typeof sprintVelocity>) {
  const max = Math.max(1, ...rows.map((r) => r.planned));
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-muted-foreground/30" /> Komitmen awal (termasuk yang kemudian digeser)</span>
        <span className="flex items-center gap-1.5"><span className={cn("h-2.5 w-2.5 rounded-sm", CAT_BG)} style={catVars("Keamanan")} /> Selesai</span>
        {average !== null && <span>Garis putus = rata-rata selesai ({average.toFixed(1).replace(".", ",")} poin)</span>}
      </div>
      <div className="relative space-y-3">
        {rows.map((r) => (
          <div key={r.number} className="grid grid-cols-[6.5rem_1fr] items-center gap-3">
            <span className="text-xs">
              <span className="font-medium">Sprint {r.number}</span>
              <span className="text-muted-foreground"> · {PHASE_SHORT[r.phase]}</span>
            </span>
            <div className="relative space-y-0.5">
              {[
                { v: r.planned, cls: "bg-muted-foreground/30", style: undefined, label: r.moved > 0 ? `direncanakan (${r.moved} poin kemudian digeser)` : "direncanakan" },
                { v: r.done, cls: CAT_BG, style: catVars("Keamanan"), label: "selesai" },
              ].map((b) => (
                <div key={b.label} className="flex items-center gap-2" title={`Sprint ${r.number}: ${b.v} poin ${b.label}`}>
                  <div className="h-3 rounded-r-[4px]" style={{ width: `${(b.v / max) * 85}%`, minWidth: b.v > 0 ? 4 : 0 }}>
                    <div className={cn("h-full w-full rounded-r-[4px]", b.cls)} style={b.style} />
                  </div>
                  <span className="text-xs tabular-nums text-muted-foreground">{b.v}</span>
                </div>
              ))}
              {average !== null && (
                <div aria-hidden className="pointer-events-none absolute inset-y-0 border-l border-dashed border-foreground/50" style={{ left: `${(average / max) * 85}%` }} />
              )}
            </div>
          </div>
        ))}
      </div>
      {average === null && (
        <p className="text-xs text-muted-foreground">Rata-rata velocity muncul setelah sprint pertama selesai — sprint berjalan belum dihitung karena akan menarik rata-rata ke bawah.</p>
      )}
    </div>
  );
}

/** Komposisi fokus: satu batang bertumpuk 100% per sprint, celah 2px antar segmen. */
function CompositionChart({ plan }: { plan: SprintPlan }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {SPRINT_CATEGORIES.map((c) => (
          <span key={c} className="flex items-center gap-1.5">
            <span className={cn("h-2.5 w-2.5 rounded-sm", CAT_BG)} style={catVars(c)} /> {c}
          </span>
        ))}
      </div>
      {plan.sprints.map((s) => {
        const parts = sprintComposition(s).filter((p) => p.points > 0);
        const total = parts.reduce((t, p) => t + p.points, 0);
        return (
          <div key={s.number} className="grid grid-cols-[6.5rem_1fr] items-start gap-3">
            <span className="pt-0.5 text-xs font-medium">Sprint {s.number}</span>
            <div className="space-y-1">
              <div className="flex h-4 gap-[2px]" role="img" aria-label={`Sprint ${s.number}: ${parts.map((p) => `${p.category} ${p.points} poin`).join(", ")}`}>
                {parts.map((p, i) => (
                  <div
                    key={p.category}
                    title={`${p.category}: ${p.points} poin (${Math.round((p.points / total) * 100)}%)`}
                    className={cn(CAT_BG, i === 0 && "rounded-l-[4px]", i === parts.length - 1 && "rounded-r-[4px]")}
                    style={{ width: `${(p.points / total) * 100}%`, ...catVars(p.category) }}
                  />
                ))}
              </div>
              {/* Angka di teks bertinta netral, bukan di dalam batang: slot terang (kuning, aqua, magenta) tak cukup kontras untuk label. */}
              <p className="text-xs tabular-nums text-muted-foreground">
                {parts.map((p) => `${p.category} ${p.points}`).join(" · ")} · total {total} poin
              </p>
            </div>
          </div>
        );
      })}
      <p className="text-xs text-muted-foreground">Urutan warna = urutan prioritas &quot;risiko prod dulu&quot;: sprint awal sebaiknya didominasi Keamanan &amp; Rilis.</p>
    </div>
  );
}

export function SprintAnalysis({ plan, today }: { plan: SprintPlan; today: string }) {
  const velocity = sprintVelocity(plan, today);
  const pending = pendingDecisions(plan, today);
  const carry = carryOvers(plan);
  const pendingPoints = pending.reduce((s, d) => s + d.item.points, 0);
  const overdue = pending.filter((d) => d.phase === "past").length;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="Velocity rata-rata"
          value={velocity.average === null ? "—" : `${velocity.average.toFixed(1).replace(".", ",")} poin`}
          note={velocity.average === null ? "belum ada sprint yang selesai" : "per minggu, dari sprint yang sudah selesai"}
        />
        <Stat
          label="Tertahan keputusan owner"
          value={`${pendingPoints} poin`}
          note={overdue > 0 ? `${pending.length} butir · ${overdue} terlambat dari sprint yang sudah lewat` : `${pending.length} butir menunggu keputusan`}
        />
        <Stat label="Butir digeser" value={String(carry.length)} note={carry.length === 0 ? "belum ada carry-over" : "issue yang pindah sprint minimal sekali"} />
      </div>

      <Section title="Velocity per sprint" subtitle="Poin komitmen awal vs selesai. Butir yang digeser tetap dihitung di komitmen sprint asalnya, jadi selisihnya terlihat.">
        <VelocityChart {...velocity} />
      </Section>

      <Section title="Komposisi fokus" subtitle="Porsi poin per kategori di tiap sprint — apakah prioritas benar-benar dijalankan.">
        <CompositionChart plan={plan} />
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Keputusan tertunda" subtitle="Semua butir ⚖️ yang belum diputuskan, termasuk yang terlambat dari sprint lalu — bahan rapat owner.">
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">Tidak ada keputusan yang ditunggu.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-1.5 pr-2 font-medium">Sprint</th>
                  <th className="py-1.5 pr-2 font-medium">Issue</th>
                  <th className="py-1.5 pr-2 font-medium">Keputusan</th>
                  <th className="py-1.5 text-right font-medium">Poin</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((d) => (
                  <tr key={`${d.sprint}-${d.item.no}`} className="border-b align-top last:border-0">
                    <td className={cn("py-1.5 pr-2 tabular-nums", d.phase === "past" && "font-semibold text-amber-700 dark:text-amber-300")}>
                      {d.sprint} <span className="text-xs font-normal text-muted-foreground">· {PHASE_DECISION[d.phase]}</span>
                    </td>
                    <td className="py-1.5 pr-2"><Inline text={d.item.issue} /></td>
                    <td className="py-1.5 pr-2 text-muted-foreground"><Inline text={d.item.decision ?? "—"} /></td>
                    <td className="py-1.5 text-right tabular-nums">{d.item.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        <Section title="Carry-over" subtitle="Butir yang pindah sprint. Digeser berulang = estimasi terlalu optimis atau ada penghambat.">
          {carry.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada butir yang digeser.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-1.5 pr-2 font-medium">Issue</th>
                  <th className="py-1.5 pr-2 font-medium">Digeser dari → ke</th>
                  <th className="py-1.5 text-right font-medium">Kali</th>
                </tr>
              </thead>
              <tbody>
                {carry.map((c) => (
                  <tr key={c.issue} className="border-b align-top last:border-0">
                    <td className="py-1.5 pr-2"><Inline text={c.issue} /></td>
                    <td className="py-1.5 pr-2 text-muted-foreground">
                      Sprint {c.movedFrom.join(", ")} → {c.destination === null ? "belum dijadwalkan" : `Sprint ${c.destination}`}
                    </td>
                    <td className={cn("py-1.5 text-right tabular-nums", c.movedFrom.length > 1 && "font-semibold text-amber-700 dark:text-amber-300")}>{c.movedFrom.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
      </div>
    </div>
  );
}
