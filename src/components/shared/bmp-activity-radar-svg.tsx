"use client";

import { useState } from "react";
import { BMP_ASSESSMENT_CATEGORIES, BMP_SCORE_MAX, bmpActivityShortName, formatScore } from "@/lib/bmp-assessment";

/**
 * Spider chart 5 kegiatan BMP (#346, owner 2026-09-20) — dipakai Dashboard
 * Monev BMP (rataan A vs B) dan halaman detail penilaian (satu petani).
 * Skala skor 0–3 dengan pita empat kategori sebagai latar (Belum Implementasi
 * < 1,00 · Perintis 1,00–1,49 · Praktisi 1,50–2,50 · Teladan > 2,50) supaya
 * bentuk profil langsung terbaca "kegiatan ini masih di pita Perintis". Nilai
 * diplot setara 0–3 (value/max × 3 — identik dengan value selama maks = 3).
 *
 * Warna seri sengaja bukan hijau (hijau/abu = pita kategori): biru #2563eb vs
 * oranye #ea580c, divalidasi skill dataviz (ΔE protan 31 / normal 40); seri B
 * juga garis putus-putus sebagai pembeda kedua. Pita dibuat redup bertingkat —
 * yang harus menonjol adalah garis nilai (owner).
 */
export interface BmpRadarRow {
  code: string;
  name: string;
  value: number | null;
  max: number;
}

export const BMP_RADAR_SERIES_COLORS = { a: "#2563eb", b: "#ea580c" } as const;

/** Pita kategori dari luar ke dalam (batas atas, batas bawah) — warna dari konstanta kategori. */
const BANDS = [...BMP_ASSESSMENT_CATEGORIES].map((c, i, arr) => ({ ...c, lo: c.key === "TELADAN" ? 2.5 : c.min, hi: i === 0 ? BMP_SCORE_MAX : arr[i - 1].key === "TELADAN" ? 2.5 : arr[i - 1].min }));
const BAND_OPACITY: Record<string, number> = { BELUM: 0.28, PERINTIS: 0.3, PRAKTISI: 0.3, TELADAN: 0.42 };


