import { ChevronRight, Clock, Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import { daysBetween, pendingDecisions, releaseProgress, releaseState, releaseTimeline, type ReleasePlan } from "@/lib/release-plan";
import { ProgressBar, fmtDate } from "./sprint-shared";

/** Lebih lama dari ini = dokumen rencana dianggap basi (dua minggu tanpa pembaruan). */
const STALE_DAYS = 14;

function ago(days: number): string {
  if (days <= 0) return "hari ini";
  if (days === 1) return "kemarin";
  return `${days} hari lalu`;
}

/**
 * Strip ringkasan di atas tab: kesegaran dokumen (halaman statis), rilis yang
 * sedang dikejar, dan antrean keputusan owner — tiga hal yang dicari pertama kali
 * saat membuka halaman, tanpa harus berpindah tab.
 *
 * Dirender di dalam `SprintViewClient` dan berpindah tab lewat callback, bukan
 * `<Link href="?tab=…">`: tab dibaca `useUrlFilters` sekali saat mount, jadi
 * navigasi router tidak mengganti tab yang sedang terbuka (review 4505de9).
 */
export function SprintHeaderStrip({
  plan,
  today,
  onOpenDecisions,
  onOpenBacklogDecisions,
}: {
  plan: ReleasePlan;
  today: string;
  onOpenDecisions: () => void;
  onOpenBacklogDecisions: () => void;
}) {
  const age = daysBetween(plan.updatedAt, today);
  const stale = age > STALE_DAYS;
  // Rilis yang sedang dikejar: berjalan, atau — bila tidak ada — yang sudah lewat target tapi belum dirilis.
  // Rilis terlambat LAIN tetap disebut di bawahnya: begitu rilis berikutnya mulai, sisa kerja
  // yang lewat target tak boleh hilang dari ringkasan.
  const lateReleases = plan.releases.filter((r) => releaseState(r, today) === "late");
  const current = plan.releases.find((r) => releaseState(r, today) === "active") ?? lateReleases[0] ?? null;
  const otherLate = lateReleases.filter((r) => r !== current);
  const progress = current ? releaseProgress(current) : null;
  const timeline = current ? releaseTimeline(current, today) : null;
  const pending = pendingDecisions(plan, today);
  const pendingPoints = pending.reduce((t, d) => t + d.item.points, 0);
  const late = pending.filter((d) => d.phase === "past").length;
  // Butir backlog ⚖️ ("hanya keputusan", verifikasi owner) — tidak berpoin, jadi tidak ikut
  // antrean Analisa; ditautkan ke tab Semua Issue agar tidak tersembunyi.
  const backlogPending = plan.backlog.filter((b) => b.status === "decision").length;

  const cell = "flex min-w-0 flex-col justify-center gap-1.5 px-4 py-3";
  return (
    <div className="grid overflow-hidden rounded-lg border bg-card shadow-sm sm:grid-cols-3 sm:divide-x max-sm:divide-y">
      <div className={cn(cell, stale && "bg-amber-500/10")}>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" aria-hidden /> Dokumen rencana diperbarui
        </span>
        <span className="text-sm">
          <span className="font-semibold">{fmtDate(plan.updatedAt)}</span>
          <span
            className={cn(
              "text-muted-foreground",
              stale && "font-medium text-amber-700 dark:text-amber-300",
            )}
          >
            {" "}
            · {ago(age)}
          </span>
        </span>
        {stale && (
          <span className="text-xs text-amber-700 dark:text-amber-300">
            Mungkin sudah tidak sesuai — cek status di GitHub.
          </span>
        )}
      </div>

      <div className={cn(cell, timeline?.day === null && current && "bg-amber-500/10")}>
        {current && progress && timeline ? (
          <>
            <span className="text-xs text-muted-foreground">
              Rilis {current.version} ·{" "}
              {timeline.day !== null ? (
                `sisa ${timeline.daysLeft} hari (target ${fmtDate(current.end, false)})`
              ) : (
                <span className="font-medium text-amber-700 dark:text-amber-300">target lewat {daysBetween(current.end, today)} hari</span>
              )}
            </span>
            <div className="flex items-center gap-2">
              <ProgressBar
                value={progress.donePoints}
                max={progress.totalPoints}
                label={`${progress.donePoints} dari ${progress.totalPoints} poin selesai`}
              />
              <span className="shrink-0 text-sm font-semibold tabular-nums">
                {progress.donePoints}/{progress.totalPoints} poin
              </span>
            </div>
            {otherLate.length > 0 && (
              <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                Belum dirilis & lewat target: {otherLate.map((r) => `${r.version} (${daysBetween(r.end, today)} hari)`).join(", ")}
              </span>
            )}
          </>
        ) : (
          <>
            <span className="text-xs text-muted-foreground">Rilis berjalan</span>
            <span className="text-sm">Tidak ada rilis yang sedang dikejar</span>
          </>
        )}
      </div>

      <div className={cn(cell, pending.length > 0 && "bg-amber-500/5")}>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Scale className="h-3.5 w-3.5" aria-hidden /> Keputusan menunggu owner
        </span>
        <button
          type="button"
          onClick={onOpenDecisions}
          className="group flex items-center rounded text-left text-sm hover:underline focus-visible:outline-2 focus-visible:outline-ring"
        >
          <span className="font-semibold tabular-nums">{pending.length} butir di rilis</span>
          <span className="text-muted-foreground">
            &nbsp;· {pendingPoints} poin tertahan
            {late > 0 && (
              <span className="font-medium text-amber-700 dark:text-amber-300">
                {" "}
                · {late} terlambat
              </span>
            )}
          </span>
          <ChevronRight
            className="ml-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </button>
        {backlogPending > 0 && (
          <button
            type="button"
            onClick={onOpenBacklogDecisions}
            className="self-start rounded text-left text-xs text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring"
          >
            + {backlogPending} keputusan di backlog
          </button>
        )}
      </div>
    </div>
  );
}
