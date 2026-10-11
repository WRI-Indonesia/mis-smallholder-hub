"use client";

import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Activity, AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, BookOpenCheck, Bug, CalendarClock, ChevronDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { CurrentReleaseSummary } from "@/lib/release-plan";
import { cn } from "@/lib/utils";
import type { TechDebtItem } from "@/lib/tech-debt";
import type { ReleaseMetric } from "@/types/release-metrics";
import type { RoadmapSummary } from "@/types/roadmap";
import { dayEpoch, effectiveDate, fmt1, fmtDate, fmtDelta, fmtInt, fmtPct1, fmtPoints, fmtRvs, docUrl, issueUrl, releaseUrl } from "./metrics-shared";
import { RvsCurveChart } from "./rvs-curve-chart";
import { RvsPeriodBars } from "./rvs-period-bars";
import { RoadmapStepChart, TestCountChart } from "./metrics-small-charts";
import { RoadmapDetail } from "./roadmap-detail";
import { TimeWindowButtons, availableWindows } from "./time-window";

/**
 * Dashboard Metrik Rilis (#227, disederhanakan; dirombak #421): halaman menjawab
 * berurutan — apa yang sudah dirilis & apa yang sedang dikejar (Rilis terakhir +
 * Rilis berjalan dari sprint.md) → sehat atau tidak (strip Bug · Tech debt ·
 * Bantuan · Test bertren) → lajunya bagaimana (SATU grafik besar bertab, satu
 * rentang waktu) → apa isinya (akordeon rincian). Kartu Payload peta dihapus
 * (#421): terakhir diukur v0.35.0, tak pernah otomatis — riwayatnya di Daftar rilis.
 *
 * Aturan yang dipegang: tidak ada angka yang tampil dua kali di layar yang sama
 * (dulu kartu "Kualitas" mengulang tiga kartu di bawahnya), tidak ada kontrol
 * waktu per chart (sumbu X ketiganya harus sebanding), dan tampilan berkedalaman
 * analis (perolehan per periode, daftar rilis) turun ke akordeon — datanya utuh,
 * hanya tidak lagi menyambut lebih dulu. Sentence case, bobot font 400/500,
 * tanpa gradient/shadow dekoratif; estimasi ± dan `—` tampil apa adanya (§2.3).
 */

const lastOf = <T,>(arr: T[], pick: (t: T) => number | null): number | null => {
  for (let i = arr.length - 1; i >= 0; i--) {
    const v = pick(arr[i]);
    if (v != null) return v;
  }
  return null;
};