/** SVG radar 5 sumbu + legenda pita + tooltip per sumbu. */
export function BmpActivityRadarSvg({
  rowsA,
  rowsB,
  labelA = "A",
  labelB = "B",
  showLegend = true,
  className = "max-w-[440px]",
}: {
  rowsA: BmpRadarRow[];
  rowsB?: BmpRadarRow[] | null;
  labelA?: string;
  labelB?: string;
  /** Legenda pita kategori di bawah grafik — dimatikan pada tampilan ringkas (rincian inline tab Petani). */
  showLegend?: boolean;
  /** Lebar maksimum wadah (kelas Tailwind). */
  className?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const n = rowsA.length;
  const cx = 50;
  const cy = 52;
  const R = 36;
  const angle = (i: number) => -Math.PI / 2 + (2 * Math.PI * i) / n;
  const pt = (i: number, r: number) => [cx + Math.cos(angle(i)) * r, cy + Math.sin(angle(i)) * r] as const;
  const scaled = (r: BmpRadarRow) => (r.value == null || r.max === 0 ? 0 : Math.min((r.value / r.max) * BMP_SCORE_MAX, BMP_SCORE_MAX));
  const ring = (score: number) => rowsA.map((_, i) => pt(i, (score / BMP_SCORE_MAX) * R).join(",")).join(" ");
  const polygon = (rows: BmpRadarRow[]) => rows.map((r, i) => pt(i, (scaled(r) / BMP_SCORE_MAX) * R).join(",")).join(" ");
  const ringPath = (score: number) => "M" + ring(score).split(" ").join(" L") + " Z";
  const valueText = (r: BmpRadarRow) => (r.value == null ? "—" : r.max !== BMP_SCORE_MAX ? `${formatScore(r.value)} / ${formatScore(r.max)} (setara ${formatScore(scaled(r))})` : formatScore(r.value));

  return (
    <div className={`relative mx-auto w-full ${className}`}>
      <svg viewBox="-16 6 132 86" className="w-full">
        {/* Pita kategori: cincin pentagon (evenodd) dari luar ke dalam, tidak saling tumpang. */}
        {BANDS.map((b) => (
          <path key={b.key} d={`${ringPath(b.hi)} ${b.lo > 0 ? ringPath(b.lo) : ""}`} fillRule="evenodd" fill={b.color} fillOpacity={BAND_OPACITY[b.key]} className="stroke-background" strokeWidth="0.7" />
        ))}
        {rowsA.map((_, i) => {
          const [x, y] = pt(i, R);
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} className="stroke-background" strokeWidth="0.4" />;
        })}
        <polygon points={polygon(rowsA)} fill={BMP_RADAR_SERIES_COLORS.a} fillOpacity="0.05" stroke={BMP_RADAR_SERIES_COLORS.a} strokeWidth="1.4" strokeLinejoin="round" />
        {rowsB && <polygon points={polygon(rowsB)} fill={BMP_RADAR_SERIES_COLORS.b} fillOpacity="0.04" stroke={BMP_RADAR_SERIES_COLORS.b} strokeWidth="1.4" strokeDasharray="2.4 1.4" strokeLinejoin="round" />}
        {rowsA.map((r, i) => {
          const [x, y] = pt(i, (scaled(r) / BMP_SCORE_MAX) * R);
          return <circle key={`a${i}`} cx={x} cy={y} r={hover === i ? 2.1 : 1.6} fill={BMP_RADAR_SERIES_COLORS.a} className="stroke-background" strokeWidth="0.5" />;
        })}
        {rowsB?.map((r, i) => {
          const [x, y] = pt(i, (scaled(r) / BMP_SCORE_MAX) * R);
          return <circle key={`b${i}`} cx={x} cy={y} r={hover === i ? 2.1 : 1.6} fill={BMP_RADAR_SERIES_COLORS.b} className="stroke-background" strokeWidth="0.5" />;
        })}
        {rowsA.map((r, i) => {
          const [x, y] = pt(i, R + 6);
          const anchor = Math.abs(x - cx) < 2 ? "middle" : x > cx ? "start" : "end";
          return (
            <text key={`l${i}`} x={x} y={y} fontSize="3.4" textAnchor={anchor} dominantBaseline="middle" className="fill-foreground" fontWeight={hover === i ? 700 : 500}>
              {bmpActivityShortName(r.name)}
            </text>
          );
        })}
        {/* Sasaran hover per sumbu (irisan kue) */}
        {rowsA.map((_, i) => {
          const a0 = angle(i) - Math.PI / n;
          const a1 = angle(i) + Math.PI / n;
          const p0 = [cx + Math.cos(a0) * (R + 4), cy + Math.sin(a0) * (R + 4)];
          const p1 = [cx + Math.cos(a1) * (R + 4), cy + Math.sin(a1) * (R + 4)];
          return <path key={`h${i}`} d={`M${cx},${cy} L${p0[0]},${p0[1]} A${R + 4},${R + 4} 0 0 1 ${p1[0]},${p1[1]} Z`} fill="transparent" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />;
        })}
        {/* Label batas pita di sumbu atas (Knowledge) */}
        {[1, 1.5, 2.5, 3].map((v) => (
          <text key={v} x={cx + 1.2} y={cy - (v / BMP_SCORE_MAX) * R + 0.2} fontSize="2.5" className="fill-foreground stroke-background" dominantBaseline="middle" strokeWidth="0.6" paintOrder="stroke">
            {formatScore(v)}
          </text>
        ))}
      </svg>
      {showLegend && (
      <div className="mt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        {[...BANDS].reverse().map((b) => (
          <span key={b.key} className="inline-flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: b.color, opacity: BAND_OPACITY[b.key] + 0.15 }} />
            {b.label} <span className="tabular-nums">({b.range})</span>
          </span>
        ))}
      </div>
      )}
      {hover !== null && (
        <div className="pointer-events-none absolute left-1/2 top-1 z-10 -translate-x-1/2 rounded-md border bg-popover px-2.5 py-2 text-xs shadow-md whitespace-nowrap">
          <div className="font-semibold">{rowsA[hover].name}</div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-sm" style={{ background: BMP_RADAR_SERIES_COLORS.a }} /> {labelA}: {valueText(rowsA[hover])}
          </div>
          {rowsB && (
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-sm" style={{ background: BMP_RADAR_SERIES_COLORS.b }} /> {labelB}: {valueText(rowsB[hover])}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
