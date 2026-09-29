"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { CalendarRange, ChevronRight, Gauge, Repeat2, Scale } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  SPRINT_CATEGORIES,
  SPRINT_STACK_ORDER,
  carryOvers,
  pendingDecisions,
  planTotals,
  sprintComposition,
  sprintDay,
  sprintPhase,
  sprintProgress,
  sprintStatusPoints,
  sprintVelocity,
  type PendingDecision,
  type Sprint,
  type SprintItemStatus,
  type SprintPhase,
  type SprintPlan,
} from "@/lib/sprint-plan";
import { CATEGORY_COLOR, Inline, fmtDate } from "./sprint-shared";

const fmt1 = (n: number) => n.toFixed(1).replace(".", ",");

/**
 * Isi kolom beban = STATUS, bukan kategori: enam warna kategori tidak lolos
 * validator bila ditumpuk bebas (oranye↔magenta ΔE 12,9 bahkan untuk
 * penglihatan normal), jadi fokus kategori dipindah ke matriks angka di bawah.
 * Warna status = palet status dataviz (good/warning) + biru sekuensial untuk
 * "dikerjakan"; selalu berpasangan dengan label di legenda & tooltip.
 */
const STACK: Record<SprintItemStatus, { label: string; swatch: string; fill: string }> = {
  done: { label: "Selesai", swatch: "bg-[#0ca30c]", fill: "bg-[#0ca30c]" },
  progress: { label: "Dikerjakan", swatch: "bg-[#3987e5]", fill: "bg-[#3987e5]" },
  decision: { label: "Menunggu keputusan", swatch: "bg-[#fab219]", fill: "bg-[#fab219]" },
  todo: { label: "Belum dimulai", swatch: "bg-muted-foreground/25", fill: "bg-muted-foreground/25" },
  moved: {
    label: "Digeser",
    swatch: "border border-dashed border-muted-foreground/60",
    fill: "border border-dashed border-muted-foreground/60 bg-transparent",
  },
};

const PHASE_TAG: Record<SprintPhase, string> = { active: "minggu ini", upcoming: "rencana", past: "selesai" };

function Stat({ icon, label, value, note, tone }: { icon: ReactNode; label: string; value: string; note: ReactNode; tone?: "warn" }) {
  return (
    <Card className="border border-border/60 shadow-sm">
      <CardContent className="flex gap-3 pt-5">
        <span
          aria-hidden
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            tone === "warn" ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" : "bg-primary/10 text-primary"
          )}
        >
          {icon}
        </span>
        <div className="min-w-0 space-y-0.5">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tabular-nums leading-tight">{value}</p>
          <p className="text-xs text-muted-foreground">{note}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Section({ title, subtitle, children, right }: { title: string; subtitle: string; children: ReactNode; right?: ReactNode }) {
  return (
    <Card className="border border-border/60 shadow-sm">
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-2 space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        {right}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {SPRINT_STACK_ORDER.map((s) => (
        <span key={s} className="flex items-center gap-1.5">
          <span aria-hidden className={cn("h-2.5 w-2.5 rounded-sm", STACK[s].swatch)} /> {STACK[s].label}
        </span>
      ))}
    </div>
  );
}

/** Kelipatan 5 terdekat di atas nilai terbesar — skala sumbu yang enak dibaca. */
function niceMax(n: number) {
  return Math.max(5, Math.ceil(n / 5) * 5);
}

const PLOT_H = 200;

/**
 * Linimasa beban: satu kolom per sprint, tinggi = poin komitmen awal (skala
 * sama untuk semua sprint → sprint yang kelebihan beban langsung terlihat),
 * ditumpuk per status. Garis putus = rata-rata velocity (hanya bila ada sprint
 * yang sudah lewat). Tooltip muncul saat hover DAN fokus keyboard; angka yang
 * sama juga ada di label total & matriks, jadi tooltip tidak menjadi satu-satunya jalan.
 */
