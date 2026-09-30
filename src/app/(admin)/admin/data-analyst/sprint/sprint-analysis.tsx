"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { CalendarRange, ChevronRight, Gauge, Repeat2, Scale } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  PLAN_CATEGORIES,
  PLAN_STACK_ORDER,
  PLAN_STATUS_LABEL,
  carryOvers,
  pendingDecisions,
  planTotals,
  releaseComposition,
  releasePhase,
  releaseProgress,
  releaseStatusPoints,
  releaseTimeline,
  releaseVelocity,
  type PendingDecision,
  type PlanItemStatus,
  type Release,
  type ReleasePhase,
  type ReleasePlan,
} from "@/lib/release-plan";
import { CATEGORY_COLOR, Inline, fmtDate } from "./sprint-shared";

const fmt1 = (n: number) => n.toFixed(1).replace(".", ",");

/**
 * Isi kolom beban = STATUS, bukan kategori: enam warna kategori tidak lolos
 * validator bila ditumpuk bebas (oranye↔magenta ΔE 12,9 bahkan untuk
 * penglihatan normal), jadi fokus kategori dipindah ke matriks angka di bawah.
 * Warna status = palet status dataviz (good/warning) + biru sekuensial untuk
 * "dikerjakan"; selalu berpasangan dengan label di legenda & tooltip.
 */
const STACK: Record<PlanItemStatus, { label: string; swatch: string; fill: string }> = {
  done: { label: PLAN_STATUS_LABEL.done, swatch: "bg-[#0ca30c]", fill: "bg-[#0ca30c]" },
  progress: { label: PLAN_STATUS_LABEL.progress, swatch: "bg-[#3987e5]", fill: "bg-[#3987e5]" },
  decision: { label: PLAN_STATUS_LABEL.decision, swatch: "bg-[#fab219]", fill: "bg-[#fab219]" },
  todo: { label: PLAN_STATUS_LABEL.todo, swatch: "bg-muted-foreground/25", fill: "bg-muted-foreground/25" },
  moved: {
    label: PLAN_STATUS_LABEL.moved,
    swatch: "border border-dashed border-muted-foreground/60",
    fill: "border border-dashed border-muted-foreground/60 bg-transparent",
  },
};

