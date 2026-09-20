"use client";

import { useMemo, useState } from "react";
import { Radar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatNumber } from "@/lib/format";
import { BMP_SCORE_MAX, formatScore } from "@/lib/bmp-assessment";
import { BMP_RADAR_SERIES_COLORS, BmpActivityRadarSvg, type BmpRadarRow } from "@/components/shared/bmp-activity-radar-svg";
import {
  bmpMonevActivityProfile,
  type BmpMonevActivity,
  type BmpMonevActivityProfileRow,
  type BmpMonevGroupEntry,
  type BmpMonevIndicator,
} from "@/lib/bmp-monev-dashboard-aggregation";

/**
 * Profil 5 kegiatan sebagai spider chart dua seri (permintaan owner
 * 2026-09-20): bandingkan rataan seluruh cakupan (Riau) vs distrik, atau
 * distrik vs Lembaga. Sumbu memakai skala skor 0–3 dengan pita empat kategori
 * (Belum Implementasi < 1,00 · Perintis 1,00–1,49 · Praktisi 1,50–2,50 ·
 * Teladan > 2,50) supaya bentuk profil langsung terbaca "kegiatan ini masih
 * di pita Perintis". Σ bobot efektif tiap kegiatan = 1,0 (Gulma: petani ATAU
 * pekerja dihitung sekali, `BMP_EXCLUSIVE_CRITERIA`) sehingga maks = 3,00;
 * bila rubrik berubah, nilai tetap diplot setara 0–3 (avg/max × 3). SVG-nya
 * di `components/shared/bmp-activity-radar-svg.tsx` (dipakai juga halaman
 * detail penilaian).
 *
 * Seri tidak mengikuti filter Distrik/Lembaga dashboard — kedua selektor
 * memilih subset cakupan sendiri, jadi "Lembaga vs Riau" tetap bisa dibaca
 * walau dashboard sedang difokus ke Lembaga itu.
 */
export type BmpMonevRadarSelection = { kind: "all" } | { kind: "district"; id: string } | { kind: "group"; id: string };

const SERIES_COLORS = BMP_RADAR_SERIES_COLORS;
const toRadar = (rows: BmpMonevActivityProfileRow[]): BmpRadarRow[] => rows.map((r) => ({ code: r.code, name: r.name, value: r.avg, max: r.max }));

/** Subset Lembaga untuk satu seri — murni, di luar komponen supaya bukan dependensi hook. */
function subsetGroups(allGroups: BmpMonevGroupEntry[], sel: BmpMonevRadarSelection): BmpMonevGroupEntry[] {
  if (sel.kind === "all") return allGroups;
  if (sel.kind === "district") return allGroups.filter((g) => g.districtId === sel.id);
  return allGroups.filter((g) => g.id === sel.id);
}

function encode(sel: BmpMonevRadarSelection): string {
  return sel.kind === "all" ? "all" : `${sel.kind}:${sel.id}`;
}
function decode(v: string): BmpMonevRadarSelection {
  if (v.startsWith("district:")) return { kind: "district", id: v.slice(9) };
  if (v.startsWith("group:")) return { kind: "group", id: v.slice(6) };
  return { kind: "all" };
}

