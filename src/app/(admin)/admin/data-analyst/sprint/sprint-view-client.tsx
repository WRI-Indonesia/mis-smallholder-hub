"use client";

import { useId, useState } from "react";
import { CheckCircle2, ChevronRight, ExternalLink, Scale } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FilterCombobox } from "@/components/shared/filter-combobox";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { cn } from "@/lib/utils";
import {
  PLAN_STATUS_LABEL,
  releaseKanban,
  releaseProgress,
  releaseState,
  releaseTimeline,
  daysBetween,
  type PlanItem,
  type Release,
  type ReleasePlan,
  type ReleaseState,
} from "@/lib/release-plan";
import { CategoryLabel, Inline, ProgressBar, STATUS_STYLE, fmtDate, plainInline } from "./sprint-shared";
import { SprintAnalysis } from "./sprint-analysis";
import { SprintIssues } from "./sprint-issues";
import { SprintHeaderStrip } from "./sprint-header-strip";

const STATE_LABEL: Record<ReleaseState, string> = { active: "Berjalan", upcoming: "Mendatang", released: "Dirilis", late: "Terlambat" };

function SizeBadge({ item }: { item: PlanItem }) {
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
function KanbanCard({ item }: { item: PlanItem }) {
  const [open, setOpen] = useState(false);
  const detailId = useId();
  const done = item.status === "done";
  const decided = item.decision?.startsWith("✅") ?? false;
  const openDecision = !!item.decision && !decided;
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
      {done && <CategoryLabel category={item.category} />}
      <p className="text-xs text-muted-foreground [overflow-wrap:anywhere]">
        <span className="font-medium text-foreground">Target: </span>
        <Inline text={item.target} />
      </p>
      {(done || decided) && item.decision && <DecisionNote text={item.decision} />}
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
        <CategoryLabel category={item.category} />
        {toggle}
      </div>
      {/* Keputusan yang sudah diambil ("✅ Diputuskan: …") masuk Detail; di kartu hanya yang masih terbuka
          — termasuk pertanyaan pada butir Todo (mis. "Nilai N"), bukan hanya status ⚖️. */}
      {openDecision && <DecisionNote text={item.decision!} />}
      {detail}
    </li>
  );
}

