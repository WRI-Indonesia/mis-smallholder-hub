"use client";

import { useId, useState } from "react";
import { CheckCircle2, ChevronRight, ExternalLink, Scale } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { cn } from "@/lib/utils";
import {
  SPRINT_STATUS_LABEL,
  sprintDay,
  sprintKanban,
  sprintPhase,
  sprintProgress,
  type Sprint,
  type SprintItem,
  type SprintPhase,
  type SprintPlan,
} from "@/lib/sprint-plan";
import { CategoryLabel, Inline, ProgressBar, STATUS_STYLE, fmtDate, plainInline } from "./sprint-shared";
import { SprintAnalysis } from "./sprint-analysis";
import { SprintIssues } from "./sprint-issues";

const PHASE_LABEL: Record<SprintPhase, string> = { active: "Minggu ini", upcoming: "Mendatang", past: "Selesai" };

function CategoryDot({ item }: { item: SprintItem }) {
  return <CategoryLabel category={item.category} />;
}

function SizeBadge({ item }: { item: SprintItem }) {
  return (
    <span className="shrink-0 rounded border px-1.5 py-0.5 text-xs tabular-nums text-muted-foreground" title={`Ukuran ${item.size} = ${item.points} poin`}>
      {item.size} · {item.points}
    </span>
  );
}

function DecisionNote({ text }: { text: string }) {
  return (
    <p className="flex gap-1.5 rounded bg-amber-500/10 p-2 text-xs text-amber-800 dark:text-amber-200">
      <Scale className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-label="Keputusan owner" />
      <span className="[overflow-wrap:anywhere]"><Inline text={text} /></span>
    </p>
  );
}

/**
 * Satu kartu kanban (#389), versi ringkas (2026-09-30): judul, ukuran,
 * kategori, dan keputusan owner yang masih ditunggu. Target minggu ini (teks
 * catatan developer) disembunyikan di balik tombol Detail. Kartu Selesai cukup
 * satu baris — butir tuntas tak boleh memakan layar lebih banyak daripada yang
 * masih berjalan. Tautan `#nnn` ada di judul, di luar tombol.
 */
function KanbanCard({ item }: { item: SprintItem }) {
  const [open, setOpen] = useState(false);
  const detailId = useId();
  const done = item.status === "done";
  const toggle = (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={detailId}
      aria-label={`${open ? "Tutup detail" : "Detail"}: ${plainInline(item.issue)}`}
      onClick={() => setOpen((o) => !o)}
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 rounded text-xs text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring",
        done && "p-0.5 text-muted-foreground hover:text-foreground"
      )}
    >
      <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-90")} aria-hidden />
      {!done && (open ? "Tutup" : "Detail")}
    </button>
  );
  const detail = open && (
    <div id={detailId} className="space-y-2 border-t pt-2">
      {done && <CategoryDot item={item} />}
      <p className="text-xs text-muted-foreground [overflow-wrap:anywhere]">
        <span className="font-medium text-foreground">Target: </span>
        <Inline text={item.target} />
      </p>
      {done && item.decision && <DecisionNote text={item.decision} />}
    </div>
  );

  if (done) {
    return (
      <li className="space-y-2 rounded-md border bg-card px-2.5 py-2 text-sm">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-label="Selesai" />
          <span className="min-w-0 flex-1 leading-snug text-muted-foreground [overflow-wrap:anywhere]">
            <Inline text={item.issue} />
          </span>
          <SizeBadge item={item} />
          {toggle}
        </div>
        {detail}
      </li>
    );
  }

  return (
    <li className="space-y-2 rounded-md border bg-card p-3 text-sm shadow-sm">
      <div className="flex items-start gap-2">
        <span className={cn("min-w-0 flex-1 font-medium leading-snug [overflow-wrap:anywhere]", item.status === "moved" && "font-normal text-muted-foreground")}>
          <Inline text={item.issue} />
        </span>
        <SizeBadge item={item} />
      </div>
      <div className="flex items-center justify-between gap-2">
        <CategoryDot item={item} />
        {toggle}
      </div>
      {item.decision && <DecisionNote text={item.decision} />}
      {detail}
    </li>
  );
}

/** Ringkasan sprint terpilih — dua baris padat (judul + progres), di atas papan. */
function SprintSummary({ sprint, phase, today }: { sprint: Sprint; phase: SprintPhase; today: string }) {
  const p = sprintProgress(sprint);
  const day = sprintDay(sprint, today);
  return (
    <div className={cn("space-y-2 rounded-lg border bg-card px-4 py-3 shadow-sm", phase === "active" ? "border-primary/50" : "border-border/60")}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Badge variant={phase === "active" ? "default" : "outline"}>{PHASE_LABEL[phase]}</Badge>
        <span className="font-semibold">Sprint {sprint.number}</span>
        <span className="text-sm">{sprint.title}</span>
        <span className="text-xs text-muted-foreground">
          {fmtDate(sprint.start)} – {fmtDate(sprint.end)}
          {day !== null && ` · hari ke-${day} dari 7`}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <ProgressBar value={p.donePoints} max={p.totalPoints} label={`${p.donePoints} dari ${p.totalPoints} poin selesai`} />
        <span className="shrink-0 text-sm tabular-nums">
          <span className="font-semibold">{p.donePoints}/{p.totalPoints} poin</span>
          <span className="text-muted-foreground"> · {p.done}/{p.total} butir selesai</span>
        </span>
      </div>
    </div>
  );
}