export function BmpMonevActivityRadar({
  allGroups,
  year,
  activities,
  indicators,
  defaultB,
}: {
  allGroups: BmpMonevGroupEntry[];
  year: number;
  activities: BmpMonevActivity[];
  indicators: BmpMonevIndicator[];
  /** Pilihan awal seri B — biasanya filter dashboard yang sedang aktif. */
  defaultB: BmpMonevRadarSelection | null;
}) {
  const [a, setA] = useState<BmpMonevRadarSelection>({ kind: "all" });
  const [b, setB] = useState<BmpMonevRadarSelection | null>(defaultB);

  // Opsi hanya yang punya rincian pada tahun ini — memilih yang kosong hanya menghasilkan garis nol.
  const withDetail = useMemo(() => allGroups.filter((g) => g.assessments.some((x) => x.surveyYear === year && x.activityScores)), [allGroups, year]);
  const districts = useMemo(() => {
    const m = new Map<string, string>();
    for (const g of withDetail) m.set(g.districtId, g.districtName);
    return [...m.entries()].map(([id, name]) => ({ id, name })).sort((x, y) => x.name.localeCompare(y.name));
  }, [withDetail]);
  const groups = useMemo(() => [...withDetail].sort((x, y) => x.name.localeCompare(y.name)), [withDetail]);

  const label = (sel: BmpMonevRadarSelection) =>
    sel.kind === "all" ? "Semua Lembaga (rataan cakupan)" : sel.kind === "district" ? `Distrik ${districts.find((d) => d.id === sel.id)?.name ?? ""}` : (groups.find((g) => g.id === sel.id)?.name ?? "Lembaga");

  const rowsA = useMemo(() => bmpMonevActivityProfile(subsetGroups(allGroups, a), year, activities, indicators), [a, allGroups, year, activities, indicators]);
  const rowsB = useMemo(() => (b ? bmpMonevActivityProfile(subsetGroups(allGroups, b), year, activities, indicators) : null), [b, allGroups, year, activities, indicators]);

  const nA = rowsA[0]?.n ?? 0;
  const nB = rowsB?.[0]?.n ?? 0;

  return (
    <Card className="h-full flex flex-col border border-border/60 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Radar className="h-4 w-4 text-primary" /> Profil 5 Kegiatan BMP ({year})
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Bandingkan dua kelompok: rerata skor tiap kegiatan pada skala 0–3 dengan pita kategori sebagai latar. Angka per kegiatan di tabel samping.
        </p>
        <div className="mt-1 grid gap-2 sm:grid-cols-2 lg:max-w-3xl">
          <SeriesSelect value={encode(a)} onChange={(v) => setA(decode(v))} color={SERIES_COLORS.a} letter="A" districts={districts} groups={groups} allowNone={false} />
          <SeriesSelect value={b ? encode(b) : "none"} onChange={(v) => setB(v === "none" ? null : decode(v))} color={SERIES_COLORS.b} letter="B" districts={districts} groups={groups} allowNone />
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {nA === 0 && nB === 0 ? (
          <div className="flex min-h-[200px] items-center justify-center text-sm text-muted-foreground">Belum ada rincian indikator pada pilihan ini.</div>
        ) : (
          // Satu baris penuh (owner 2026-09-20): grafik di kiri, tabel di kanan.
          <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center">
            <BmpActivityRadarSvg rowsA={toRadar(rowsA)} rowsB={rowsB ? toRadar(rowsB) : null} />
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="py-1.5 pr-2">Kegiatan</th>
                    <th className="py-1.5 pr-2 text-right">Bobot</th>
                    <th className="py-1.5 pr-2 text-right">
                      <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm" style={{ background: SERIES_COLORS.a }} />A</span>
                    </th>
                    {rowsB && (
                      <th className="py-1.5 pr-2 text-right">
                        <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm" style={{ background: SERIES_COLORS.b }} />B</span>
                      </th>
                    )}
                    {rowsB && <th className="py-1.5 text-right">Selisih</th>}
                  </tr>
                </thead>
                <tbody>
                  {rowsA.map((r, i) => {
                    const rb = rowsB?.[i];
                    const diff = rb && r.avg != null && rb.avg != null ? rb.avg - r.avg : null;
                    return (
                      <tr key={r.code} className="border-b last:border-0">
                        <td className="py-1.5 pr-2">
                          {r.code} {r.name}
                          {r.max !== BMP_SCORE_MAX && <span className="text-muted-foreground"> / {formatScore(r.max)}</span>}
                        </td>
                        <td className="py-1.5 pr-2 text-right tabular-nums text-muted-foreground">{r.weight}</td>
                        <td className="py-1.5 pr-2 text-right tabular-nums font-medium">{r.avg == null ? "—" : formatScore(r.avg)}</td>
                        {rowsB && <td className="py-1.5 pr-2 text-right tabular-nums font-medium">{rb?.avg == null ? "—" : formatScore(rb.avg)}</td>}
                        {rowsB && (
                          <td className={`py-1.5 text-right tabular-nums ${diff == null ? "text-muted-foreground" : diff > 0 ? "text-emerald-700" : diff < 0 ? "text-red-700" : ""}`}>
                            {diff == null ? "—" : `${diff > 0 ? "+" : ""}${formatScore(diff)}`}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                A = {label(a)} ({formatNumber(nA)} petani ber-rincian){rowsB && b ? ` · B = ${label(b)} (${formatNumber(nB)} petani) · selisih = B − A` : ""} · rerata skor kegiatan pada skala 0–3.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SeriesSelect({
  value,
  onChange,
  color,
  letter,
  districts,
  groups,
  allowNone,
}: {
  value: string;
  onChange: (v: string) => void;
  color: string;
  letter: string;
  districts: { id: string; name: string }[];
  groups: BmpMonevGroupEntry[];
  allowNone: boolean;
}) {
  const labelOf = (v: string) => {
    if (v === "none") return "— tanpa pembanding —";
    if (v === "all") return "Semua Lembaga (rataan cakupan)";
    if (v.startsWith("district:")) return `Distrik ${districts.find((d) => d.id === v.slice(9))?.name ?? ""}`;
    return groups.find((g) => g.id === v.slice(6))?.name ?? "";
  };
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: color }}>
        {letter}
      </span>
      <Select value={value} onValueChange={(v) => v && onChange(v)}>
        <SelectTrigger className="h-8 w-full text-xs">
          <SelectValue>{(v: string) => labelOf(v)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {allowNone && <SelectItem value="none">— tanpa pembanding —</SelectItem>}
          <SelectItem value="all">Semua Lembaga (rataan cakupan)</SelectItem>
          {districts.length > 0 && (
            <SelectGroup>
              <SelectLabel>Distrik</SelectLabel>
              {districts.map((d) => (
                <SelectItem key={d.id} value={`district:${d.id}`}>
                  Distrik {d.name}
                </SelectItem>
              ))}
            </SelectGroup>
          )}
          {groups.length > 0 && (
            <SelectGroup>
              <SelectLabel>Lembaga Petani</SelectLabel>
              {groups.map((g) => (
                <SelectItem key={g.id} value={`group:${g.id}`}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectGroup>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
