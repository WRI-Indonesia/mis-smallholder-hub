import { Scale } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BmpSlicedStats } from "@/types/dashboard";

const formatTon = (n: number) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

// Warna kategori — konsisten di summary, kedua grafik, dan legend.
export const CATEGORY_COLORS = { exPlasma: "#0d9488", swadaya: "#f59e0b" } as const;

/** Legend titik warna Ex-Plasma/Swadaya — dipakai card kategori & ranking. */
export function CategoryLegend() {
  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      {(
        [
          ["exPlasma", "Ex-Plasma"],
          ["swadaya", "Swadaya"],
        ] as const
      ).map(([key, label]) => (
        <span key={key} className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: CATEGORY_COLORS[key] }}
          />
          {label}
        </span>
      ))}
    </div>
  );
}

export interface BmpComparisonRow {
  label: string;
  /** null = belum ada data (bukan nol) — tampil "—". */
  exPlasma: number | null;
  swadaya: number | null;
  /** Keterangan tooltip per sel (mis. luas terdata), opsional. */
  exPlasmaTitle?: string;
  swadayaTitle?: string;
}

const CATEGORY_KEYS = [
  ["exPlasma", "Ex-Plasma"],
  ["swadaya", "Swadaya"],
] as const;

/**
 * Tabel pembanding Ex-Plasma | Swadaya: tiap sel angka + mini bar dengan SATU skala
 * per tabel, sehingga kedua kolom bisa dibandingkan langsung (owner 2026-10-08 —
 * dulu dua bar tanpa label per baris dan 0,00 untuk data yang tidak ada).
 */
function CompareTable({
  rows,
  rowHeader,
  emptyNote,
}: {
  rows: BmpComparisonRow[];
  rowHeader: string;
  /** Arti "—" di tabel ini. */
  emptyNote: string;
}) {
  if (rows.length === 0) {
    return <p className="text-xs text-muted-foreground">Belum ada data untuk analisa ini.</p>;
  }
  const max = Math.max(1, ...rows.flatMap((r) => [r.exPlasma ?? 0, r.swadaya ?? 0]));
  const hasEmpty = rows.some((r) => r.exPlasma == null || r.swadaya == null);
  return (
    <div className="space-y-2">
      <table className="w-full table-fixed text-xs">
        <thead>
          <tr className="border-b text-left text-[10px] uppercase tracking-wider text-muted-foreground">
            <th className="w-[36%] py-1.5 pr-2 font-medium">{rowHeader}</th>
            {CATEGORY_KEYS.map(([key, label]) => (
              <th key={key} className="py-1.5 pl-2 font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[key] }} />
                  {label}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-border/40 last:border-0">
              <td className="py-1.5 pr-2 font-medium truncate" title={row.label}>
                {row.label}
              </td>
              {CATEGORY_KEYS.map(([key]) => {
                const value = row[key];
                return (
                  <td key={key} className="py-1.5 pl-2" title={row[`${key}Title`]}>
                    {value == null ? (
                      <span className="block text-right text-muted-foreground">—</span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <span className="h-2 flex-1 rounded-full bg-muted">
                          <span
                            className="block h-2 rounded-full"
                            style={{
                              width: `${Math.min((value / max) * 100, 100)}%`,
                              backgroundColor: CATEGORY_COLORS[key],
                            }}
                          />
                        </span>
                        <span className="w-14 shrink-0 text-right tabular-nums">{formatTon(value)}</span>
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {hasEmpty && <p className="text-[10px] text-muted-foreground">— = {emptyNote}</p>}
    </div>
  );
}

/**
 * Card besar full-row Ex-Plasma vs Swadaya (#191) — menggantikan panel
 * Ketersediaan Data Produksi (kategori Baik/Cukup/Kurang tetap tersedia di
 * Peta BMP). Berisi ringkasan 3 metrik per kategori + 2 analisa kombinasi:
 * produksi per distrik dan produktivitas per umur tanaman.
 */
export function BmpCategoryPanel({
  exPlasma,
  swadaya,
  districtRows,
  ageRows,
  hasAgeData,
  yearLabel,
}: {
  exPlasma: BmpSlicedStats;
  swadaya: BmpSlicedStats;
  /** Produksi (Ton) per distrik, dua nilai per baris. */
  districtRows: BmpComparisonRow[];
  /** Produktivitas (Ton/Ha/tahun, disetahunkan) per bucket umur tanaman. */
  ageRows: BmpComparisonRow[];
  /** Snapshot lama belum memuat breakdown umur — tampilkan ajakan generate ulang. */
  hasAgeData: boolean;
  yearLabel: string;
}) {
  const metrics: { label: string; unit: string; value: (s: BmpSlicedStats) => number }[] = [
    { label: "Total Produksi", unit: "Ton", value: (s) => s.totals.produksiTon },
    { label: "Produktivitas", unit: "Ton/Ha/tahun", value: (s) => s.produktivitasTonHa },
    { label: "Luas Terdata", unit: "Ha", value: (s) => s.totals.luasMelaporHa },
  ];

  return (
    <Card className="border border-border/60 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Scale className="h-4 w-4 text-primary" /> Ex-Plasma vs Swadaya — {yearLabel}
          </CardTitle>
          <CategoryLegend />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Ringkasan 3 metrik per kategori */}
        <div className="grid gap-4 sm:grid-cols-3">
          {metrics.map((m) => (
            <div key={m.label} className="rounded-lg border border-border/60 p-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {m.label} <span className="font-normal normal-case">({m.unit})</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {CATEGORY_KEYS.map(([key, label]) => (
                  <div key={key}>
                    <div
                      className="text-lg font-bold tabular-nums"
                      style={{ color: CATEGORY_COLORS[key] }}
                    >
                      {formatTon(m.value(key === "exPlasma" ? exPlasma : swadaya))}
                    </div>
                    <div className="text-[10px] text-muted-foreground">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 2 analisa kombinasi */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-border/60 p-3 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Produksi per Distrik (Ton)
            </div>
            <CompareTable rows={districtRows} rowHeader="Distrik" emptyNote="belum ada produksi tercatat" />
          </div>
          <div className="rounded-lg border border-border/60 p-3 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Produktivitas per Umur Tanaman (Ton/Ha/tahun)
            </div>
            {hasAgeData ? (
              <CompareTable
                rows={ageRows}
                rowHeader="Umur tanaman"
                emptyNote="belum ada lahan pada kelompok umur ini yang melapor produksi (lahan tanpa tahun tanam masuk baris Tanpa thn tanam)"
              />
            ) : (
              <p className="text-xs text-muted-foreground">
                Snapshot ini belum memuat data umur tanaman — generate ulang snapshot BMP melalui
                menu Tools untuk mengisi analisa ini.
              </p>
            )}
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground">
          Mengikuti filter aktif kecuali filter Kategori. Umur tanaman dihitung pada tahun
          produksinya (tahun produksi − tahun tanam); hanya produksi ber-lahan yang masuk analisa
          umur.
        </p>
      </CardContent>
    </Card>
  );
}
