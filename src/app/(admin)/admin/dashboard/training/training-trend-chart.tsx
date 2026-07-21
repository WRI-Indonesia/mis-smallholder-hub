"use client";

import { useState } from "react";
import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TRAINING_PACKAGE_SHORT } from "@/lib/training-dashboard-aggregation";
import type { TrainingPackageCode, TrainingTrendBucket } from "@/types/dashboard";

const formatNumber = (n: number) => new Intl.NumberFormat("id-ID").format(n);

/** Warna seri per paket — dipakai bersama batang stacked dan legenda. */
const PACKAGE_COLORS: Record<TrainingPackageCode, string> = {
  PAKET_1_BMP_PC_RSPO_NKT: "#16a34a", // green-600
  PAKET_2_MK: "#0ea5e9", // sky-500
  PAKET_2_K3: "#f97316", // orange-500
  PAKET_3_4_GEDSI_FINANCIAL_LIVELIHOOD_BUSDEV: "#8b5cf6", // violet-500
  OTHER: "#94a3b8", // slate-400
};

/** Ceiling sumbu yang rapi (1/2/5 × 10^k) — mengikuti pola BmpTrendChart. */
function axisMax(dataMax: number): number {
  if (dataMax <= 0) return 10;
  const pow = Math.pow(10, Math.floor(Math.log10(dataMax)));
  for (const m of [1, 2, 5, 10]) {
    if (dataMax <= m * pow) return m * pow;
  }
  return 10 * pow;
}

function axisDivisions(max: number): number {
  return String(max).startsWith("2") ? 4 : 5;
}

export function TrainingTrendChart({
  buckets,
  packages,
  yearLabel,
}: {
  buckets: TrainingTrendBucket[];
  packages: TrainingPackageCode[];
  yearLabel: string;
}) {
  const [hover, setHover] = useState<number | null>(null);

  const hasData = buckets.some((b) => b.attendance > 0);
  const slot = buckets.length > 0 ? 100 / buckets.length : 100;
  const barW = slot * 0.55;
  const maxAttendance = axisMax(Math.max(0, ...buckets.map((b) => b.attendance)));
  const divisions = axisDivisions(maxAttendance);
  const fractions = Array.from({ length: divisions + 1 }, (_, i) => i / divisions);

  return (
    <Card className="h-full flex flex-col border border-border/60 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" /> Tren Kehadiran Pelatihan — {yearLabel}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Tinggi batang = jumlah kehadiran (peserta per kegiatan), dipecah per paket.
        </p>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {!hasData ? (
          <div className="flex flex-1 min-h-[260px] items-center justify-center text-sm text-muted-foreground">
            Belum ada data pelatihan pada filter ini.
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="flex gap-2">
              {/* Sumbu kiri: jumlah kehadiran */}
              <div className="flex flex-col justify-between h-[240px] text-[10px] text-muted-foreground tabular-nums text-right w-10 shrink-0">
                {[...fractions].reverse().map((f) => (
                  <span key={f}>{formatNumber(Math.round(maxAttendance * f))}</span>
                ))}
              </div>

              <div className="relative flex-1 h-[240px]">
                <svg
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  className="absolute inset-0 h-full w-full overflow-visible"
                >
                  {fractions.map((f) => (
                    <line
                      key={f}
                      x1="0"
                      x2="100"
                      y1={100 - f * 100}
                      y2={100 - f * 100}
                      stroke="currentColor"
                      strokeWidth="0.15"
                      className="text-border"
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}

                  {buckets.map((b, i) => {
                    const x = i * slot + (slot - barW) / 2;
                    // Segmen ditumpuk dari bawah mengikuti urutan `packages`.
                    let acc = 0;
                    return (
                      <g
                        key={b.label}
                        onMouseEnter={() => setHover(i)}
                        onMouseLeave={() => setHover(null)}
                      >
                        <rect x={i * slot} y="0" width={slot} height="100" fill="transparent" />
                        {packages.map((code) => {
                          const v = b.byPackage[code];
                          if (v <= 0) return null;
                          const h = (v / maxAttendance) * 100;
                          const y = 100 - acc - h;
                          acc += h;
                          return (
                            <rect
                              key={code}
                              x={x}
                              y={y}
                              width={barW}
                              height={h}
                              fill={PACKAGE_COLORS[code]}
                              opacity={hover === null || hover === i ? 1 : 0.4}
                            />
                          );
                        })}
                      </g>
                    );
                  })}
                </svg>

                {hover !== null && buckets[hover].attendance > 0 && (
                  <div
                    className="pointer-events-none absolute z-10 rounded-md border bg-popover px-2.5 py-2 text-xs shadow-md"
                    style={{
                      left: `${Math.min(Math.max(hover * slot + slot / 2, 12), 88)}%`,
                      transform: "translateX(-50%)",
                      top: 4,
                    }}
                  >
                    <div className="font-semibold mb-1">{buckets[hover].label}</div>
                    <div className="text-muted-foreground mb-1">
                      {formatNumber(buckets[hover].activities)} kegiatan ·{" "}
                      {formatNumber(buckets[hover].attendance)} kehadiran
                    </div>
                    {packages
                      .filter((c) => buckets[hover].byPackage[c] > 0)
                      .map((c) => (
                        <div key={c} className="flex items-center gap-1.5 whitespace-nowrap">
                          <span
                            className="inline-block h-2 w-2 rounded-sm"
                            style={{ background: PACKAGE_COLORS[c] }}
                          />
                          {TRAINING_PACKAGE_SHORT[c]}
                          <span className="ml-auto pl-2 tabular-nums font-medium">
                            {formatNumber(buckets[hover].byPackage[c])}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* Label sumbu bawah */}
            <div className="flex gap-2 mt-1">
              <div className="w-10 shrink-0" />
              <div className="flex-1 flex text-[10px] text-muted-foreground">
                {buckets.map((b) => (
                  <span key={b.label} className="text-center" style={{ width: `${slot}%` }}>
                    {b.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
              {packages.map((c) => (
                <span key={c} className="inline-flex items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-sm"
                    style={{ background: PACKAGE_COLORS[c] }}
                  />
                  {TRAINING_PACKAGE_SHORT[c]}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