const PHASE_TAG: Record<ReleasePhase, string> = { active: "berjalan", upcoming: "rencana", past: "lewat target" };

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
      {PLAN_STACK_ORDER.map((s) => (
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
 * Linimasa beban: satu kolom per rilis, tinggi = poin komitmen awal (skala
 * sama untuk semua rilis), ditumpuk per status. Penanda putus per kolom =
 * KAPASITAS perkiraan rilis itu (velocity poin/minggu × panjang rilis dalam
 * minggu) — rilis yang batangnya jauh di atas penandanya kelebihan beban.
 * Bukan satu garis rata-rata: panjang rilis berbeda-beda. Tooltip muncul saat
 * hover DAN fokus keyboard; angka yang sama ada di label total & matriks.
 */
function LoadTimeline({ plan, today, average }: { plan: ReleasePlan; today: string; average: number | null }) {
  const [hover, setHover] = useState<string | null>(null);
  const cols = plan.releases.map((r) => ({
    release: r,
    phase: releasePhase(r, today),
    pts: releaseStatusPoints(r),
    capacity: average === null ? null : average * (releaseTimeline(r, today).days / 7),
  }));
  const totalOf = (p: Record<PlanItemStatus, number>) => PLAN_STACK_ORDER.reduce((t, k) => t + p[k], 0);
  const yMax = niceMax(Math.max(...cols.map((c) => Math.max(totalOf(c.pts), c.capacity ?? 0))));
  const ticks = [0, yMax / 2, yMax];

  return (
    <div className="space-y-3">
      <Legend />
      <div className="grid grid-cols-[2rem_1fr] gap-2 pt-4">
        {/* Sumbu Y: tiga garis bantu saja, tinta resesif. */}
        <div className="relative" style={{ height: PLOT_H }}>
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2 text-[10px] tabular-nums text-muted-foreground" style={{ bottom: `${(t / yMax) * 100}%` }}>
              {Number.isInteger(t) ? t : fmt1(t)}
            </span>
          ))}
        </div>
        <div className="relative" style={{ height: PLOT_H }}>
          {ticks.map((t) => (
            <div key={t} aria-hidden className="absolute inset-x-0 border-t border-border/60" style={{ bottom: `${(t / yMax) * 100}%` }} />
          ))}
          <div className="absolute inset-0 grid gap-2" style={{ gridTemplateColumns: `repeat(${cols.length}, minmax(0, 1fr))` }}>
            {cols.map(({ release, phase, pts, capacity }, idx) => {
              const total = totalOf(pts);
              const segs = PLAN_STACK_ORDER.filter((k) => pts[k] > 0);
              const aria = `Rilis ${release.version}, ${PHASE_TAG[phase]}: ${total} poin${capacity === null ? "" : `, kapasitas ±${fmt1(capacity)}`} — ${segs.map((k) => `${STACK[k].label} ${pts[k]}`).join(", ")}`;
              return (
                <div
                  key={release.version}
                  tabIndex={0}
                  role="img"
                  aria-label={aria}
                  onMouseEnter={() => setHover(release.version)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(release.version)}
                  onBlur={() => setHover(null)}
                  className={cn(
                    "relative flex h-full flex-col justify-end rounded-md px-[18%] outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    phase === "active" && "bg-primary/[0.06]",
                    hover === release.version && "bg-muted/60"
                  )}
                >
                  {/* Label total di luar alur flex (absolute): bila ikut, batang setinggi
                      yMax menyusut ±10% dan tak lagi sejajar sumbu Y. */}
                  <div className="relative flex shrink-0 flex-col-reverse gap-[2px]" style={{ height: `${(total / yMax) * 100}%` }}>
                    <span className="absolute inset-x-0 bottom-full mb-1 text-center text-xs font-semibold tabular-nums">{total}</span>
                    {segs.map((k, i) => (
                      <div
                        key={k}
                        className={cn(STACK[k].fill, i === segs.length - 1 && "rounded-t-[4px]")}
                        style={{ flexGrow: pts[k], flexBasis: 0, minHeight: 3 }}
                      />
                    ))}
                  </div>
                  {capacity !== null && (
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-x-[8%] z-10 border-t-2 border-dashed border-foreground/60"
                      style={{ bottom: `${(capacity / yMax) * 100}%` }}
                    />
                  )}
                  {hover === release.version && (
                    <ColumnTooltip
                      release={release}
                      phase={phase}
                      pts={pts}
                      total={total}
                      capacity={capacity}
                      side={idx < cols.length / 2 ? "right" : "left"}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {/* Sumbu X: versi + target; rilis berjalan ditandai. */}
      <div className="grid grid-cols-[2rem_1fr] gap-2">
        <span />
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols.length}, minmax(0, 1fr))` }}>
          {cols.map(({ release, phase }) => (
            <div key={release.version} className="text-center leading-tight">
              <p className={cn("text-xs font-medium", phase === "active" && "text-primary")}>{release.version}</p>
              <p className="text-[10px] text-muted-foreground">target {fmtDate(release.end, false)}</p>
              {phase === "active" && <p className="text-[10px] font-medium text-primary">berjalan</p>}
            </div>
          ))}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {average === null
          ? "Penanda kapasitas muncul setelah rilis pertama ditandai dirilis — rilis berjalan atau terlambat belum dihitung karena akan menarik rata-rata ke bawah."
          : `Garis putus di tiap kolom = kapasitas perkiraan: ${fmt1(average)} poin/minggu × panjang rilis. Batang jauh di atas garis = rilis kelebihan beban.`}
      </p>
    </div>
  );
}

function ColumnTooltip({
  release,
  phase,
  pts,
  total,
  capacity,
  side,
}: {
  release: Release;
  phase: ReleasePhase;
  pts: Record<PlanItemStatus, number>;
  total: number;
  capacity: number | null;
  side: "left" | "right";
}) {
  // Di samping kolom, rata atas plot — bukan di atasnya: kolom setinggi plot,
  // jadi `bottom-full` keluar dari Card dan terpotong. Sisi menjauhi tepi grafik.
  return (
    <div
      role="tooltip"
      className={cn(
        "pointer-events-none absolute top-0 z-20 w-56 rounded-md border bg-popover p-3 text-xs shadow-md",
        side === "right" ? "left-full ml-2" : "right-full mr-2"
      )}
    >
      <p className="font-medium">
        Rilis {release.version} <span className="font-normal text-muted-foreground">· {fmtDate(release.start, false)}–{fmtDate(release.end, false)} · {PHASE_TAG[phase]}</span>
      </p>
      <p className="mb-2 text-muted-foreground">{release.title}</p>
      <ul className="space-y-1">
        {PLAN_STACK_ORDER.filter((k) => pts[k] > 0).map((k) => (
          <li key={k} className="flex items-center gap-2">
            <span aria-hidden className={cn("h-0.5 w-3", k === "moved" ? "border-t border-dashed border-muted-foreground" : STACK[k].fill)} />
            <span className="font-semibold tabular-nums">{pts[k]}</span>
            <span className="text-muted-foreground">{STACK[k].label}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 border-t pt-1.5 tabular-nums">
        <span className="font-semibold">{total}</span> <span className="text-muted-foreground">poin komitmen</span>
        {capacity !== null && <span className="text-muted-foreground"> · kapasitas ±{fmt1(capacity)}</span>}
      </p>
    </div>
  );
}

/**
 * Fokus kategori sebagai matriks Kategori × Rilis berisi angka poin. Isi sel
 * = satu hue sekuensial (biru, makin pekat makin besar) — bukan enam warna
 * kategori — sehingga terbaca tanpa membedakan warna; titik kategori di kepala
 * baris hanya penanda identitas yang berlabel.
 */
function FocusMatrix({ plan, today }: { plan: ReleasePlan; today: string }) {
  const comp = plan.releases.map((r) => ({ release: r, phase: releasePhase(r, today), parts: releaseComposition(r) }));
  const maxCell = Math.max(1, ...comp.flatMap((c) => c.parts.map((p) => p.points)));
  const rowTotal = (cat: string) => comp.reduce((t, c) => t + (c.parts.find((p) => p.category === cat)?.points ?? 0), 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-[2px] text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground">
            <th className="py-1 pr-3 text-left font-medium">Kategori</th>
            {comp.map(({ release, phase }) => (
              <th key={release.version} className={cn("px-1 py-1 text-center font-medium", phase === "active" && "text-primary")}>
                {release.version}
              </th>
            ))}
            <th className="py-1 pl-3 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {PLAN_CATEGORIES.map((cat) => (
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
              {comp.map(({ release, parts }) => {
                const v = parts.find((p) => p.category === cat)?.points ?? 0;
                return (
                  <td
                    key={release.version}
                    title={`Rilis ${release.version} · ${cat}: ${v} poin`}
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
        Baris diurutkan menurut prioritas &quot;risiko prod dulu&quot; — rilis awal sebaiknya berat di baris atas (Keamanan, Rilis).
      </p>
    </div>
  );
}

const DECISION_GROUPS: { phase: ReleasePhase; title: string; open: boolean; tone: string }[] = [
  { phase: "past", title: "Terlambat — target rilisnya sudah lewat", open: true, tone: "text-amber-700 dark:text-amber-300" },
  { phase: "active", title: "Rilis berjalan", open: true, tone: "text-foreground" },
  { phase: "upcoming", title: "Rilis mendatang", open: false, tone: "text-foreground" },
];

/** Antrean keputusan owner, dikelompokkan per urgensi — bahan keputusan di awal rilis. */
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
                <li key={`${d.release}-${d.item.no}`} className="grid gap-1 px-3 py-2 text-sm sm:grid-cols-[3.5rem_1fr_2.5rem] sm:gap-3">
                  <span className="text-xs tabular-nums text-muted-foreground sm:pt-0.5">{d.release}</span>
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

export function SprintAnalysis({ plan, today }: { plan: ReleasePlan; today: string }) {
  const velocity = releaseVelocity(plan, today);
  const pending = pendingDecisions(plan, today);
  const carry = carryOvers(plan);
  const totals = planTotals(plan);
  const overdue = pending.filter((d) => d.phase === "past").length;
  const current = pending.filter((d) => d.phase === "active").length;
  const upcoming = pending.length - overdue - current;
  // Rincian per urgensi yang nol tidak ditulis — dulu "0 minggu ini" tampil
  // di samping poin yang seluruhnya milik rilis mendatang.
  const pendingBreakdown = [
    overdue > 0 && `${overdue} terlambat`,
    current > 0 && `${current} di rilis berjalan`,
    upcoming > 0 && `${upcoming} mendatang`,
  ].filter(Boolean);
  const active = plan.releases.find((r) => releasePhase(r, today) === "active");
  const activeProgress = active ? releaseProgress(active) : null;
  const activeTimeline = active ? releaseTimeline(active, today) : null;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={<CalendarRange className="h-4 w-4" />}
          label="Rencana"
          value={`${totals.points} poin`}
          note={totals.end ? `${totals.releases} rilis · sampai ${fmtDate(totals.end)}` : "belum ada rilis"}
        />
        <Stat
          icon={<Scale className="h-4 w-4" />}
          tone={pending.length > 0 ? "warn" : undefined}
          label="Tertahan keputusan owner"
          value={`${totals.pendingPoints} poin`}
          note={
            pending.length === 0
              ? "tidak ada yang menunggu"
              : [`${Math.round(totals.pendingShare * 100)}% rencana`, ...pendingBreakdown].join(" · ")
          }
        />
        <Stat
          icon={<Gauge className="h-4 w-4" />}
          label="Velocity rata-rata"
          value={velocity.average === null ? "—" : `${fmt1(velocity.average)} poin`}
          note={
            velocity.average !== null
              ? `per minggu kalender · dari ${velocity.sample.releases} rilis dirilis (${fmt1(velocity.sample.weeks)} minggu)${velocity.sample.weeks < 4 ? " — sampel masih kecil" : ""}`
              : active && activeProgress
                ? `${active.version} berjalan: ${activeProgress.donePoints}/${activeProgress.totalPoints} poin, hari ke-${activeTimeline?.day} dari ${activeTimeline?.days}`
                : "belum ada rilis yang dirilis"
          }
        />
        <Stat
          icon={<Repeat2 className="h-4 w-4" />}
          tone={carry.some((c) => c.movedFrom.length > 1) ? "warn" : undefined}
          label="Carry-over"
          value={`${carry.length} butir`}
          note={carry.length === 0 ? "belum ada butir yang digeser" : "pindah rilis minimal sekali"}
        />
      </div>

      <Section
        title="Beban & kemajuan per rilis"
        subtitle="Tinggi kolom = poin komitmen awal; isinya menurut status. Arahkan kursor atau Tab ke kolom untuk rinciannya."
      >
        <LoadTimeline plan={plan} today={today} average={velocity.average} />
      </Section>

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <Section title="Keputusan menunggu owner" subtitle="Semua butir ⚖️ yang belum diputuskan, dikelompokkan per urgensi.">
          <DecisionQueue pending={pending} />
        </Section>
        <Section title="Fokus per kategori" subtitle="Poin per kategori di tiap rilis — apakah prioritas benar-benar dijalankan.">
          <FocusMatrix plan={plan} today={today} />
        </Section>
      </div>

      {carry.length > 0 && (
        <Section title="Carry-over" subtitle="Butir yang pindah rilis. Digeser berulang = estimasi terlalu optimis atau ada penghambat.">
          <ul className="divide-y text-sm">
            {carry.map((c) => (
              <li key={c.issue} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2">
                <span className="min-w-0 flex-1"><Inline text={c.issue} /></span>
                <span className="text-xs text-muted-foreground">
                  {c.movedFrom.join(", ")} → {c.destination === null ? "belum dijadwalkan" : c.destination}
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