/** Teks catatan dengan setiap "#123" jadi tautan issue GitHub (tab baru). */
function LinkifiedNotes({ notes }: { notes: string }) {
  const parts = notes.split(/(#\d+)/g);
  return (
    <>
      {parts.map((part, i) =>
        /^#\d+$/.test(part) ? (
          <a
            key={i}
            href={issueUrl(part)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline-offset-2 hover:underline hover:text-blue-700 dark:text-amber-400 dark:hover:text-amber-300"
            title={`Buka issue ${part} di GitHub (tab baru)`}
          >
            {part}
          </a>
        ) : (
          part
        )
      )}
    </>
  );
}

/** Card collapsible ber-header seragam untuk keempat akordeon rincian. */
function CollapsibleSection({
  title,
  meta,
  subtitle,
  open,
  onOpenChange,
  children,
}: {
  title: string;
  /** Angka ringkas di kanan judul — isi akordeon terbaca tanpa membukanya. */
  meta: string;
  subtitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <Card className="border border-border/60 shadow-sm">
      <Collapsible open={open} onOpenChange={onOpenChange}>
        <CollapsibleTrigger
          render={
            <button className="w-full text-left focus-visible:outline-2 focus-visible:outline-ring">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  {title}
                  <span className="ml-auto text-xs font-normal tabular-nums text-muted-foreground">{meta}</span>
                  <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
                </CardTitle>
                <p className="text-xs font-normal text-muted-foreground">{subtitle}</p>
              </CardHeader>
            </button>
          }
        />
        <CollapsibleContent>{children}</CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

type ChartTab = "rvs" | "roadmap" | "test";
/** Tinggi grafik bertab (#421) — dulu tiga grafik 200 px berdampingan. */
const CHART_H = 300;

/** Panah tren; warna mengikuti arah yang "baik" untuk metrik itu. */
function TrendIcon({ dir, goodWhen }: { dir: number | null; goodWhen: "up" | "down" }) {
  // Nilai/pembanding tak tercatat → tanpa ikon (jangan klaim "tetap" tanpa data — review #421).
  if (dir == null) return null;
  if (dir === 0) return <Minus className="h-4 w-4 text-muted-foreground" aria-label="tetap" />;
  const good = (dir > 0 && goodWhen === "up") || (dir < 0 && goodWhen === "down");
  const Icon = dir > 0 ? ArrowUpRight : ArrowDownRight;
  return <Icon className={cn("h-4 w-4", good ? "text-emerald-600" : "text-amber-600")} aria-label={dir > 0 ? "naik" : "turun"} />;
}

/** Kartu "Rilis berjalan" (#421) — pengganti kartu Payload peta; data dari sprint.md. */
function CurrentReleaseCard({ summary, planUpdatedAt, canOpenPlan }: { summary: CurrentReleaseSummary | null; planUpdatedAt?: string; canOpenPlan: boolean }) {
  if (!summary) {
    return (
      <Card className="border border-border/60 shadow-sm">
        <CardContent className="flex h-full items-center p-4 text-sm text-muted-foreground">
          {canOpenPlan ? "Tidak ada rilis yang sedang dikejar." : "Ringkasan rilis berjalan hanya untuk pengguna dengan akses Rencana Pengembangan."}
        </CardContent>
      </Card>
    );
  }
  const pct = summary.total > 0 ? Math.round((summary.done / summary.total) * 100) : 0;
  const late = summary.state === "late";
  return (
    <Card className="border border-border/60 shadow-sm">
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5" aria-hidden /> Rilis berjalan
          </p>
          <span className="text-xs text-muted-foreground tabular-nums">
            target {fmtDate(summary.end)}
            {late ? (
              <span className="ml-1 font-medium text-amber-600"> · lewat {fmtInt(-summary.daysToTarget)} hari</span>
            ) : summary.day != null ? (
              ` · hari ke-${fmtInt(summary.day)}/${fmtInt(summary.days)}, sisa ${fmtInt(summary.daysToTarget)} hari`
            ) : null}
          </span>
        </div>
        <div>
          <p className="truncate text-sm" title={summary.title}>
            <span className="text-[22px] leading-tight font-medium">{summary.version}</span>{" "}
            <span className="text-muted-foreground">{summary.title}</span>
          </p>
          <div className="mt-2 flex items-center gap-3">
            <div
              className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={summary.total}
              aria-valuenow={summary.done}
              aria-label={`${summary.done} dari ${summary.total} butir selesai`}
            >
              <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
            <span className="whitespace-nowrap text-sm font-medium tabular-nums">
              {fmtInt(summary.done)}/{fmtInt(summary.total)} butir
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground tabular-nums">
            {fmtPoints(summary.donePoints)}/{fmtPoints(summary.totalPoints)} poin selesai
            {summary.inProgress > 0 && ` · ${fmtInt(summary.inProgress)} dikerjakan`}
            {summary.decisions > 0 && <span className="text-amber-600"> · {fmtInt(summary.decisions)} menunggu keputusan</span>}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>sumber: docs/project/sprint.md{planUpdatedAt ? ` · diperbarui ${fmtDate(planUpdatedAt)}` : ""}</span>
          {canOpenPlan && (
            <Link href="/admin/data-analyst/sprint" className="inline-flex items-center gap-1 text-blue-600 underline-offset-2 hover:underline dark:text-amber-400">
              Rencana Pengembangan <ArrowRight className="h-3 w-3" aria-hidden />
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function MetricsDashboardClient({
  releases,
  techDebt,
  roadmap,
  today,
  currentRelease = null,
  planUpdatedAt,
  canOpenPlan = false,
  helpSlot,
}: {
  releases: ReleaseMetric[];
  techDebt: TechDebtItem[];
  roadmap: RoadmapSummary;
  today: string;
  /** Ringkasan rilis yang sedang dikejar (sprint.md); null = tak ada (#421). */
  currentRelease?: CurrentReleaseSummary | null;
  planUpdatedAt?: string;
  /** Tautan "Rencana Pengembangan" hanya bila pengguna ber-VIEW data-analyst-sprint. */
  canOpenPlan?: boolean;
  helpSlot?: ReactNode;
}) {
  const { resolvedTheme } = useTheme();
  const [windowDays, setWindowDays] = useState<number | null>(null);
  const [roadmapOpen, setRoadmapOpen] = useState(false);
  const [releasesOpen, setReleasesOpen] = useState(false);
  const [paceOpen, setPaceOpen] = useState(false);
  const [tdOpen, setTdOpen] = useState(false);
  const [chartTab, setChartTab] = useState<ChartTab>("rvs");

  // Hanya dua akordeon yang punya "pintu masuk" dari atas: kartu Roadmap dan
  // angka Tech debt. Grafiknya sendiri sudah terlihat tanpa perlu melompat.
  type SectionKey = "roadmap" | "td";
  const roadmapRef = useRef<HTMLDivElement>(null);
  const tdRef = useRef<HTMLDivElement>(null);
  const [flash, setFlash] = useState<SectionKey | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const jumpTo = (key: SectionKey) => {
    // Akses ref hanya di event handler (rule react-hooks/refs).
    const target = key === "roadmap" ? roadmapRef : tdRef;
    if (key === "roadmap") setRoadmapOpen(true);
    else setTdOpen(true);
    requestAnimationFrame(() => target.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    setFlash(key);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 1600);
  };
  const flashClass = (key: SectionKey) =>
    cn("scroll-mt-4 rounded-xl transition-shadow duration-500", flash === key && "ring-2 ring-primary/50");
  const openProps = (key: SectionKey, label: string) => ({
    role: "button" as const,
    tabIndex: 0,
    onClick: () => jumpTo(key),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        jumpTo(key);
      }
    },
    title: label,
    "aria-label": label,
  });

  const dark = resolvedTheme === "dark";
  const gridColor = dark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.07)";
  const surface = dark ? "#26332a" : "#ffffff";

  const first = releases[0];
  const last = releases[releases.length - 1];
  const released = releases.filter((r) => !r.isProvisional);
  const lastReleased = released[released.length - 1];
  const spanDays = dayEpoch(effectiveDate(last, today)) - dayEpoch(effectiveDate(first, today));

  const firstTest = releases.find((r) => r.testCount != null)?.testCount ?? null;
  const lastTest = lastOf(releases, (r) => r.testCount);
  const bugOpen = lastOf(releases, (r) => r.bugOpen);
  const td = lastOf(releases, (r) => r.techDebt);
  const bantuan = [...releases].reverse().find((r) => r.bantuanDone != null);

  // Arah TD: bandingkan dua nilai TD tercatat terakhir.
  const tdSeries = releases.map((r) => r.techDebt).filter((v): v is number => v != null);
  const tdPrev = tdSeries.length > 1 ? tdSeries[tdSeries.length - 2] : null;
  const tdDir = td != null && tdPrev != null ? Math.sign(td - tdPrev) : null;

  // Tanda delta dihitung, bukan prefix hardcode — nilai negatif jangan
  // dirender "+-2,0" (#229). Formatter sudah membawa "-" untuk nilai negatif.
  const plus = (n: number) => (n < 0 ? "" : "+");

  // Kartu KPI membandingkan dengan RILIS TERAKHIR, bukan anchor v0.9.0: persen
  // kumulatif sejak awal proyek tak menjawab "rilis kemarin menambah apa" (#392).
  const lastTestReleased = lastReleased?.testCount ?? null;
  const prevTestReleased = lastOf(released.slice(0, -1), (r) => r.testCount);
  // Arah Test = nilai SEKARANG vs rilis terakhir (sama dengan TD: nilai terakhir vs
  // sebelumnya). Tepat sesudah rilis (belum ada pertambahan) → perolehan rilis itu (review #421).
  const testSinceRelease = lastTest != null && lastTestReleased != null && lastTest !== lastTestReleased ? lastTest - lastTestReleased : null;
  const testDelta =
    testSinceRelease ?? (lastTestReleased != null && prevTestReleased != null ? lastTestReleased - prevTestReleased : null);
  const testDeltaLabel =
    testSinceRelease != null && lastReleased ? `sejak ${lastReleased.version}` : lastReleased ? `di ${lastReleased.version}` : "";
  // Roadmap kartu "Rilis terakhir" = nilai SAAT rilis itu, bukan baris siklus berjalan;
  // nilai kini (roadmap.md live) disebut terpisah bila berbeda (review #421).
  const releasedRoadmapPct = lastReleased?.roadmapPct ?? last.roadmapPct;

  // Roadmap: angka lintas baseline tak sebanding — sebut nilai beku baseline
  // sebelumnya (titik terakhir sebelum reset terbaru), bukan selisih sejak v0.9.0.
  let resetIdx = -1;
  releases.forEach((r, i) => {
    if (r.roadmapReset) resetIdx = i;
  });
  const frozenPct = resetIdx > 0 ? releases[resetIdx - 1].roadmapPct : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-medium">Metrik rilis</h1>
          <p className="text-sm text-muted-foreground">
            {first.releasedAt ? fmtDate(first.releasedAt) : ""} – {lastReleased?.releasedAt ? fmtDate(lastReleased.releasedAt) : ""} · {fmtInt(released.length)} rilis + siklus berjalan
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-normal">
            terukur sejak {releases.find((r) => !r.isEstimated && !r.isProvisional)?.version ?? "—"}
          </Badge>
          {helpSlot}
        </div>
      </div>

      {/* #421 — Ringkasan dulu: rilis terakhir (nilai yang sudah dirilis) + rilis berjalan (yang sedang dikejar) */}
      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="border border-border/60 shadow-sm">
          <CardContent className="space-y-3 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                <Activity className="h-3.5 w-3.5" aria-hidden /> Rilis terakhir
              </p>
              {lastReleased && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  <a href={releaseUrl(lastReleased.version)} target="_blank" rel="noopener noreferrer" className="font-medium text-foreground underline-offset-2 hover:underline">
                    {lastReleased.version}
                  </a>
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  RVS (nilai kumulatif)
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <button
                          type="button"
                          className="rounded-full px-0.5 leading-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                          aria-label="Apa itu RVS?"
                        />
                      }
                    >
                      ⓘ
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      Release Value Score: skor kumulatif nilai kerja yang dirilis — fitur/UX, perbaikan bug, performa terukur, test baru, review, dan tech debt ditutup. Anchor v0.9.0 = 1.000 (docs/standards/versioning.md §3).
                    </TooltipContent>
                  </Tooltip>
                </p>
                <p className="text-[28px] leading-tight font-medium tabular-nums">{lastReleased ? fmtRvs(lastReleased) : "—"}</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {lastReleased?.delta != null ? `${plus(lastReleased.delta)}${fmtInt(lastReleased.delta)} dari rilis ini · ` : ""}anchor {first.version} = {fmtInt(first.rvs)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => jumpTo("roadmap")}
                className="rounded-md text-left transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-ring"
                title={`Buka rincian ${fmtInt(roadmap.total)} fase penyusun angka ini`}
              >
                <p className="text-xs text-muted-foreground">Progres roadmap · rincian ↓</p>
                <p className="text-[28px] leading-tight font-medium tabular-nums">{fmtPct1(releasedRoadmapPct)}</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {Math.abs(roadmap.pct - releasedRoadmapPct) >= 0.05 && <>kini {fmtPct1(roadmap.pct)} · </>}
                  {fmtPoints(roadmap.earned)}/{fmtInt(roadmap.max)} poin · {fmtInt(roadmap.total)} fase
                  {frozenPct != null && ` · baseline lama beku ${fmtPct1(frozenPct)}`}
                </p>
              </button>
            </div>
          </CardContent>
        </Card>

        <CurrentReleaseCard summary={currentRelease} planUpdatedAt={planUpdatedAt} canOpenPlan={canOpenPlan} />
      </div>

      {/* Kesehatan — satu jalur angka bertren (dulu di bawah grafik; Payload peta usang dihapus, #421) */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border/60 bg-border/60 sm:grid-cols-4">
        <div className={cn("bg-card p-3", bugOpen && "bg-amber-500/5")}>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {bugOpen ? <AlertTriangle className="h-3.5 w-3.5 text-amber-600" aria-hidden /> : <Bug className="h-3.5 w-3.5" aria-hidden />}
            Bug terbuka
          </p>
          <p className="mt-0.5 text-lg font-medium tabular-nums">{bugOpen != null ? fmtInt(bugOpen) : "—"}</p>
          <p className="text-xs text-muted-foreground">{bugOpen ? "perlu perhatian" : "tidak ada yang terbuka"}</p>
        </div>

        <div
          {...openProps("td", `Tech debt aktif ${td != null ? fmtInt(td) : ""} — klik untuk daftar lengkap`)}
          className={cn(
            "cursor-pointer bg-card p-3 transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-ring",
            tdDir != null && tdDir > 0 && "bg-amber-500/5"
          )}
        >
          <p className="text-xs text-muted-foreground">Tech debt aktif · daftar ↓</p>
          <p className="mt-0.5 flex items-center gap-1 text-lg font-medium tabular-nums">
            {td != null ? fmtInt(td) : "—"}
            <TrendIcon dir={tdDir} goodWhen="down" />
          </p>
          <p className="text-xs text-muted-foreground tabular-nums">
            {tdPrev != null && td != null && td !== tdPrev ? `${fmtInt(tdPrev)} → ${fmtInt(td)}` : "stabil beberapa rilis"}
          </p>
        </div>

        <div className="bg-card p-3">
          <p className="text-xs text-muted-foreground">Bantuan</p>
          <p className="mt-0.5 text-lg font-medium tabular-nums">
            {bantuan ? `${fmtInt(bantuan.bantuanDone as number)}/${fmtInt(bantuan.bantuanTotal as number)}` : "—"}
          </p>
          <p className="text-xs text-muted-foreground tabular-nums">
            {bantuan
              ? `${fmtPct1(((bantuan.bantuanDone as number) / (bantuan.bantuanTotal as number)) * 100)} menu ber-tutorial`
              : "—"}
          </p>
        </div>

        <div className="bg-card p-3">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <BookOpenCheck className="h-3.5 w-3.5" aria-hidden /> Test otomatis
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-lg font-medium tabular-nums">
            {lastTest != null ? fmtInt(lastTest) : "—"}
            <TrendIcon dir={testDelta != null ? Math.sign(testDelta) : null} goodWhen="up" />
          </p>
          <p className="text-xs text-muted-foreground tabular-nums">
            {testDelta != null ? `${plus(testDelta)}${fmtInt(testDelta)} ${testDeltaLabel}` : "—"}
            {firstTest != null ? ` · awal ≈${fmtInt(firstTest)}` : ""}
          </p>
        </div>
      </div>

      {/* Lajunya bagaimana — satu grafik besar bertab, satu rentang waktu (#421) */}
      <Card className="border border-border/60 shadow-sm">
        <Tabs value={chartTab} onValueChange={(v) => setChartTab(v as ChartTab)}>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
            {/* Label ringkas + scroll horizontal: muat di 360 px (review #421). */}
            <TabsList className="max-w-full overflow-x-auto">
              <TabsTrigger value="rvs">RVS</TabsTrigger>
              <TabsTrigger value="roadmap">Roadmap</TabsTrigger>
              <TabsTrigger value="test">Test</TabsTrigger>
            </TabsList>
            <TimeWindowButtons value={windowDays} onChange={setWindowDays} windows={availableWindows(spanDays)} />
          </CardHeader>
          <CardContent>
            <TabsContent value="rvs">
              <p className="mb-2 text-xs text-muted-foreground">RVS kumulatif per tanggal rilis — naik setiap rilis membawa fitur, perbaikan, atau test; garis putus = angka estimasi (rekonstruksi sebelum pengukuran).</p>
              <RvsCurveChart releases={releases} today={today} windowDays={windowDays} dark={dark} gridColor={gridColor} surface={surface} height={CHART_H} />
            </TabsContent>
            <TabsContent value="roadmap">
              <p className="mb-2 text-xs text-muted-foreground">
                Persen tertimbang fase roadmap; naik diskret tiap fase selesai. Garis diputus saat baseline direset — baseline lama dipudarkan.{" "}
                <button type="button" onClick={() => jumpTo("roadmap")} className="text-blue-600 underline-offset-2 hover:underline dark:text-amber-400">
                  lihat rincian fase
                </button>
              </p>
              <RoadmapStepChart releases={releases} today={today} windowDays={windowDays} dark={dark} gridColor={gridColor} surface={surface} height={CHART_H} />
            </TabsContent>
            <TabsContent value="test">
              <p className="mb-2 text-xs text-muted-foreground">Jumlah test otomatis per rilis; titik berongga = angka estimasi.</p>
              <TestCountChart releases={releases} today={today} windowDays={windowDays} dark={dark} gridColor={gridColor} surface={surface} height={CHART_H} />
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      {/* Apa isinya — rincian yang dibuka saat dibutuhkan */}
      <div ref={roadmapRef} className={flashClass("roadmap")}>
        <CollapsibleSection
          title="Detail roadmap"
          meta={`${fmtPct1(roadmap.pct)} · ${fmtInt(roadmap.total)} fase`}
          subtitle="Dari mana angka Progres roadmap, sisanya apa saja; sumber: docs/project/roadmap.md (diparse saat build)."
          open={roadmapOpen}
          onOpenChange={setRoadmapOpen}
        >
          <RoadmapDetail summary={roadmap} dark={dark} />
        </CollapsibleSection>
      </div>

      <CollapsibleSection
        title="Daftar rilis"
        meta={`${fmtInt(released.length)} rilis`}
        subtitle="Terbaru di atas. Nilai ≈ = rekonstruksi retrospektif; sumber: docs/project/metrics.md."
        open={releasesOpen}
        onOpenChange={setReleasesOpen}
      >
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Versi</th>
                <th className="py-2 pr-3 font-medium">Tanggal</th>
                <th className="py-2 pr-3 text-right font-medium">RVS</th>
                <th className="py-2 pr-3 text-right font-medium">Roadmap</th>
                <th className="py-2 pr-3 text-right font-medium">Test</th>
                <th className="py-2 font-medium">Catatan</th>
              </tr>
            </thead>
            <tbody>
              {[...releases].reverse().map((r, ri, rev) => (
                <tr key={r.version} className="border-b border-border/40 align-top last:border-0">
                  <td className="py-2 pr-3 whitespace-nowrap font-medium">
                    {r.isProvisional ? (
                      "berjalan"
                    ) : (
                      <a
                        href={releaseUrl(r.version)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline-offset-2 hover:underline"
                        title={`Buka GitHub Release ${r.version} (tab baru)`}
                      >
                        {r.version}
                      </a>
                    )}
                    {r.isProvisional && (
                      <Badge
                        variant="outline"
                        className="ml-1.5 cursor-help font-normal text-muted-foreground"
                        title="Siklus kerja yang sedang berjalan (calon rilis berikutnya) — angka masih bisa berubah sampai dirilis."
                      >
                        belum dirilis
                      </Badge>
                    )}
                    {/breaking/i.test(r.notes) && (
                      <Badge
                        variant="outline"
                        className="ml-1.5 cursor-help border-amber-500/60 font-normal text-amber-700 dark:text-amber-400"
                        title="Rilis dengan perubahan yang memutus kompatibilitas (mis. perubahan skema data) — pre-1.0 tetap dirilis sebagai MINOR sesuai aturan versioning."
                      >
                        perubahan besar
                      </Badge>
                    )}
                  </td>
                  <td className="py-2 pr-3 whitespace-nowrap text-muted-foreground">{r.releasedAt ? fmtDate(r.releasedAt) : "—"}</td>
                  {/* Δ menempel pada RVS-nya — dulu kolom sendiri yang selalu sempit */}
                  <td className="py-2 pr-3 text-right whitespace-nowrap tabular-nums">
                    {fmtRvs(r)}
                    {r.delta != null && <span className="ml-1.5 text-xs text-muted-foreground">{fmtDelta(r.delta)}</span>}
                  </td>
                  <td className="py-2 pr-3 text-right whitespace-nowrap tabular-nums">
                    {fmtPct1(r.roadmapPct)}
                    {/* rev terbalik (terbaru dulu) → baris sebelumnya = ri+1 */}
                    {ri + 1 < rev.length && r.roadmapPct > rev[ri + 1].roadmapPct && (
                      <span className="ml-1 text-xs text-primary">+{fmt1(r.roadmapPct - rev[ri + 1].roadmapPct)}</span>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-right whitespace-nowrap tabular-nums">
                    {r.testCount != null ? (
                      <>
                        {r.isEstimated && "≈"}
                        {fmtInt(r.testCount)}
                        {ri + 1 < rev.length &&
                          rev[ri + 1].testCount != null &&
                          r.testCount > (rev[ri + 1].testCount as number) && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              +{fmtInt(r.testCount - (rev[ri + 1].testCount as number))}
                            </span>
                          )}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-2 text-xs leading-snug text-muted-foreground">
                    <LinkifiedNotes notes={r.notes} />
                    {/* Issue yang tidak tersebut di catatan tetap dapat tautan
                        (dulu kolom terpisah yang isinya hampir selalu kembar). */}
                    {r.issueRefs
                      .filter((ref) => !r.notes.includes(ref))
                      .map((ref) => (
                        <span key={ref}>
                          {" "}
                          <a
                            href={issueUrl(ref)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 underline-offset-2 hover:underline dark:text-amber-400"
                            title={`Buka issue ${ref} di GitHub (tab baru)`}
                          >
                            {ref}
                          </a>
                        </span>
                      ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </CollapsibleSection>

      <CollapsibleSection
        title="Laju RVS per periode"
        meta="hari kerja · Sabtu · Minggu"
        subtitle="Perolehan RVS dipecah jenis hari, dengan pilihan granularitas periode — tampilan analis, dibuka saat perlu."
        open={paceOpen}
        onOpenChange={setPaceOpen}
      >
        <CardContent>
          <RvsPeriodBars releases={releases} today={today} dark={dark} gridColor={gridColor} />
        </CardContent>
      </CollapsibleSection>

      <div ref={tdRef} className={flashClass("td")}>
        <CollapsibleSection
          title="Tech debt aktif"
          meta={`${fmtInt(techDebt.length)} item`}
          subtitle="Register debt yang belum selesai; sumber: docs/project/tech-debt.md (arsip selesai tidak ditampilkan)."
          open={tdOpen}
          onOpenChange={setTdOpen}
        >
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">ID</th>
                  <th className="py-2 pr-3 font-medium">Prioritas</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 font-medium">Judul</th>
                </tr>
              </thead>
              <tbody>
                {techDebt.map((t) => (
                  <tr key={t.id} className="border-b border-border/40 align-top last:border-0">
                    <td className="py-2 pr-3 whitespace-nowrap font-medium tabular-nums">{t.id}</td>
                    <td className="py-2 pr-3">
                      {t.priority ? (
                        <Badge
                          variant="outline"
                          className={cn("font-normal", t.priority === "P2" && "border-amber-500/60 text-amber-700 dark:text-amber-400")}
                        >
                          {t.priority}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap text-xs text-muted-foreground">{t.status}</td>
                    <td className="py-2 text-xs leading-snug">{t.title}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Rincian lengkap (evidence, owner, sequencing):{" "}
              <a
                href={docUrl("docs/project/tech-debt.md")}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline-offset-2 hover:underline dark:text-amber-400"
              >
                docs/project/tech-debt.md
              </a>
            </p>
          </CardContent>
        </CollapsibleSection>
      </div>
    </div>
  );
}
