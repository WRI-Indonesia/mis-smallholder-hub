"use client";

import { useRef, useState, type ReactNode } from "react";
import { useTheme } from "next-themes";
import { Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, BookOpenCheck, Bug, ChevronDown, Gauge, Minus, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { TechDebtItem } from "@/lib/tech-debt";
import type { ReleaseMetric } from "@/types/release-metrics";
import type { RoadmapSummary } from "@/types/roadmap";
import { dayEpoch, effectiveDate, fmt1, fmt2, fmtDate, fmtDelta, fmtInt, fmtPct1, fmtRvs, issueUrl, releaseUrl } from "./metrics-shared";
import { RvsCurveChart } from "./rvs-curve-chart";
import { RvsPeriodBars } from "./rvs-period-bars";
import { RoadmapStepChart, TestCountChart } from "./metrics-small-charts";
import { RoadmapDetail } from "./roadmap-detail";
import { TimeWindowButtons, availableWindows } from "./time-window";

/**
 * Dashboard Metrik Rilis (#227, disederhanakan): halaman menjawab tiga
 * pertanyaan berurutan — sekarang di mana (3 kartu KPI) → lajunya bagaimana
 * (tiga grafik berbagi SATU rentang waktu) → apa isinya (akordeon rincian).
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

function ChartCard({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle: string;
  /** Tautan opsional di kanan judul, mis. "lihat rincian" ke akordeon di bawah. */
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="h-full border border-border/60 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-baseline justify-between gap-2 text-sm font-medium">
          {title}
          {action}
        </CardTitle>
        <p className="text-xs font-normal text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
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

export function MetricsDashboardClient({
  releases,
  techDebt,
  roadmap,
  today,
  helpSlot,
}: {
  releases: ReleaseMetric[];
  techDebt: TechDebtItem[];
  roadmap: RoadmapSummary;
  today: string;
  helpSlot?: ReactNode;
}) {
  const { resolvedTheme } = useTheme();
  const [windowDays, setWindowDays] = useState<number | null>(null);
  const [roadmapOpen, setRoadmapOpen] = useState(false);
  const [releasesOpen, setReleasesOpen] = useState(false);
  const [paceOpen, setPaceOpen] = useState(false);
  const [tdOpen, setTdOpen] = useState(false);

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

  // Payload: hanya titik terukur (tidak ditarik ke belakang, spec §2.3).
  const payloadPts = releases.filter((r) => r.payloadMb != null);
  const payloadFirst = payloadPts[0]?.payloadMb ?? null;
  const payloadLast = payloadPts.length > 1 ? payloadPts[payloadPts.length - 1].payloadMb : null;

  // Arah TD: bandingkan dua nilai TD tercatat terakhir.
  const tdSeries = releases.map((r) => r.techDebt).filter((v): v is number => v != null);
  const tdPrev = tdSeries.length > 1 ? tdSeries[tdSeries.length - 2] : null;
  const tdDir = td != null && tdPrev != null ? Math.sign(td - tdPrev) : 0;

  // Tanda delta dihitung, bukan prefix hardcode — nilai negatif jangan
  // dirender "+-2,0" (#229). Formatter sudah membawa "-" untuk nilai negatif.
  const plus = (n: number) => (n < 0 ? "" : "+");
  const roadmapDiff = last.roadmapPct - first.roadmapPct;

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

      {/* Sekarang di mana — tiga angka utama, tanpa pengulangan di bawahnya */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
        <Card className="border border-border/60 shadow-sm">
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <Activity className="h-3.5 w-3.5" aria-hidden /> RVS sekarang
            </p>
            <p className="mt-1 text-[28px] leading-tight font-medium tabular-nums">{fmtRvs(last)}</p>
            <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
              {fmtPct1(((last.rvs - first.rvs) / first.rvs) * 100).replace("%", "")}% dari anchor {fmtInt(first.rvs)}
            </p>
          </CardContent>
        </Card>

        <Card
          {...openProps("roadmap", "Progres roadmap — klik untuk membuka rincian 48 fase")}
          className="cursor-pointer border border-border/60 shadow-sm transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-ring"
        >
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <Gauge className="h-3.5 w-3.5" aria-hidden /> Roadmap · klik untuk rincian
            </p>
            <p className="mt-1 text-[28px] leading-tight font-medium tabular-nums">{fmtPct1(last.roadmapPct)}</p>
            <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
              {plus(roadmapDiff)}
              {fmt1(roadmapDiff)} pt sejak {first.version} · sisa {fmt2(100 - roadmap.pct)} pp
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <BookOpenCheck className="h-3.5 w-3.5" aria-hidden /> Test otomatis
            </p>
            <p className="mt-1 text-[28px] leading-tight font-medium tabular-nums">
              {lastTest != null ? fmtInt(lastTest) : "—"}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
              {firstTest != null && firstTest > 0 && lastTest != null
                ? `${plus(lastTest - firstTest)}${fmtInt(((lastTest - firstTest) / firstTest) * 100)}% dari ≈${fmtInt(firstTest)}`
                : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lajunya bagaimana — satu rentang waktu untuk ketiga grafik */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">Rentang waktu — berlaku untuk ketiga grafik di bawah</p>
        <TimeWindowButtons value={windowDays} onChange={setWindowDays} windows={availableWindows(spanDays)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Kurva RVS" subtitle="Kumulatif per tanggal rilis; garis putus = angka estimasi.">
          <RvsCurveChart releases={releases} today={today} windowDays={windowDays} dark={dark} gridColor={gridColor} surface={surface} />
        </ChartCard>
        <ChartCard
          title="Progres roadmap"
          subtitle="Persen tertimbang menuju 1.0; naik diskret tiap fase selesai."
          action={
            <button
              type="button"
              onClick={() => jumpTo("roadmap")}
              className="shrink-0 text-xs font-normal text-blue-600 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring dark:text-amber-400"
              title="Buka rincian 48 fase penyusun angka ini"
            >
              lihat rincian
            </button>
          }
        >
          <RoadmapStepChart releases={releases} today={today} windowDays={windowDays} dark={dark} gridColor={gridColor} surface={surface} />
        </ChartCard>
        <ChartCard title="Jumlah test otomatis" subtitle="Per rilis; titik berongga = angka estimasi.">
          <TestCountChart releases={releases} today={today} windowDays={windowDays} dark={dark} gridColor={gridColor} surface={surface} />
        </ChartCard>
      </div>

      {/* Kualitas — satu jalur angka, bukan empat kartu setinggi KPI */}
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
            tdDir > 0 && "bg-amber-500/5"
          )}
        >
          <p className="text-xs text-muted-foreground">Tech debt aktif · klik</p>
          <p className="mt-0.5 flex items-center gap-1 text-lg font-medium tabular-nums">
            {td != null ? fmtInt(td) : "—"}
            {tdDir > 0 && <ArrowUpRight className="h-4 w-4 text-amber-600" aria-label="naik" />}
            {tdDir < 0 && <ArrowDownRight className="h-4 w-4 text-emerald-600" aria-label="turun" />}
            {tdDir === 0 && td != null && <Minus className="h-4 w-4 text-muted-foreground" aria-label="tetap" />}
          </p>
          <p className="text-xs text-muted-foreground tabular-nums">
            {tdPrev != null && td != null && td !== tdPrev ? `${fmtInt(tdPrev)} → ${fmtInt(td)}` : "stabil beberapa rilis"}
          </p>
        </div>

        <div className="bg-card p-3">
          <p className="text-xs text-muted-foreground">Audit Bantuan</p>
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
            <Package className="h-3.5 w-3.5" aria-hidden /> Payload peta
          </p>
          {payloadFirst != null && payloadLast != null ? (
            <>
              <p className="mt-0.5 text-lg font-medium tabular-nums">
                {payloadLast <= payloadFirst ? "−" : "+"}
                {fmt1(Math.abs((1 - payloadLast / payloadFirst) * 100))}%
              </p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {fmt2(payloadFirst)} → {fmt2(payloadLast)} MB · dua titik
              </p>
            </>
          ) : (
            <>
              <p className="mt-0.5 text-lg font-medium tabular-nums">{payloadFirst != null ? `${fmt2(payloadFirst)} MB` : "—"}</p>
              <p className="text-xs text-muted-foreground">baseline pertama</p>
            </>
          )}
        </div>
      </div>

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
                href="https://github.com/WRI-Indonesia/mis-smallholder-hub/blob/mvp/docs/project/tech-debt.md"
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
