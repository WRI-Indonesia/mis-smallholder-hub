"use client";

import { useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { bmpChartSeries } from "@/lib/bmp-dashboard-aggregation";
import type { BmpMonthlyStat } from "@/types/dashboard";

const MONTHS_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const BAR_COLOR = "#22c55e"; // emerald-500 — konsisten dgn chart Peta BMP
const LINE_COLOR = "#0ea5e9"; // sky-500 — beda dari warna kategori ketersediaan

const formatTon = (n: number) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const formatAxis = (n: number) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(n);

/** Round up to a tidy axis ceiling (1/2/5 × 10^k) — skala adaptif mengikuti data. */
function axisMax(dataMax: number): number {
  if (dataMax <= 0) return 10;
  const pow = Math.pow(10, Math.floor(Math.log10(dataMax)));
  for (const m of [1, 2, 5, 10]) {
    if (dataMax <= m * pow) return m * pow;
  }
  return 10 * pow;
}

/**
 * Tick sumbu kiri selalu angka bulat: ceiling 2×10^k dibagi 4 (step 0,5×10^k),
 * 1/5×10^k dibagi 5 (step 0,2/1×10^k) — mis. 0-500-1000-1500-2000.
 */
function axisDivisions(max: number): number {
  return String(max).startsWith("2") ? 4 : 5;
}

const SLOT = 100 / 12; // lebar slot bulan dalam koordinat persen

export function BmpTrendChart({
  monthly,
  totalLahan,
  year,
}: {
  monthly: Record<string, BmpMonthlyStat>;
  totalLahan: number;
  year: number | null;
}) {
  const [hover, setHover] = useState<number | null>(null);

  const series = useMemo(
    () => bmpChartSeries(monthly, year, totalLahan),
    [monthly, year, totalLahan]
  );

  const hasData = Object.keys(monthly).length > 0;
  const maxTon = axisMax(Math.max(...series.map((p) => p.produksiTon)));
  const divisions = axisDivisions(maxTon);
  const fractions = Array.from({ length: divisions + 1 }, (_, i) => i / divisions);

  const barW = SLOT * 0.55;
  const cx = (i: number) => (i + 0.5) * SLOT;

  const linePoints = series
    .map((p, i) => `${cx(i).toFixed(2)},${(100 - p.coveragePct).toFixed(2)}`)
    .join(" ");

  return (
    <Card className="h-full flex flex-col border border-border/60 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" /> Tren Produksi &amp; Cakupan Pelaporan
          Bulanan {year != null ? `— ${year}` : "— Rataan"}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {!hasData ? (
          <div className="flex flex-1 min-h-[260px] items-center justify-center text-sm text-muted-foreground">
            Belum ada data produksi.
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="flex flex-1 min-h-[260px] gap-2">
              {/* Label sumbu kiri (Ton) — HTML, tidak ikut stretch */}
              <div className="flex w-12 flex-col justify-between text-right text-[10px] tabular-nums text-muted-foreground">
                {[...fractions].reverse().map((f) => (
                  <span key={f} className="-translate-y-0 leading-none">
                    {formatAxis(maxTon * f)}
                  </span>
                ))}
              </div>

              {/* Area plot — SVG persen (stretch mengisi tinggi card) */}
              <div className="relative flex-1">
                <svg
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  className="absolute inset-0 h-full w-full"
                  role="img"
                  aria-label="Grafik produksi dan cakupan pelaporan bulanan"
                >
                  {fractions.map((f) => (
                    <line
                      key={f}
                      x1={0}
                      x2={100}
                      y1={100 - f * 100}
                      y2={100 - f * 100}
                      className="stroke-muted-foreground/15"
                      strokeDasharray={f === 0 ? undefined : "2 2"}
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}

                  {series.map((p, i) => (
                    <rect
                      key={i}
                      x={cx(i) - barW / 2}
                      y={100 - (p.produksiTon / maxTon) * 100}
                      width={barW}
                      height={(p.produksiTon / maxTon) * 100}
                      fill={BAR_COLOR}
                      opacity={hover === null || hover === i ? 0.85 : 0.4}
                    />
                  ))}

                  <polyline
                    points={linePoints}
                    fill="none"
                    stroke={LINE_COLOR}
                    strokeWidth={2}
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>

                {/* Titik garis — HTML dot agar tidak terdistorsi */}
                {series.map((p, i) => (
                  <span
                    key={i}
                    className="absolute rounded-full"
                    style={{
                      left: `${cx(i)}%`,
                      top: `${100 - p.coveragePct}%`,
                      width: hover === i ? 9 : 7,
                      height: hover === i ? 9 : 7,
                      backgroundColor: LINE_COLOR,
                      transform: "translate(-50%, -50%)",
                    }}
                  />
                ))}

                {/* Hover hit-area per bulan */}
                <div className="absolute inset-0 flex">
                  {series.map((_, i) => (
                    <div
                      key={i}
                      className="h-full flex-1"
                      onMouseEnter={() => setHover(i)}
                      onMouseLeave={() => setHover(null)}
                    />
                  ))}
                </div>

                {hover !== null && (
                  <div
                    className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md whitespace-nowrap"
                    style={{ left: `${Math.min(Math.max(cx(hover), 12), 88)}%` }}
                  >
                    <p className="font-semibold">
                      {MONTHS_ID[hover]}
                      {year != null ? ` ${year}` : " (rata-rata)"}
                    </p>
                    <p className="tabular-nums">Produksi: {formatTon(series[hover].produksiTon)} Ton</p>
                    <p className="tabular-nums">
                      Lahan melapor: {series[hover].lahanMelapor} ({series[hover].coveragePct}%)
                    </p>
                  </div>
                )}
              </div>

              {/* Label sumbu kanan (%) */}
              <div className="flex w-9 flex-col justify-between text-left text-[10px] tabular-nums text-muted-foreground">
                {[...fractions].reverse().map((f) => (
                  <span key={f} className="leading-none">{Math.round(f * 100)}%</span>
                ))}
              </div>
            </div>

            {/* Label bulan — sejajar area plot */}
            <div className="mt-1.5 flex gap-2">
              <div className="w-12" />
              <div className="flex flex-1">
                {MONTHS_ID.map((m) => (
                  <span key={m} className="flex-1 text-center text-[10px] text-muted-foreground">
                    {m}
                  </span>
                ))}
              </div>
              <div className="w-9" />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: BAR_COLOR }} />
                Produksi (Ton)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-4" style={{ backgroundColor: LINE_COLOR }} />
                Cakupan pelaporan (% lahan melapor)
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
