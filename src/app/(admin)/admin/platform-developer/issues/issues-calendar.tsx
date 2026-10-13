"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MONTH_NAMES_ID } from "@/lib/format";
import { cn } from "@/lib/utils";
import { calendarDefaultMonth, dailyActivity, monthGrid, shiftMonth, type DayActivity, type GithubIssue } from "@/lib/github-issues";
import { IssueLine, IssueStatusBadge, fmtDay } from "./issues-shared";

const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
/** Bulan 01–12 saja: `2026-13` dari URL buatan tangan tak boleh jadi "undefined 2026" (review #429). */
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const KINDS = [
  { key: "created", label: "Dibuat" },
  { key: "closed", label: "Ditutup" },
] as const;
/** Judul per jenis di tooltip; sisanya "+n lainnya" — daftar lengkap di panel kanan. */
const TOOLTIP_PREVIEW = 3;

const monthLabel = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return `${MONTH_NAMES_ID[m - 1]} ${y}`;
};

/** Isi tooltip sel kalender: jumlah + cuplikan judul per jenis. */
function DayTooltip({ date, activity }: { date: string; activity: DayActivity }) {
  return (
    <>
      <p className="font-medium">{fmtDay(date)}</p>
      {KINDS.map(({ key, label }) => {
        const list = activity[key];
        if (list.length === 0) return null;
        return (
          <div key={key} className="w-full">
            <p className="opacity-80">
              {label} {list.length}
            </p>
            {list.slice(0, TOOLTIP_PREVIEW).map((i) => (
              <p key={i.number} className="truncate">
                #{i.number} {i.title}
              </p>
            ))}
            {list.length > TOOLTIP_PREVIEW && <p className="opacity-80">+{list.length - TOOLTIP_PREVIEW} lainnya</p>}
          </div>
        );
      })}
      <p className="opacity-80">Klik untuk daftar lengkap</p>
    </>
  );
}

/** Daftar issue dibuat/ditutup; `withDate` menambah tanggal (mode seluruh bulan). */
function ActivityList({ activity, withDate }: { activity: DayActivity; withDate: boolean }) {
  return (
    <>
      {KINDS.map(({ key, label }) =>
        activity[key].length > 0 ? (
          <div key={key} className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              {label} <span className="tabular-nums">{activity[key].length}</span>
            </p>
            <ul className="space-y-1.5">
              {activity[key].map((i) => (
                <li key={i.number} className="flex items-start justify-between gap-2">
                  <span className="min-w-0">
                    <IssueLine issue={i} />
                    {withDate && (
                      <span className="ml-1 whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                        · {fmtDay(key === "created" ? i.createdDate : i.closedDate)}
                      </span>
                    )}
                  </span>
                  <IssueStatusBadge status={i.status} />
                </li>
              ))}
            </ul>
          </div>
        ) : null,
      )}
    </>
  );
}

/**
 * Tab Kalender (keputusan owner 2026-10-13): kalender bulanan di kiri (±1/3),
 * detail di kanan (±2/3) — tanpa tanggal terpilih = seluruh issue bulan itu,
 * klik tanggal = issue hari itu; sorot sel = tooltip ringkas. Per tanggal WIB:
 * dibuat (biru, "+n") & ditutup (hijau, "✓n"). Bulan (`?bulan=`) dan tanggal
 * (`?tgl=`) di URL. Layar sempit: detail tersusun di bawah kalender.
 */
