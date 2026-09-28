"use client";

import { useState } from "react";
import { ChevronRight, ExternalLink, Scale } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { cn } from "@/lib/utils";
import {
  sprintDay,
  sprintPhase,
  sprintProgress,
  type Sprint,
  type SprintItem,
  type SprintItemStatus,
  type SprintPhase,
  type SprintPlan,
} from "@/lib/sprint-plan";
import { CATEGORY_COLOR, Inline, IssueRefLinks, ProgressBar, STATUS_STYLE, fmtDate } from "./sprint-shared";
import { SprintAnalysis } from "./sprint-analysis";

const PHASE_LABEL: Record<SprintPhase, string> = { active: "Minggu ini", upcoming: "Mendatang", past: "Selesai" };

/**
 * Urutan kelompok butir. Butir ⚖️ sengaja TIDAK ada di sini — ia tampil sekali
 * saja, di kotak "Butuh keputusan owner" di atas (satu informasi, satu tempat).
 */
const GROUPS: { status: SprintItemStatus; title: string }[] = [
  { status: "progress", title: "Dikerjakan" },
  { status: "todo", title: "Belum dimulai" },
  { status: "done", title: "Selesai" },
  { status: "moved", title: "Digeser ke sprint lain" },
];

function CategoryDot({ item }: { item: SprintItem }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span
        aria-hidden
        className="h-2 w-2 shrink-0 rounded-full bg-[var(--c-light)] dark:bg-[var(--c-dark)]"
        style={{ "--c-light": CATEGORY_COLOR[item.category].light, "--c-dark": CATEGORY_COLOR[item.category].dark } as React.CSSProperties}
      />
      {item.category}
    </span>
  );
}

function SizeBadge({ item }: { item: SprintItem }) {
  return (
    <span className="shrink-0 rounded border px-1.5 py-0.5 text-xs tabular-nums text-muted-foreground" title={`Ukuran ${item.size} = ${item.points} poin`}>
      {item.size} · {item.points}
    </span>
  );
}

/** Satu baris butir — klik untuk membuka target & keputusan. */
function ItemRow({ item }: { item: SprintItem }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="border-b last:border-0">
      <div className="flex items-start gap-2 hover:bg-muted/40">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="flex min-w-0 flex-1 items-start gap-2 py-2.5 text-left text-sm focus-visible:outline-2 focus-visible:outline-ring"
        >
          <ChevronRight className={cn("mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")} />
          <span className={cn("min-w-0 flex-1", item.status === "moved" && "text-muted-foreground")}>
            <Inline text={item.issue} links={false} />
          </span>
          <span className="hidden sm:inline-flex"><CategoryDot item={item} /></span>
          <SizeBadge item={item} />
        </button>
        <span className="py-2"><IssueRefLinks refs={item.issueRefs} /></span>
      </div>
      {open && (
        <dl className="mb-3 ml-6 grid gap-1 rounded-md bg-muted/40 p-3 text-sm sm:grid-cols-[9rem_1fr]">
          <dt className="text-muted-foreground">Target minggu ini</dt>
          <dd><Inline text={item.target} /></dd>
          <dt className="text-muted-foreground sm:hidden">Kategori</dt>
          <dd className="sm:hidden"><CategoryDot item={item} /></dd>
          {item.decision && (
            <>
              <dt className="text-muted-foreground">Keputusan owner</dt>
              <dd><Inline text={item.decision} /></dd>
            </>
          )}
        </dl>
      )}
    </li>
  );
}