/** Ringkasan rilis terpilih — dua baris padat (judul + progres), di atas papan. */
function ReleaseSummary({ release, state, today }: { release: Release; state: ReleaseState; today: string }) {
  const p = releaseProgress(release);
  const t = releaseTimeline(release, today);
  const when =
    t.day !== null
      ? ` · hari ke-${t.day} dari ${t.days} · sisa ${t.daysLeft} hari`
      : state === "late"
        ? ` · target lewat ${daysBetween(release.end, today)} hari`
        : state === "upcoming"
          ? ` · mulai ${daysBetween(today, release.start)} hari lagi`
          : release.releasedAt
            ? ` · dirilis ${fmtDate(release.releasedAt)}`
            : "";
  return (
    <div className={cn("space-y-2 rounded-lg border bg-card px-4 py-3 shadow-sm", state === "active" ? "border-primary/50" : state === "late" ? "border-amber-500/50" : "border-border/60")}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Badge variant={state === "active" ? "default" : "outline"} className={cn(state === "late" && STATUS_STYLE.decision)}>
          {STATE_LABEL[state]}
        </Badge>
        <span className="font-semibold">Rilis {release.version}</span>
        <span className="text-sm">{release.title}</span>
        <span className="text-xs text-muted-foreground">
          {fmtDate(release.start)} – {fmtDate(release.end)}
          {when}
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

/** Tab Rilis = ringkasan + papan kanban 4 kolom + lajur butir digeser (#389). */
function ReleaseDetail({ release, state, today }: { release: Release; state: ReleaseState; today: string }) {
  const { columns, moved } = releaseKanban(release);
  return (
    <div className="space-y-4">
      <ReleaseSummary release={release} state={state} today={today} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {columns.map(({ status, items, points }) => (
          <section
            key={status}
            aria-label={`${PLAN_STATUS_LABEL[status]}: ${items.length} butir, ${points} poin`}
            className={cn("flex flex-col rounded-lg border bg-muted/30 p-2", status === "decision" && items.length > 0 && "border-amber-500/40 bg-amber-500/5")}
          >
            <h3 className="flex items-center gap-2 px-1 pb-2 text-sm font-semibold">
              {PLAN_STATUS_LABEL[status]}
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
            Digeser ke rilis lain ({moved.length})
            <span className="ml-2 text-xs font-normal text-muted-foreground">poinnya dihitung di rilis tujuan</span>
          </summary>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {moved.map((item) => <KanbanCard key={item.no} item={item} />)}
          </ul>
        </details>
      )}
    </div>
  );
}

/**
 * Rilis bawaan: berjalan → terlambat pertama → mendatang terdekat → terakhir.
 * Terlambat didahulukan dari mendatang: sisa kerja rilis yang lewat target
 * masih harus dituntaskan lebih dulu.
 */
function defaultRelease(states: ReleaseState[]): number {
  for (const s of ["active", "late", "upcoming"] as const) {
    const i = states.indexOf(s);
    if (i !== -1) return i;
  }
  return states.length - 1;
}

export function SprintViewClient({ plan, today }: { plan: ReleasePlan; today: string }) {
  const { get, setMany } = useUrlFilters();
  const states = plan.releases.map((r) => releaseState(r, today));
  const fallback = defaultRelease(states);
  // `?rilis=` divalidasi terhadap rilis yang ada (tautan bisa basi); `?sprint=` lama diabaikan.
  const fromUrl = plan.releases.findIndex((r) => r.version === get("rilis"));
  const selected = plan.releases[fromUrl === -1 ? fallback : fromUrl];
  const tabParam = get("tab");
  const tab = tabParam === "analisa" || tabParam === "issue" ? tabParam : "rilis";
  const noOpen = states.every((s) => s === "released");

  // Pemilih tidak tumbuh bersama riwayat: rilis yang belum tuntas (berjalan,
  // terlambat, mendatang) jadi tombol; yang sudah dirilis masuk combobox Riwayat.
  const openIdx = states.flatMap((s, i) => (s === "released" ? [] : [i]));
  const released = plan.releases.filter((_, i) => states[i] === "released").reverse();
  const shownIdx = [...new Set([...openIdx, plan.releases.indexOf(selected)])].sort((a, b) => a - b);
  // `sprint: null` membersihkan parameter lama dari tautan era Sprint Mingguan.
  const pick = (r: Release) => setMany({ rilis: r === plan.releases[fallback] ? null : r.version, sprint: null });

  return (
    <div className="space-y-6">
      <SprintHeaderStrip
        plan={plan}
        today={today}
        onOpenDecisions={() => setMany({ tab: "analisa", status: null, di: null, q: null })}
        onOpenBacklogDecisions={() => setMany({ tab: "issue", di: "backlog", status: "decision", q: null })}
      />
      <Tabs value={tab} onValueChange={(v) => setMany({ tab: v === "rilis" ? null : v, status: null, di: null, q: null, sprint: null })} className="space-y-4">
        <TabsList>
          <TabsTrigger value="rilis">Rilis</TabsTrigger>
          <TabsTrigger value="analisa">Analisa</TabsTrigger>
          <TabsTrigger value="issue">Semua Issue</TabsTrigger>
        </TabsList>

        <TabsContent value="rilis" className="space-y-4">
          {noOpen && (
            <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
              Semua rilis yang direncanakan sudah dirilis. Rencana rilis berikutnya belum ditulis di dokumen rencana.
            </p>
          )}

          <div className="flex flex-wrap items-start gap-2">
            <nav aria-label="Pilih rilis" className="flex flex-wrap gap-2">
              {shownIdx.map((i) => {
                const r = plan.releases[i];
                const on = r === selected;
                const p = releaseProgress(r);
                return (
                  <button
                    key={r.version}
                    type="button"
                    aria-pressed={on}
                    onClick={() => pick(r)}
                    className={cn(
                      "flex min-w-[8rem] flex-col rounded-lg border px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                      on ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                    )}
                  >
                    <span className="flex items-center gap-1.5 text-sm font-semibold">
                      {states[i] === "active" && <span aria-label="berjalan" className="h-2 w-2 rounded-full bg-primary" />}
                      {r.version}
                      {states[i] !== "active" && (
                        <span className={cn("text-xs font-normal text-muted-foreground", states[i] === "late" && "text-amber-700 dark:text-amber-300")}>
                          · {STATE_LABEL[states[i]].toLowerCase()}
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground">target {fmtDate(r.end, false)}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">{p.donePoints}/{p.totalPoints} poin</span>
                  </button>
                );
              })}
            </nav>
            {released.length > 0 && (
              <FilterCombobox
                options={released.map((r) => ({ id: r.version, name: `${r.version} · dirilis`, code: r.title }))}
                value={null}
                onSelect={(v) => {
                  const r = plan.releases.find((x) => x.version === v);
                  if (r) pick(r);
                }}
                placeholder={`Riwayat (${released.length})`}
                searchPlaceholder="Cari versi…"
                emptyLabel="Tidak ada rilis."
                widthClass="w-[180px]"
              />
            )}
          </div>

          <ReleaseDetail release={selected} state={states[plan.releases.indexOf(selected)]} today={today} />

          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <ExternalLink className="h-3 w-3" /> Nomor #… membuka issue di GitHub (tab baru) · papan dibaca kiri → kanan: belum dimulai, dikerjakan, menunggu keputusan owner, selesai. Backlog ada di tab Semua Issue.
          </p>
        </TabsContent>

        <TabsContent value="analisa">
          <SprintAnalysis plan={plan} today={today} />
        </TabsContent>

        <TabsContent value="issue">
          <SprintIssues plan={plan} today={today} get={get} setMany={setMany} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
