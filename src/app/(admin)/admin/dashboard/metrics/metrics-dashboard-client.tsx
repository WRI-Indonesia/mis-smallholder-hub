"use client";

import type { ReactNode } from "react";
import { useTheme } from "next-themes";
import { Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, BookOpenCheck, Bug, Gauge, Minus, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ReleaseMetric } from "@/types/release-metrics";
import { fmt1, fmt2, fmtDate, fmtDelta, fmtInt, fmtPct1, fmtRvs, issueUrl, releaseUrl } from "./metrics-shared";
import { RvsCurveChart } from "./rvs-curve-chart";
import { RvsPeriodBars } from "./rvs-period-bars";
import { RoadmapStepChart, TestCountChart } from "./metrics-small-charts";

/**
 * Dashboard Metrik Rilis (#227) — layout spec §3: baris KPI → Panel 1 kurva
 * RVS → Panel 2 perolehan per periode → Panel 3+4 berdampingan → Panel 5
 * kualitas + daftar rilis. Sentence case, bobot font 400/500, tanpa
 * gradient/shadow dekoratif (§5); estimasi ± dan `—` tampil apa adanya (§2.3).
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
            className="underline-offset-2 hover:underline hover:text-foreground"
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

function ChartCard({ title, subtitle, children, className }: { title: string; subtitle: string; children: ReactNode; className?: string }) {
  return (
    <Card className={cn("border border-border/60 shadow-sm", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <p className="text-xs font-normal text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function MetricsDashboardClient({
  releases,
  today,
  helpSlot,
}: {
  releases: ReleaseMetric[];
  today: string;
  helpSlot?: ReactNode;
}) {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const gridColor = dark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.07)";
  const surface = dark ? "#26332a" : "#ffffff";

  const first = releases[0];
  const last = releases[releases.length - 1];
  const released = releases.filter((r) => !r.isProvisional);
  const lastReleased = released[released.length - 1];

  const firstTest = releases.find((r) => r.testCount != null)?.testCount ?? null;
  const lastTest = lastOf(releases, (r) => r.testCount);
  const bugOpen = lastOf(releases, (r) => r.bugOpen);
  const td = lastOf(releases, (r) => r.techDebt);
  const bantuan = [...releases].reverse().find((r) => r.bantuanDone != null);

  // Payload: hanya titik terukur (tidak ditarik ke belakang, spec §2.3) — kartu
  // delta, bukan grafik (dua titik bukan tren, §4.6).
  const payloadPts = releases.filter((r) => r.payloadMb != null);
  const payloadFirst = payloadPts[0]?.payloadMb ?? null;
  const payloadLast = payloadPts.length > 1 ? payloadPts[payloadPts.length - 1].payloadMb : null;

  // Arah TD: bandingkan dua nilai TD tercatat terakhir (spec: sorot perubahan arah).
  const tdSeries = releases.map((r) => r.techDebt).filter((v): v is number => v != null);
  const tdPrev = tdSeries.length > 1 ? tdSeries[tdSeries.length - 2] : null;
  const tdDir = td != null && tdPrev != null ? Math.sign(td - tdPrev) : 0;

  const kpis = [
    {
      icon: Activity,
      label: "RVS sekarang",
      value: fmtRvs(last),
      sub: `${fmtPct1(((last.rvs - first.rvs) / first.rvs) * 100).replace("%", "")}% dari anchor ${fmtInt(first.rvs)}`,
    },
    {
      icon: Gauge,
      label: "Roadmap",
      value: fmtPct1(last.roadmapPct),
      sub: `+${fmt1(last.roadmapPct - first.roadmapPct)} pt sejak ${first.version}`,
    },
    {
      icon: BookOpenCheck,
      label: "Test",
      value: lastTest != null ? fmtInt(lastTest) : "—",
      sub: firstTest != null && lastTest != null ? `+${fmtInt(((lastTest - firstTest) / firstTest) * 100)}% dari ≈${fmtInt(firstTest)}` : "—",
    },
    {
      icon: Bug,
      label: "Kualitas",
      value: bugOpen != null ? `${fmtInt(bugOpen)} bug` : "—",
      sub: `TD ${td != null ? fmtInt(td) : "—"} · Bantuan ${bantuan ? `${fmtInt(bantuan.bantuanDone as number)}/${fmtInt(bantuan.bantuanTotal as number)}` : "—"}`,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-medium">Metrik rilis</h1>
          <p className="text-sm text-muted-foreground">
            {first.releasedAt ? fmtDate(first.releasedAt) : ""} – {lastReleased.releasedAt ? fmtDate(lastReleased.releasedAt) : ""} · {fmtInt(released.length)} rilis + siklus berjalan
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-normal">
            terukur sejak {releases.find((r) => !r.isEstimated && !r.isProvisional)?.version ?? "—"}
          </Badge>
          {helpSlot}
        </div>
      </div>

      {/* Baris KPI (§4.1) */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        {kpis.map((k) => (
          <Card key={k.label} className="border border-border/60 shadow-sm">
            <CardContent className="p-4">
              <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                <k.icon className="h-3.5 w-3.5" aria-hidden /> {k.label}
              </p>
              <p className="mt-1 text-[28px] font-medium leading-tight tabular-nums">{k.value}</p>
              <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">{k.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <ChartCard title="Kurva RVS" subtitle="Kumulatif pada sumbu kalender — jarak antar titik proporsional waktu; titik berongga bergaris putus = estimasi.">
        <RvsCurveChart releases={releases} today={today} dark={dark} gridColor={gridColor} surface={surface} />
      </ChartCard>

      <ChartCard title="Perolehan RVS per periode" subtitle="Batang bertumpuk per jenis hari; toggle granularitas periode.">
        <RvsPeriodBars releases={releases} today={today} dark={dark} gridColor={gridColor} />
      </ChartCard>

      <div className="grid gap-4 md:grid-cols-2">
        <ChartCard
          title="Progres roadmap"
          subtitle="Persen tertimbang menuju go-live 1.0 — naik diskret per fase selesai. Label plateau = berapa hari % tidak naik; datar ≠ berhenti, biasanya kerja bergeser ke kualitas (lihat RVS yang tetap naik)."
        >
          <RoadmapStepChart releases={releases} today={today} dark={dark} gridColor={gridColor} />
        </ChartCard>
        <ChartCard title="Jumlah test otomatis" subtitle="Per rilis; titik berongga = angka estimasi.">
          <TestCountChart releases={releases} today={today} dark={dark} gridColor={gridColor} surface={surface} />
        </ChartCard>
      </div>

      {/* Panel 5 — kualitas (§4.6) */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
        <Card className={cn("border shadow-sm", bugOpen ? "border-amber-500/50 bg-amber-500/5" : "border-border/60")}>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
              {bugOpen ? <AlertTriangle className="h-3.5 w-3.5 text-amber-600" aria-hidden /> : <Bug className="h-3.5 w-3.5" aria-hidden />} Bug register
            </p>
            <p className="mt-1 text-[28px] font-medium tabular-nums">{bugOpen != null ? fmtInt(bugOpen) : "—"}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{bugOpen ? "terbuka — perlu perhatian" : "sejak v0.17.0 (7/7 selesai)"}</p>
          </CardContent>
        </Card>
        <Card className={cn("border shadow-sm", tdDir > 0 ? "border-amber-500/50 bg-amber-500/5" : "border-border/60")}>
          <CardContent className="p-4">
            <p className="text-[13px] text-muted-foreground">Tech debt aktif</p>
            <p className="mt-1 flex items-center gap-1.5 text-[28px] font-medium tabular-nums">
              {td != null ? fmtInt(td) : "—"}
              {tdDir > 0 && <ArrowUpRight className="h-5 w-5 text-amber-600" aria-label="naik" />}
              {tdDir < 0 && <ArrowDownRight className="h-5 w-5 text-emerald-600" aria-label="turun" />}
              {tdDir === 0 && td != null && <Minus className="h-5 w-5 text-muted-foreground" aria-label="tetap" />}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
              {tdPrev != null && td != null && td !== tdPrev ? `berubah arah: ${fmtInt(tdPrev)} → ${fmtInt(td)}` : "stabil beberapa rilis terakhir"}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-border/60 shadow-sm">
          <CardContent className="p-4">
            <p className="text-[13px] text-muted-foreground">Audit Bantuan</p>
            <p className="mt-1 text-[28px] font-medium tabular-nums">
              {bantuan ? `${fmtInt(bantuan.bantuanDone as number)}/${fmtInt(bantuan.bantuanTotal as number)}` : "—"}
            </p>
            {bantuan && (
              <>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted" role="img" aria-label={`Cakupan tutorial ${fmtPct1(((bantuan.bantuanDone as number) / (bantuan.bantuanTotal as number)) * 100)}`}>
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${((bantuan.bantuanDone as number) / (bantuan.bantuanTotal as number)) * 100}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground tabular-nums">{fmtPct1(((bantuan.bantuanDone as number) / (bantuan.bantuanTotal as number)) * 100)} menu ber-tutorial</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card className="border border-border/60 shadow-sm">
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <Package className="h-3.5 w-3.5" aria-hidden /> Payload peta
            </p>
            {payloadFirst != null && payloadLast != null ? (
              <>
                <p className="mt-1 text-[28px] font-medium tabular-nums">
                  −{fmt1((1 - payloadLast / payloadFirst) * 100)}%
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                  {fmt2(payloadFirst)} → {fmt2(payloadLast)} MB · dua titik terukur, belum tren
                </p>
              </>
            ) : (
              <>
                <p className="mt-1 text-[28px] font-medium tabular-nums">{payloadFirst != null ? `${fmt2(payloadFirst)} MB` : "—"}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">baseline pertama — delta muncul di rilis berikutnya</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daftar rilis (layout owner: kartu & chart dulu, list paling bawah) */}
      <Card className="border border-border/60 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Daftar rilis</CardTitle>
          <p className="text-xs font-normal text-muted-foreground">
            Terbaru di atas. Nilai ≈ = rekonstruksi retrospektif; sumber: docs/project/metrics.md.
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Versi</th>
                <th className="py-2 pr-3 font-medium">Tanggal</th>
                <th className="py-2 pr-3 text-right font-medium">RVS</th>
                <th className="py-2 pr-3 text-right font-medium">Δ</th>
                <th className="py-2 pr-3 font-medium">Catatan</th>
                <th className="py-2 font-medium">Issue</th>
              </tr>
            </thead>
            <tbody>
              {[...releases].reverse().map((r) => (
                <tr key={r.version} className="border-b border-border/40 align-top last:border-0">
                  <td className="whitespace-nowrap py-2 pr-3 font-medium">
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
                  <td className="whitespace-nowrap py-2 pr-3 text-muted-foreground">{r.releasedAt ? fmtDate(r.releasedAt) : "—"}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{fmtRvs(r)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{r.delta != null ? fmtDelta(r.delta) : "—"}</td>
                  <td className="py-2 pr-3 text-xs leading-snug text-muted-foreground">
                    <LinkifiedNotes notes={r.notes} />
                  </td>
                  <td className="py-2 text-xs tabular-nums text-muted-foreground">
                    {r.issueRefs.length > 0
                      ? r.issueRefs.map((ref, i) => (
                          <span key={ref}>
                            {i > 0 && " "}
                            <a
                              href={issueUrl(ref)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline-offset-2 hover:underline hover:text-foreground"
                              title={`Buka issue ${ref} di GitHub (tab baru)`}
                            >
                              {ref}
                            </a>
                          </span>
                        ))
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