function SprintSummary({ sprint, phase, today }: { sprint: Sprint; phase: SprintPhase; today: string }) {
  const p = sprintProgress(sprint);
  const day = sprintDay(sprint, today);
  return (
    <Card className={cn("border shadow-sm", phase === "active" ? "border-primary/50" : "border-border/60")}>
      <CardContent className="space-y-3 pt-5">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <Badge variant={phase === "active" ? "default" : "outline"}>{PHASE_LABEL[phase]}</Badge>
          <span className="text-lg font-semibold">Sprint {sprint.number}</span>
          <span className="text-sm text-muted-foreground">
            {fmtDate(sprint.start)} – {fmtDate(sprint.end)}
            {day !== null && ` · hari ke-${day} dari 7`}
          </span>
        </div>
        <p className="text-sm">{sprint.title}</p>
        <div className="flex items-center gap-3">
          <ProgressBar value={p.donePoints} max={p.totalPoints} label={`${p.donePoints} dari ${p.totalPoints} poin selesai`} />
          <span className="shrink-0 text-sm tabular-nums">
            <span className="font-semibold">{p.donePoints}/{p.totalPoints} poin</span>
            <span className="text-muted-foreground"> · {p.done}/{p.total} butir selesai</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function DecisionBox({ items }: { items: SprintItem[] }) {
  if (items.length === 0) return null;
  const points = items.reduce((s, i) => s + i.points, 0);
  return (
    <Card className="border border-amber-500/40 bg-amber-500/5 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-200">
          <Scale className="h-4 w-4" /> Butuh keputusan owner ({items.length})
          <span className="ml-auto text-xs font-normal text-muted-foreground">{points} poin tertahan</span>
        </CardTitle>
        <p className="text-xs text-muted-foreground">Pekerjaan ini belum bisa jalan sebelum diputuskan — sebaiknya di awal minggu.</p>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="divide-y text-sm">
          {items.map((item) => (
            <li key={item.no} className="grid gap-1 py-2 sm:grid-cols-[minmax(12rem,1fr)_2fr] sm:gap-4">
              <span><Inline text={item.issue} /></span>
              <span className="text-muted-foreground"><Inline text={item.decision ?? "—"} /></span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function SprintDetail({ sprint, phase, today }: { sprint: Sprint; phase: SprintPhase; today: string }) {
  const decisions = sprint.items.filter((i) => i.status === "decision");
  return (
    <div className="space-y-4">
      <SprintSummary sprint={sprint} phase={phase} today={today} />
      <DecisionBox items={decisions} />
      <Card className="border border-border/60 shadow-sm">
        <CardContent className="space-y-4 pt-5">
          {GROUPS.map(({ status, title }) => {
            const items = sprint.items.filter((i) => i.status === status);
            if (items.length === 0) return null;
            return (
              <section key={status}>
                <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold">
                  <Badge variant="outline" className={STATUS_STYLE[status]}>{items.length}</Badge>
                  {title}
                </h3>
                <ul>
                  {items.map((item) => <ItemRow key={item.no} item={item} />)}
                </ul>
              </section>
            );
          })}
          {decisions.length === sprint.items.length && (
            <p className="text-sm text-muted-foreground">Semua butir sprint ini menunggu keputusan — lihat kotak di atas.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Backlog({ plan }: { plan: SprintPlan }) {
  return (
    <Card className="border border-border/60 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{plan.backlogTitle ?? "Backlog"}</CardTitle>
        <p className="text-xs text-muted-foreground">Sudah diurutkan, belum masuk sprint mana pun. Urutan = urutan pengerjaan berikutnya.</p>
      </CardHeader>
      <CardContent className="pt-0">
        <ol className="list-decimal space-y-2 pl-5 text-sm">
          {plan.backlog.map((line, i) => <li key={i}><Inline text={line} /></li>)}
        </ol>
      </CardContent>
    </Card>
  );
}

export function SprintViewClient({ plan, today }: { plan: SprintPlan; today: string }) {
  const { get, setMany } = useUrlFilters();
  const phases = plan.sprints.map((s) => sprintPhase(s, today));

  // Minggu bawaan: aktif → mendatang terdekat → terakhir. `?sprint=` dari URL
  // divalidasi terhadap sprint yang ada (tautan bisa basi).
  const fallback = phases.indexOf("active") !== -1 ? phases.indexOf("active") : phases.indexOf("upcoming") !== -1 ? phases.indexOf("upcoming") : plan.sprints.length - 1;
  const sprintParam = get("sprint");
  const selected =
    sprintParam === "backlog" && plan.backlog.length > 0
      ? "backlog"
      : plan.sprints.some((s) => String(s.number) === sprintParam)
        ? sprintParam!
        : String(plan.sprints[fallback].number);
  const tab = get("tab") === "analisa" ? "analisa" : "sprint";
  const allPast = phases.every((p) => p === "past");

  return (
    <Tabs value={tab} onValueChange={(v) => setMany({ tab: v === "analisa" ? "analisa" : null })} className="space-y-4">
      <TabsList>
        <TabsTrigger value="sprint">Sprint</TabsTrigger>
        <TabsTrigger value="analisa">Analisa</TabsTrigger>
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
          {plan.backlog.length > 0 && (
            <button
              type="button"
              aria-pressed={selected === "backlog"}
              onClick={() => setMany({ sprint: "backlog" })}
              className={cn(
                "flex min-w-[7.5rem] flex-col rounded-lg border border-dashed px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                selected === "backlog" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
              )}
            >
              <span className="text-sm font-semibold">Backlog</span>
              <span className="text-xs text-muted-foreground">{plan.backlog.length} kelompok</span>
            </button>
          )}
        </nav>

        {selected === "backlog" ? (
          <Backlog plan={plan} />
        ) : (
          (() => {
            const idx = plan.sprints.findIndex((s) => String(s.number) === selected);
            return <SprintDetail sprint={plan.sprints[idx]} phase={phases[idx]} today={today} />;
          })()
        )}

        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <ExternalLink className="h-3 w-3" /> Tombol #… ↗ membuka issue di GitHub (tab baru) · klik baris untuk melihat target & keputusan.
        </p>
      </TabsContent>

      <TabsContent value="analisa">
        <SprintAnalysis plan={plan} today={today} />
      </TabsContent>
    </Tabs>
  );
}
