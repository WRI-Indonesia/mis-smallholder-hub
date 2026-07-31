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
  exPlasma: number;
  swadaya: number;
}

/** Sepasang bar horizontal (Ex-Plasma vs Swadaya) untuk satu label baris. */
function CompareBars({ rows, unit }: { rows: BmpComparisonRow[]; unit: string }) {
  const max = Math.max(1, ...rows.flatMap((r) => [r.exPlasma, r.swadaya]));
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.label} className="space-y-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs font-medium truncate">{row.label}</span>
            <span className="text-[10px] tabular-nums text-muted-foreground shrink-0">
              {formatTon(row.exPlasma)} · {formatTon(row.swadaya)} {unit}
            </span>
          </div>
          {(["exPlasma", "swadaya"] as const).map((key) => (
            <div key={key} className="h-2 w-full rounded-full bg-muted">
              <div
                className="h-2 rounded-full"
                style={{
                  width: `${Math.min((row[key] / max) * 100, 100)}%`,
                  backgroundColor: CATEGORY_COLORS[key],
                }}
              />
            </div>
          ))}
        </div>
      ))}
      {rows.length === 0 && (
        <p className="text-xs text-muted-foreground">Belum ada data untuk analisa ini.</p>
      )}
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
  /** Produktivitas (Ton/Ha) per bucket umur tanaman. */
  ageRows: BmpComparisonRow[];
  /** Snapshot lama belum memuat breakdown umur — tampilkan ajakan generate ulang. */
  hasAgeData: boolean;
  yearLabel: string;
}) {
  const metrics: { label: string; unit: string; value: (s: BmpSlicedStats) => number }[] = [
    { label: "Total Produksi", unit: "Ton", value: (s) => s.totals.produksiTon },
    { label: "Produktivitas", unit: "Ton/Ha", value: (s) => s.produktivitasTonHa },
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
                {(
                  [
                    ["exPlasma", exPlasma],
                    ["swadaya", swadaya],
                  ] as const
                ).map(([key, slice]) => (
                  <div key={key}>
                    <div
                      className="text-lg font-bold tabular-nums"
                      style={{ color: CATEGORY_COLORS[key] }}
                    >
                      {formatTon(m.value(slice))}
                    </div>
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
            <CompareBars rows={districtRows} unit="Ton" />
          </div>
          <div className="rounded-lg border border-border/60 p-3 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Produktivitas per Umur Tanaman (Ton/Ha)
            </div>
            {hasAgeData ? (
              <CompareBars rows={ageRows} unit="Ton/Ha" />
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
