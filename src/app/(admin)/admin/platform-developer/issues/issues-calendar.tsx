"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MONTH_NAMES_ID } from "@/lib/format";
import { cn } from "@/lib/utils";
import { dailyActivity, monthGrid, shiftMonth, type GithubIssue } from "@/lib/github-issues";
import { IssueLine, IssueStatusBadge, fmtDay } from "./issues-shared";

const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const MONTH_RE = /^\d{4}-\d{2}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const monthLabel = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return `${MONTH_NAMES_ID[m - 1]} ${y}`;
};

/**
 * Tab Kalender: per tanggal WIB, jumlah issue dibuat (biru, "+n") dan ditutup
 * (hijau, "✓n"). Bulan (`?bulan=`) dan tanggal terpilih (`?tgl=`) di URL.
 */
export function IssuesCalendar({
  issues,
  today,
  get,
  setMany,
}: {
  issues: GithubIssue[];
  today: string;
  get: (key: string) => string | null;
  setMany: (values: Record<string, string | null>) => void;
}) {
  const activity = useMemo(() => dailyActivity(issues), [issues]);
  const currentMonth = today.slice(0, 7);
  const monthParam = get("bulan");
  const month = MONTH_RE.test(monthParam ?? "") ? (monthParam as string) : currentMonth;
  const dayParam = get("tgl");
  const selected = DATE_RE.test(dayParam ?? "") && dayParam!.startsWith(month) ? dayParam : null;
  const cells = monthGrid(month);

  let monthCreated = 0;
  let monthClosed = 0;
  for (const d of cells) {
    const a = d ? activity.get(d) : undefined;
    monthCreated += a?.created.length ?? 0;
    monthClosed += a?.closed.length ?? 0;
  }
  const goMonth = (m: string) => setMany({ bulan: m === currentMonth ? null : m, tgl: null });
  const day = selected ? activity.get(selected) : undefined;

  return (
    <Card className="border border-border/60 shadow-sm">
      <CardContent className="space-y-4 pt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Button type="button" variant="ghost" size="icon" onClick={() => goMonth(shiftMonth(month, -1))} aria-label="Bulan sebelumnya">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="min-w-[10rem] text-center font-semibold">{monthLabel(month)}</h2>
            <Button type="button" variant="ghost" size="icon" onClick={() => goMonth(shiftMonth(month, 1))} aria-label="Bulan berikutnya">
              <ChevronRight className="h-4 w-4" />
            </Button>
            {month !== currentMonth && (
              <Button type="button" variant="ghost" className="h-8 text-xs" onClick={() => goMonth(currentMonth)}>
                Bulan ini
              </Button>
            )}
          </div>
          <p className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-sky-500" aria-hidden /> Dibuat {monthCreated}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden /> Ditutup {monthClosed}
            </span>
          </p>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground" aria-hidden>
          {WEEKDAYS.map((w) => (
            <div key={w}>{w}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, idx) => {
            if (!d) return <div key={`pad-${idx}`} />;
            const a = activity.get(d);
            const created = a?.created.length ?? 0;
            const closed = a?.closed.length ?? 0;
            const empty = created + closed === 0;
            return (
              <button
                key={d}
                type="button"
                disabled={empty}
                aria-pressed={selected === d}
                aria-label={`${fmtDay(d)}: ${created} dibuat, ${closed} ditutup`}
                onClick={() => setMany({ tgl: selected === d ? null : d })}
                className={cn(
                  "flex min-h-16 flex-col items-start gap-0.5 rounded-md border p-1.5 text-left text-xs transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                  empty ? "border-transparent text-muted-foreground/60" : "border-border hover:bg-muted/50",
                  selected === d && "border-primary bg-primary/10",
                  d === today && "ring-1 ring-primary/50",
                )}
              >
                <span className={cn("tabular-nums", d === today && "font-semibold text-primary")}>{Number(d.slice(8))}</span>
                {created > 0 && <span className="tabular-nums font-medium text-sky-700 dark:text-sky-300">+{created}</span>}
                {closed > 0 && <span className="tabular-nums font-medium text-emerald-700 dark:text-emerald-300">✓{closed}</span>}
              </button>
            );
          })}
        </div>

        {selected ? (
          <div className="space-y-3 border-t pt-4">
            <h3 className="font-medium">{fmtDay(selected)}</h3>
            {(["created", "closed"] as const).map((kind) =>
              (day?.[kind].length ?? 0) > 0 ? (
                <div key={kind} className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">{kind === "created" ? "Dibuat" : "Ditutup"}</p>
                  <ul className="space-y-1">
                    {day![kind].map((i) => (
                      <li key={i.number} className="flex items-start justify-between gap-2">
                        <IssueLine issue={i} />
                        <IssueStatusBadge status={i.status} />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null,
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Klik tanggal yang berangka untuk melihat daftar issue-nya.</p>
        )}
      </CardContent>
    </Card>
  );
}
