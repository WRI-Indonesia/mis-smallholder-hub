"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  KANBAN_CLOSED_DAYS,
  KANBAN_COLUMNS,
  KANBAN_LABEL,
  STATUS_LABELS,
  kanbanBoard,
  type GithubIssue,
  type KanbanColumn,
} from "@/lib/github-issues";
import { IssueLine, IssueStatusBadge, fmtDay } from "./issues-shared";

const COLUMN_HINT: Record<KanbanColumn, string> = {
  unplanned: "Terbuka, belum diberi label status — belum masuk rencana rilis",
  todo: `Label ${STATUS_LABELS.todo}`,
  in_progress: `Label ${STATUS_LABELS.in_progress}`,
  decision: `Label ${STATUS_LABELS.decision}`,
  closed: `Ditutup ${KANBAN_CLOSED_DAYS} hari terakhir`,
};

/**
 * Tab Kanban (read-only): 5 kolom dari label `status:*` GitHub, yang
 * disamakan dengan `sprint.md` oleh `/pagi` Tahap 4 dan dicabut `/wrapup` saat
 * issue ditutup (keputusan owner 2026-10-13). Status diubah di GitHub/rencana,
 * bukan dengan menggeser kartu.
 */
export function IssuesKanban({ issues, today }: { issues: GithubIssue[]; today: string }) {
  const board = useMemo(() => kanbanBoard(issues, today), [issues, today]);
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      {KANBAN_COLUMNS.map((col) => (
        <section
          key={col}
          aria-label={KANBAN_LABEL[col]}
          className={cn(
            "flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/30 p-3",
            col === "decision" && board.decision.length > 0 && "border-amber-500/40 bg-amber-500/5",
          )}
        >
          <header>
            <h3 className="flex items-center justify-between text-sm font-medium">
              {KANBAN_LABEL[col]}
              <span className="tabular-nums text-muted-foreground">{board[col].length}</span>
            </h3>
            <p className="text-[11px] text-muted-foreground">{COLUMN_HINT[col]}</p>
          </header>
          {board[col].length === 0 ? (
            <p className="py-3 text-center text-xs text-muted-foreground">Kosong</p>
          ) : (
            <ul className="max-h-[32rem] space-y-2 overflow-y-auto pr-1">
              {board[col].map((i) => (
                <li key={i.number} className="space-y-1 rounded-md border bg-card p-2 shadow-sm">
                  <IssueLine issue={i} />
                  <p className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                    <span className="tabular-nums">
                      {col === "closed" ? `ditutup ${fmtDay(i.closedDate)}` : `dibuat ${fmtDay(i.createdDate)}`}
                    </span>
                    {col === "closed" && i.status !== "closed" && <IssueStatusBadge status={i.status} />}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