function LoadTimeline({ plan, today, average }: { plan: SprintPlan; today: string; average: number | null }) {
  const [hover, setHover] = useState<number | null>(null);
  const cols = plan.sprints.map((s) => ({ sprint: s, phase: sprintPhase(s, today), pts: sprintStatusPoints(s) }));
  const totalOf = (p: Record<SprintItemStatus, number>) => SPRINT_STACK_ORDER.reduce((t, k) => t + p[k], 0);
  const yMax = niceMax(Math.max(...cols.map((c) => totalOf(c.pts)), average ?? 0));
  const ticks = [0, yMax / 2, yMax];

  return (
    <div className="space-y-3">
      <Legend />
      <div className="grid grid-cols-[2rem_1fr] gap-2 pt-4">
        {/* Sumbu Y: tiga garis bantu saja, tinta resesif. */}
        <div className="relative" style={{ height: PLOT_H }}>
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2 text-[10px] tabular-nums text-muted-foreground" style={{ bottom: `${(t / yMax) * 100}%` }}>
              {t}
            </span>
          ))}
        </div>
        <div className="relative" style={{ height: PLOT_H }}>
          {ticks.map((t) => (
            <div key={t} aria-hidden className="absolute inset-x-0 border-t border-border/60" style={{ bottom: `${(t / yMax) * 100}%` }} />
          ))}
          {average !== null && (
            <div aria-hidden className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-dashed border-foreground/60" style={{ bottom: `${(average / yMax) * 100}%` }}>
              <span className="absolute -top-5 right-0 rounded bg-background/90 px-1 text-[10px] text-foreground">rata-rata selesai {fmt1(average)}</span>
            </div>
          )}
          <div className="absolute inset-0 grid gap-2" style={{ gridTemplateColumns: `repeat(${cols.length}, minmax(0, 1fr))` }}>
            {cols.map(({ sprint, phase, pts }) => {
              const total = totalOf(pts);
              const segs = SPRINT_STACK_ORDER.filter((k) => pts[k] > 0);
              const aria = `Sprint ${sprint.number}, ${PHASE_TAG[phase]}: ${total} poin — ${segs.map((k) => `${STACK[k].label} ${pts[k]}`).join(", ")}`;
              return (
                <div
                  key={sprint.number}
                  tabIndex={0}
                  role="img"
                  aria-label={aria}
                  onMouseEnter={() => setHover(sprint.number)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(sprint.number)}
                  onBlur={() => setHover(null)}
                  className={cn(
                    "relative flex h-full flex-col justify-end rounded-md px-[18%] outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    phase === "active" && "bg-primary/[0.06]",
                    hover === sprint.number && "bg-muted/60"
                  )}
                >
                  <span className="mb-1 text-center text-xs font-semibold tabular-nums">{total}</span>
                  <div className="flex flex-col-reverse gap-[2px]" style={{ height: `${(total / yMax) * 100}%` }}>
                    {segs.map((k, i) => (
                      <div
                        key={k}
                        className={cn(STACK[k].fill, i === segs.length - 1 && "rounded-t-[4px]")}
                        style={{ flexGrow: pts[k], flexBasis: 0, minHeight: 3 }}
                      />
                    ))}
                  </div>
                  {hover === sprint.number && <ColumnTooltip sprint={sprint} phase={phase} pts={pts} total={total} />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {/* Sumbu X: nomor sprint + tanggal; sprint berjalan ditandai. */}
      <div className="grid grid-cols-[2rem_1fr] gap-2">
        <span />
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols.length}, minmax(0, 1fr))` }}>
          {cols.map(({ sprint, phase }) => (
            <div key={sprint.number} className="text-center leading-tight">
              <p className={cn("text-xs font-medium", phase === "active" && "text-primary")}>Sprint {sprint.number}</p>
              <p className="text-[10px] text-muted-foreground">{fmtDate(sprint.start, false)}</p>
              {phase === "active" && <p className="text-[10px] font-medium text-primary">minggu ini</p>}
            </div>
          ))}
        </div>
      </div>
      {average === null && (
        <p className="text-xs text-muted-foreground">Garis rata-rata velocity muncul setelah sprint pertama selesai — sprint berjalan belum dihitung karena akan menarik rata-rata ke bawah.</p>
      )}
    </div>
  );
}

function ColumnTooltip({ sprint, phase, pts, total }: { sprint: Sprint; phase: SprintPhase; pts: Record<SprintItemStatus, number>; total: number }) {
  return (
    <div role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-56 -translate-x-1/2 rounded-md border bg-popover p-3 text-xs shadow-md">
      <p className="font-medium">
        Sprint {sprint.number} <span className="font-normal text-muted-foreground">· {fmtDate(sprint.start, false)}–{fmtDate(sprint.end, false)} · {PHASE_TAG[phase]}</span>
      </p>
      <p className="mb-2 text-muted-foreground">{sprint.title}</p>
      <ul className="space-y-1">
        {SPRINT_STACK_ORDER.filter((k) => pts[k] > 0).map((k) => (
          <li key={k} className="flex items-center gap-2">
            <span aria-hidden className={cn("h-0.5 w-3", k === "moved" ? "border-t border-dashed border-muted-foreground" : STACK[k].fill)} />
            <span className="font-semibold tabular-nums">{pts[k]}</span>
            <span className="text-muted-foreground">{STACK[k].label}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 border-t pt-1.5 tabular-nums">
        <span className="font-semibold">{total}</span> <span className="text-muted-foreground">poin komitmen</span>
      </p>
    </div>
  );
}

/**
 * Fokus kategori sebagai matriks Kategori × Sprint berisi angka poin. Isi sel
 * = satu hue sekuensial (biru, makin pekat makin besar) — bukan enam warna
 * kategori — sehingga terbaca tanpa membedakan warna; titik kategori di kepala
 * baris hanya penanda identitas yang berlabel.
 */
function FocusMatrix({ plan, today }: { plan: SprintPlan; today: string }) {
  const comp = plan.sprints.map((s) => ({ sprint: s, phase: sprintPhase(s, today), parts: sprintComposition(s) }));
  const maxCell = Math.max(1, ...comp.flatMap((c) => c.parts.map((p) => p.points)));
  const rowTotal = (cat: string) => comp.reduce((t, c) => t + (c.parts.find((p) => p.category === cat)?.points ?? 0), 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-[2px] text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground">
            <th className="py-1 pr-3 text-left font-medium">Kategori</th>
            {comp.map(({ sprint, phase }) => (
              <th key={sprint.number} className={cn("px-1 py-1 text-center font-medium", phase === "active" && "text-primary")}>
                S{sprint.number}
              </th>
            ))}
            <th className="py-1 pl-3 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {SPRINT_CATEGORIES.map((cat) => (
            <tr key={cat}>
              <th scope="row" className="whitespace-nowrap py-1 pr-3 text-left text-xs font-normal">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="h-2 w-2 rounded-full bg-[var(--c-light)] dark:bg-[var(--c-dark)]"
                    style={{ "--c-light": CATEGORY_COLOR[cat].light, "--c-dark": CATEGORY_COLOR[cat].dark } as CSSProperties}
                  />
                  {cat}
                </span>
              </th>
              {comp.map(({ sprint, parts }) => {
                const v = parts.find((p) => p.category === cat)?.points ?? 0;
                return (
                  <td
                    key={sprint.number}
                    title={`Sprint ${sprint.number} · ${cat}: ${v} poin`}
                    className="h-8 min-w-10 rounded text-center text-xs tabular-nums"
                    style={v > 0 ? { backgroundColor: `rgba(57, 135, 229, ${0.12 + (v / maxCell) * 0.5})` } : undefined}
                  >
                    {v > 0 ? <span className="font-medium">{v}</span> : <span className="text-muted-foreground/50">·</span>}
                  </td>
                );
              })}
              <td className="py-1 pl-3 text-right text-xs tabular-nums text-muted-foreground">{rowTotal(cat)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-muted-foreground">
        Baris diurutkan menurut prioritas &quot;risiko prod dulu&quot; — sprint awal sebaiknya berat di baris atas (Keamanan, Rilis).
      </p>
    </div>
  );
}

const DECISION_GROUPS: { phase: SprintPhase; title: string; open: boolean; tone: string }[] = [
  { phase: "past", title: "Terlambat — sprintnya sudah lewat", open: true, tone: "text-amber-700 dark:text-amber-300" },
  { phase: "active", title: "Minggu ini", open: true, tone: "text-foreground" },
  { phase: "upcoming", title: "Sprint mendatang", open: false, tone: "text-foreground" },
];

/** Antrean keputusan owner, dikelompokkan per urgensi — bahan rapat awal minggu. */
function DecisionQueue({ pending }: { pending: PendingDecision[] }) {
  if (pending.length === 0) return <p className="text-sm text-muted-foreground">Tidak ada keputusan yang ditunggu.</p>;
  return (
    <div className="space-y-2">
      {DECISION_GROUPS.map((g) => {
        const rows = pending.filter((d) => d.phase === g.phase);
        if (rows.length === 0) return null;
        const pts = rows.reduce((t, d) => t + d.item.points, 0);
        return (
          <details key={g.phase} open={g.open} className="group rounded-md border">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm [&::-webkit-details-marker]:hidden">
              <ChevronRight aria-hidden className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
              <span className={cn("font-medium", g.tone)}>{g.title}</span>
              <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                {rows.length} butir · {pts} poin
              </span>
            </summary>
            <ul className="divide-y border-t">
              {rows.map((d) => (
                <li key={`${d.sprint}-${d.item.no}`} className="grid gap-1 px-3 py-2 text-sm sm:grid-cols-[3rem_1fr_2.5rem] sm:gap-3">
                  <span className="text-xs tabular-nums text-muted-foreground sm:pt-0.5">Sprint {d.sprint}</span>
                  <div className="min-w-0 space-y-0.5">
                    <p><Inline text={d.item.issue} /></p>
                    <p className="text-xs text-muted-foreground"><Inline text={d.item.decision ?? "—"} /></p>
                  </div>
                  <span className="text-xs tabular-nums sm:pt-0.5 sm:text-right">{d.item.points} poin</span>
                </li>
              ))}
            </ul>
          </details>
        );
      })}
    </div>
  );
}

export function SprintAnalysis({ plan, today }: { plan: SprintPlan; today: string }) {
  const velocity = sprintVelocity(plan, today);
  const pending = pendingDecisions(plan, today);
  const carry = carryOvers(plan);
  const totals = planTotals(plan);
  const overdue = pending.filter((d) => d.phase === "past").length;
  const thisWeek = pending.filter((d) => d.phase === "active").length;
  const active = plan.sprints.find((s) => sprintPhase(s, today) === "active");
  const activeProgress = active ? sprintProgress(active) : null;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={<CalendarRange className="h-4 w-4" />}
          label="Rencana"
          value={`${totals.points} poin`}
          note={totals.end ? `${totals.sprints} sprint · sampai ${fmtDate(totals.end)}` : "belum ada sprint"}
        />
        <Stat
          icon={<Scale className="h-4 w-4" />}
          tone={pending.length > 0 ? "warn" : undefined}
          label="Tertahan keputusan owner"
          value={`${totals.pendingPoints} poin`}
          note={
            pending.length === 0
              ? "tidak ada yang menunggu"
              : `${Math.round(totals.pendingShare * 100)}% rencana · ${overdue > 0 ? `${overdue} terlambat · ` : ""}${thisWeek} minggu ini`
          }
        />
        <Stat
          icon={<Gauge className="h-4 w-4" />}
          label="Velocity rata-rata"
          value={velocity.average === null ? "—" : `${fmt1(velocity.average)} poin`}
          note={
            velocity.average !== null
              ? "per minggu, dari sprint yang sudah selesai"
              : active && activeProgress
                ? `Sprint ${active.number} berjalan: ${activeProgress.donePoints}/${activeProgress.totalPoints} poin, hari ke-${sprintDay(active, today)}`
                : "belum ada sprint yang selesai"
          }
        />
        <Stat
          icon={<Repeat2 className="h-4 w-4" />}
          tone={carry.some((c) => c.movedFrom.length > 1) ? "warn" : undefined}
          label="Carry-over"
          value={`${carry.length} butir`}
          note={carry.length === 0 ? "belum ada butir yang digeser" : "pindah sprint minimal sekali"}
        />
      </div>

      <Section
        title="Beban & kemajuan per sprint"
        subtitle="Tinggi kolom = poin komitmen awal; isinya menurut status. Arahkan kursor atau Tab ke kolom untuk rinciannya."
      >
        <LoadTimeline plan={plan} today={today} average={velocity.average} />
      </Section>

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <Section title="Keputusan menunggu owner" subtitle="Semua butir ⚖️ yang belum diputuskan, dikelompokkan per urgensi.">
          <DecisionQueue pending={pending} />
        </Section>
        <Section title="Fokus per kategori" subtitle="Poin per kategori di tiap sprint — apakah prioritas benar-benar dijalankan.">
          <FocusMatrix plan={plan} today={today} />
        </Section>
      </div>

      {carry.length > 0 && (
        <Section title="Carry-over" subtitle="Butir yang pindah sprint. Digeser berulang = estimasi terlalu optimis atau ada penghambat.">
          <ul className="divide-y text-sm">
            {carry.map((c) => (
              <li key={c.issue} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2">
                <span className="min-w-0 flex-1"><Inline text={c.issue} /></span>
                <span className="text-xs text-muted-foreground">
                  Sprint {c.movedFrom.join(", ")} → {c.destination === null ? "belum dijadwalkan" : `Sprint ${c.destination}`}
                </span>
                <span className={cn("text-xs tabular-nums", c.movedFrom.length > 1 && "font-semibold text-amber-700 dark:text-amber-300")}>
                  {c.movedFrom.length}×
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
