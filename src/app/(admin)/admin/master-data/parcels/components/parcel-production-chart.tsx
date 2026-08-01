"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ProductionYear } from "@/types/map";

const formatNumber = (n: number) => new Intl.NumberFormat("id-ID").format(n);

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

/** Ceiling sumbu yang rapi (1/2/5 × 10^k) — mengikuti pola TrainingTrendChart. */
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

/** Pilihan clip periode: berapa bulan yang tampak di viewport (null = semua). */
const PERIODS: { label: string; months: number | null }[] = [
  { label: "6 Bulan", months: 6 },
  { label: "1 Tahun", months: 12 },
  { label: "2 Tahun", months: 24 },
  { label: "Semua", months: null },
];

interface MonthPoint {
  year: number;
  monthIdx: number; // 0 = Jan
  kg: number;
}

/**
 * Grafik batang produksi bulanan kontinu lintas tahun untuk satu lahan.
 * Tombol periode mengatur berapa bulan yang muat di viewport; sisanya
 * di-slide (scroll horizontal), otomatis diposisikan ke bulan terbaru.
 */
export function ParcelProductionChart({ byYear }: { byYear: ProductionYear[] }) {
  const [windowMonths, setWindowMonths] = useState<number | null>(12);
  const [hover, setHover] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Deret bulanan kontinu mulai bulan pertama ber-data (bulan kosong di tengah
  // tetap tampil sebagai gap yang jujur). Ujung kanan = bulan terakhir ber-data
  // ATAU bulan berjalan, mana yang lebih akhir — deret tetap sampai periode
  // berjalan walau masih kosong.
  const months = useMemo<MonthPoint[]>(() => {
    const asc = [...byYear].sort((a, b) => a.year - b.year);
    const all: MonthPoint[] = [];
    for (const y of asc) {
      y.monthly.forEach((kg, monthIdx) => all.push({ year: y.year, monthIdx, kg }));
    }
    const first = all.findIndex((m) => m.kg > 0);
    if (first === -1) return [];
    const now = new Date();
    const nowKey = now.getFullYear() * 12 + now.getMonth();
    let last = first;
    all.forEach((m, i) => {
      if (m.kg > 0 || m.year * 12 + m.monthIdx === nowKey) last = Math.max(last, i);
    });
    return all.slice(first, last + 1);
  }, [byYear]);

  const total = months.length;
  const visible = windowMonths == null ? total : Math.min(windowMonths, total);
  // Lebar konten = total/visible × lebar viewport → slot per bulan konsisten.
  const innerPct = visible > 0 ? (total / visible) * 100 : 100;
  const slot = total > 0 ? 100 / total : 100;
  const barW = slot * 0.6;
  const maxKg = axisMax(Math.max(0, ...months.map((m) => m.kg)));
  const divisions = axisDivisions(maxKg);
  const fractions = Array.from({ length: divisions + 1 }, (_, i) => i / divisions);

  // Label bulan ditipiskan agar ≤ ~12 label terlihat dalam viewport.
  const labelEvery = Math.max(1, Math.ceil(visible / 12));

  // Slide ke ujung kanan (bulan terbaru) tiap ganti periode.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [windowMonths, total]);

  if (total === 0) return null;

  return (
    <div>
      <div className="flex justify-end gap-1 mb-3">
        {PERIODS.map((p) => (
          <button
            key={p.label}
            onClick={() => setWindowMonths(p.months)}
            className={`px-2 py-1 text-[10px] font-semibold uppercase tracking-wider rounded transition-colors ${
              windowMonths === p.months
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        {/* Sumbu kiri: produksi (kg) — tetap, tidak ikut scroll */}
        <div className="flex flex-col justify-between h-[220px] text-[10px] text-muted-foreground tabular-nums text-right w-12 shrink-0">
          {[...fractions].reverse().map((f) => (
            <span key={f}>{formatNumber(Math.round(maxKg * f))}</span>
          ))}
        </div>

        <div ref={scrollRef} className="flex-1 overflow-x-auto pb-1">
          <div style={{ width: `${innerPct}%`, minWidth: "100%" }}>
            <div className="relative h-[220px]">
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

                {months.map((m, i) => {
                  const h = (m.kg / maxKg) * 100;
                  return (
                    <g
                      key={`${m.year}-${m.monthIdx}`}
                      onMouseEnter={() => setHover(i)}
                      onMouseLeave={() => setHover(null)}
                    >
                      <rect x={i * slot} y="0" width={slot} height="100" fill="transparent" />
                      {m.kg > 0 && (
                        <rect
                          x={i * slot + (slot - barW) / 2}
                          y={100 - h}
                          width={barW}
                          height={h}
                          fill="#16a34a"
                          opacity={hover === null || hover === i ? 1 : 0.4}
                        />
                      )}
                    </g>
                  );
                })}
              </svg>

              {hover !== null && months[hover] != null && (
                <div
                  className="pointer-events-none absolute z-10 rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md whitespace-nowrap"
                  style={{
                    left: `${(hover + 0.5) * slot}%`,
                    transform:
                      hover / total < 0.1
                        ? undefined
                        : hover / total > 0.9
                          ? "translateX(-100%)"
                          : "translateX(-50%)",
                    top: 4,
                  }}
                >
                  <div className="font-semibold">
                    {MONTH_LABELS[months[hover].monthIdx]} {months[hover].year}
                  </div>
                  <div className="text-muted-foreground tabular-nums">
                    {formatNumber(Math.round(months[hover].kg))} kg
                  </div>
                </div>
              )}
            </div>

            {/* Label sumbu bawah — ikut scroll bersama batang */}
            <div className="flex text-[10px] text-muted-foreground mt-1">
              {months.map((m, i) => (
                <span
                  key={`${m.year}-${m.monthIdx}`}
                  className="text-center whitespace-nowrap"
                  style={{ width: `${slot}%` }}
                >
                  {i % labelEvery === 0
                    ? m.monthIdx === 0 || i === 0
                      ? `${MONTH_LABELS[m.monthIdx]} '${String(m.year).slice(2)}`
                      : MONTH_LABELS[m.monthIdx]
                    : ""}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