export function IssuesCalendar({
  issues,
  from,
  to,
  today,
  get,
  setMany,
}: {
  issues: GithubIssue[];
  /** Rentang Aktivitas (`?dari=`/`?sampai=`): kejadian di luarnya tidak diplot. */
  from: string | null;
  to: string | null;
  today: string;
  get: (key: string) => string | null;
  setMany: (values: Record<string, string | null>) => void;
}) {
  const activity = useMemo(() => dailyActivity(issues, { from, to }), [issues, from, to]);
  const currentMonth = today.slice(0, 7);
  const monthParam = get("bulan");
  const defaultMonth = calendarDefaultMonth(today, from, to);
  const month = MONTH_RE.test(monthParam ?? "") ? (monthParam as string) : defaultMonth;
  const dayParam = get("tgl");
  const selected = dayParam && DATE_RE.test(dayParam) && dayParam.startsWith(month) && activity.has(dayParam) ? dayParam : null;
  const cells = monthGrid(month);

  // Isi seluruh bulan untuk panel kanan saat belum ada tanggal dipilih (tanggal terbaru dulu).
  const monthActivity: DayActivity = { created: [], closed: [] };
  for (let i = cells.length - 1; i >= 0; i--) {
    const a = cells[i] ? activity.get(cells[i]!) : undefined;
    if (!a) continue;
    monthActivity.created.push(...a.created);
    monthActivity.closed.push(...a.closed);
  }
  const goMonth = (m: string) => setMany({ bulan: m === defaultMonth ? null : m, tgl: null });
  const detail = (selected && activity.get(selected)) || monthActivity;
  const detailEmpty = detail.created.length + detail.closed.length === 0;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="border border-border/60 shadow-sm lg:col-span-1">
        <CardContent className="space-y-3 pt-5">
          <div className="flex items-center justify-between gap-1">
            <Button type="button" variant="ghost" size="icon" onClick={() => goMonth(shiftMonth(month, -1))} aria-label="Bulan sebelumnya">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-center font-semibold">{monthLabel(month)}</h2>
            <Button type="button" variant="ghost" size="icon" onClick={() => goMonth(shiftMonth(month, 1))} aria-label="Bulan berikutnya">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-sky-500" aria-hidden /> Dibuat {monthActivity.created.length}
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden /> Ditutup {monthActivity.closed.length}
              </span>
            </span>
            {month !== currentMonth && (
              <Button type="button" variant="ghost" className="h-7 px-2 text-xs" onClick={() => goMonth(currentMonth)}>
                Bulan ini
              </Button>
            )}
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground" aria-hidden>
            {WEEKDAYS.map((w) => (
              <div key={w}>{w}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, idx) => {
              if (!d) return <div key={`pad-${idx}`} />;
              const a = activity.get(d);
              const dayNumber = <span className={cn("tabular-nums", d === today && "font-semibold text-primary")}>{Number(d.slice(8))}</span>;
              const cellClass = cn(
                "flex min-h-12 flex-col items-start rounded-md border p-1 text-left text-[11px] leading-tight",
                d === today && "ring-1 ring-primary/50",
              );
              if (!a) {
                return (
                  <div key={d} className={cn(cellClass, "border-transparent text-muted-foreground/60")}>
                    {dayNumber}
                  </div>
                );
              }
              return (
                <Tooltip key={d}>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        aria-pressed={selected === d}
                        aria-label={`${fmtDay(d)}: ${a.created.length} dibuat, ${a.closed.length} ditutup`}
                        onClick={() => setMany({ tgl: selected === d ? null : d })}
                        className={cn(
                          cellClass,
                          "border-border transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring",
                          selected === d && "border-primary bg-primary/10",
                        )}
                      />
                    }
                  >
                    {dayNumber}
                    {a.created.length > 0 && <span className="tabular-nums font-medium text-sky-700 dark:text-sky-300">+{a.created.length}</span>}
                    {a.closed.length > 0 && <span className="tabular-nums font-medium text-emerald-700 dark:text-emerald-300">✓{a.closed.length}</span>}
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm flex-col items-start gap-1">
                    <DayTooltip date={d} activity={a} />
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">Sorot tanggal berangka untuk ringkasan; klik untuk detail di kanan, klik lagi untuk kembali ke seluruh bulan.</p>
        </CardContent>
      </Card>

      <Card className="border border-border/60 shadow-sm lg:col-span-2">
        <CardContent className="space-y-3 pt-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h3 className="font-semibold">{selected ? fmtDay(selected) : `Seluruh ${monthLabel(month)}`}</h3>
              <p className="text-xs tabular-nums text-muted-foreground">
                {detail.created.length} issue dibuat · {detail.closed.length} issue ditutup
              </p>
            </div>
            {selected && (
              <Button type="button" variant="ghost" className="h-8 text-xs" onClick={() => setMany({ tgl: null })}>
                ← Seluruh bulan
              </Button>
            )}
          </div>
          <div className="max-h-[32rem] space-y-4 overflow-y-auto pr-1">
            {detailEmpty ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Tidak ada issue dibuat atau ditutup di bulan ini.</p>
            ) : (
              <ActivityList activity={detail} withDate={!selected} />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