/** Tab Sprint = ringkasan + papan kanban 4 kolom + lajur butir digeser (#389). */
function SprintDetail({ sprint, phase, today }: { sprint: Sprint; phase: SprintPhase; today: string }) {
  const { columns, moved } = sprintKanban(sprint);
  return (
    <div className="space-y-4">
      <SprintSummary sprint={sprint} phase={phase} today={today} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {columns.map(({ status, items, points }) => (
          <section
            key={status}
            aria-label={`${SPRINT_STATUS_LABEL[status]}: ${items.length} butir, ${points} poin`}
            className={cn("flex flex-col rounded-lg border bg-muted/30 p-2", status === "decision" && items.length > 0 && "border-amber-500/40 bg-amber-500/5")}
          >
            <h3 className="flex items-center gap-2 px-1 pb-2 text-sm font-semibold">
              {SPRINT_STATUS_LABEL[status]}
              <Badge variant="outline" className={STATUS_STYLE[status]}>{items.length}</Badge>
              <span className="ml-auto text-xs font-normal tabular-nums text-muted-foreground">
                {points} poin{status === "decision" && points > 0 ? " tertahan" : ""}
              </span>
            </h3>
            {items.length === 0 ? (
              <p className="px-1 py-3 text-center text-xs text-muted-foreground">Kosong</p>
            ) : (
              <ul className="space-y-2">
                {items.map((item) => <KanbanCard key={item.no} item={item} />)}
              </ul>
            )}
          </section>
        ))}
      </div>
      {moved.length > 0 && (
        <details className="rounded-lg border bg-muted/20 p-2">
          <summary className="cursor-pointer px-1 text-sm font-semibold">
            Digeser ke sprint lain ({moved.length})
            <span className="ml-2 text-xs font-normal text-muted-foreground">poinnya dihitung di sprint tujuan</span>
          </summary>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {moved.map((item) => <KanbanCard key={item.no} item={item} />)}
          </ul>
        </details>
      )}
    </div>
  );
}

export function SprintViewClient({ plan, today }: { plan: SprintPlan; today: string }) {
  const { get, setMany } = useUrlFilters();
  const phases = plan.sprints.map((s) => sprintPhase(s, today));

  // Minggu bawaan: aktif → mendatang terdekat → terakhir. `?sprint=` dari URL
  // divalidasi terhadap sprint yang ada (tautan bisa basi).
  const fallback = phases.indexOf("active") !== -1 ? phases.indexOf("active") : phases.indexOf("upcoming") !== -1 ? phases.indexOf("upcoming") : plan.sprints.length - 1;
  const sprintParam = get("sprint");
  // `?sprint=backlog` (tautan lama, sebelum backlog pindah ke tab Semua Issue) jatuh ke bawaan.
  const selected = plan.sprints.some((s) => String(s.number) === sprintParam) ? sprintParam! : String(plan.sprints[fallback].number);
  const tabParam = get("tab");
  const tab = tabParam === "analisa" || tabParam === "issue" ? tabParam : "sprint";
  const allPast = phases.every((p) => p === "past");

  return (
    <Tabs value={tab} onValueChange={(v) => setMany({ tab: v === "sprint" ? null : v, status: null, di: null })} className="space-y-4">
      <TabsList>
        <TabsTrigger value="sprint">Sprint</TabsTrigger>
        <TabsTrigger value="analisa">Analisa</TabsTrigger>
        <TabsTrigger value="issue">Semua Issue</TabsTrigger>
      </TabsList>

      <TabsContent value="sprint" className="space-y-4">
        {allPast && (
          <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
            Semua sprint yang direncanakan sudah lewat. Rencana minggu berikutnya belum ditulis di dokumen sprint.
          </p>
        )}

        <nav aria-label="Pilih minggu" className="flex flex-wrap gap-2">
          {plan.sprints.map((s, i) => {
            const on = selected === String(s.number);
            const p = sprintProgress(s);
            return (
              <button
                key={s.number}
                type="button"
                aria-pressed={on}
                onClick={() => setMany({ sprint: i === fallback ? null : String(s.number) })}
                className={cn(
                  "flex min-w-[7.5rem] flex-col rounded-lg border px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                  on ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                )}
              >
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  {phases[i] === "active" && <span aria-label="minggu ini" className="h-2 w-2 rounded-full bg-primary" />}
                  Sprint {s.number}
                  {phases[i] === "past" && <span className="text-xs font-normal text-muted-foreground">· selesai</span>}
                </span>
                <span className="text-xs text-muted-foreground">
                  {fmtDate(s.start, false)} – {fmtDate(s.end, false)}
                </span>
                <span className="text-xs tabular-nums text-muted-foreground">{p.donePoints}/{p.totalPoints} poin</span>
              </button>
            );
          })}
        </nav>

        {(() => {
          const idx = plan.sprints.findIndex((s) => String(s.number) === selected);
          return <SprintDetail sprint={plan.sprints[idx]} phase={phases[idx]} today={today} />;
        })()}

        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <ExternalLink className="h-3 w-3" /> Nomor #… membuka issue di GitHub (tab baru) · papan dibaca kiri → kanan: belum dimulai, dikerjakan, menunggu keputusan owner, selesai. Backlog ada di tab Semua Issue.
        </p>
      </TabsContent>

      <TabsContent value="analisa">
        <SprintAnalysis plan={plan} today={today} />
      </TabsContent>

      <TabsContent value="issue">
        <SprintIssues plan={plan} />
      </TabsContent>
    </Tabs>
  );
}
