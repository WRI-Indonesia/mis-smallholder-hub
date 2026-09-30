import Link from "next/link";
import { ChevronRight, Clock, Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import { daysBetween, pendingDecisions, sprintDay, sprintPhase, sprintProgress, type SprintPlan } from "@/lib/sprint-plan";
import { ProgressBar, fmtDate } from "./sprint-shared";

/** Lebih lama dari ini = dokumen sprint dianggap basi (satu sprint penuh tanpa pembaruan). */
const STALE_DAYS = 7;

function ago(days: number): string {
  if (days <= 0) return "hari ini";
  if (days === 1) return "kemarin";
  return `${days} hari lalu`;
}

/**
 * Strip ringkasan di atas tab: kesegaran dokumen (halaman statis), sprint
 * minggu ini, dan antrean keputusan owner — tiga hal yang dicari pertama kali
 * saat membuka halaman, tanpa harus berpindah tab.
 */
export function SprintHeaderStrip({ plan, today }: { plan: SprintPlan; today: string }) {
  const age = daysBetween(plan.updatedAt, today);
  const stale = age > STALE_DAYS;
  const active = plan.sprints.find((s) => sprintPhase(s, today) === "active") ?? null;
  const progress = active ? sprintProgress(active) : null;
  const pending = pendingDecisions(plan, today);
  const pendingPoints = pending.reduce((t, d) => t + d.item.points, 0);
  const late = pending.filter((d) => d.phase === "past").length;

  const cell = "flex min-w-0 flex-col justify-center gap-1.5 px-4 py-3";
  return (
    <div className="grid overflow-hidden rounded-lg border bg-card shadow-sm sm:grid-cols-3 sm:divide-x max-sm:divide-y">
      <div className={cn(cell, stale && "bg-amber-500/10")}>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" aria-hidden /> Dokumen sprint diperbarui
        </span>
        <span className="text-sm">
          <span className="font-semibold">{fmtDate(plan.updatedAt)}</span>
          <span className={cn("text-muted-foreground", stale && "font-medium text-amber-700 dark:text-amber-300")}> · {ago(age)}</span>
        </span>
        {stale && <span className="text-xs text-amber-700 dark:text-amber-300">Mungkin sudah tidak sesuai — cek status di GitHub.</span>}
      </div>

      <div className={cell}>
        {active && progress ? (
          <>
            <span className="text-xs text-muted-foreground">
              Sprint {active.number} · hari ke-{sprintDay(active, today)} dari 7
            </span>
            <div className="flex items-center gap-2">
              <ProgressBar value={progress.donePoints} max={progress.totalPoints} label={`${progress.donePoints} dari ${progress.totalPoints} poin selesai`} />
              <span className="shrink-0 text-sm font-semibold tabular-nums">
                {progress.donePoints}/{progress.totalPoints} poin
              </span>
            </div>
          </>
        ) : (
          <>
            <span className="text-xs text-muted-foreground">Minggu ini</span>
            <span className="text-sm">Tidak ada sprint aktif</span>
          </>
        )}
      </div>

      <Link
        href="?tab=analisa"
        className={cn(cell, "group transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring", pending.length > 0 && "bg-amber-500/5")}
      >
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Scale className="h-3.5 w-3.5" aria-hidden /> Keputusan menunggu owner
        </span>
        <span className="flex items-center text-sm">
          <span className="font-semibold tabular-nums">{pending.length} butir</span>
          <span className="text-muted-foreground">
            &nbsp;· {pendingPoints} poin tertahan{late > 0 && <span className="font-medium text-amber-700 dark:text-amber-300"> · {late} terlambat</span>}
          </span>
          <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
      </Link>
    </div>
  );
}
