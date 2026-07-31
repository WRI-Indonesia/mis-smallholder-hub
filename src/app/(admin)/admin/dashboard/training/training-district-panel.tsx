import { MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TRAINING_PACKAGE_LABELS,
  TRAINING_PACKAGE_SHORT,
  trainingDistrictCoverage,
} from "@/lib/training-dashboard-aggregation";
import type { TrainingCoverageRow, TrainingPackageCode } from "@/types/dashboard";

const formatNumber = (n: number) => new Intl.NumberFormat("id-ID").format(n);
const formatPct = (n: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(n);

/** Satu sel: persen + jumlah sudah (angka belum cukup di tooltip — revisi owner #198). */
function DistrictCell({ trained, total }: { trained: number; total: number }) {
  if (total <= 0) {
    return <div className="text-center text-xs text-muted-foreground">—</div>;
  }
  const pct = (trained / total) * 100;
  const belum = total - trained;
  return (
    <div
      className="space-y-1"
      title={`${formatNumber(trained)} sudah · ${formatNumber(belum)} belum dari ${formatNumber(total)} petani`}
    >
      <div className="flex items-baseline justify-between gap-1 text-xs">
        <span className="font-semibold tabular-nums">{formatPct(pct)}%</span>
        <span className="tabular-nums text-muted-foreground">{formatNumber(trained)}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted">
        <div
          className="h-2 rounded-full bg-emerald-600 dark:bg-emerald-500"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Card full-row "Petani Terlatih vs Belum per Distrik" (#198, bentuk grid
 * distrik × paket — pilihan owner): roll-up matriks cakupan ke level distrik,
 * semua paket terlihat sekaligus tanpa klik.
 */
export function TrainingDistrictPanel({
  rows,
  packages,
}: {
  rows: TrainingCoverageRow[];
  packages: TrainingPackageCode[];
}) {
  const districts = trainingDistrictCoverage(rows);
  // Lebar seragam antar kolom distrik; kolom label Paket menyisakan ~18%.
  const cellWidth = `${82 / Math.max(districts.length, 1)}%`;

  return (
    <Card className="border border-border/60 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" /> Petani Terlatih vs Belum per Distrik
          </CardTitle>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 dark:bg-emerald-500" />
              Sudah
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-muted border border-border" />
              Belum
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {districts.length === 0 ? (
          <div className="flex min-h-[120px] items-center justify-center text-sm text-muted-foreground">
            Tidak ada distrik pada filter ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Transposisi (revisi owner #198): baris = paket, kolom = distrik —
                distrik sedikit sehingga bar lebih lebar, dan tiap baris terbaca
                sebagai progres satu paket lintas distrik. */}
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="text-left py-2 pr-4 font-semibold">Paket</th>
                  {districts.map((d) => (
                    <th
                      key={d.districtName}
                      style={{ width: cellWidth }}
                      className="text-center py-2 px-2 font-semibold whitespace-nowrap"
                    >
                      {d.districtName}
                      <span className="block text-[10px] font-normal normal-case tabular-nums">
                        {formatNumber(d.totalFarmers)} petani
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {packages.map((code) => (
                  <tr key={code} className="align-middle border-t border-border/40">
                    <td className="py-2.5 pr-4 font-medium" title={TRAINING_PACKAGE_LABELS[code]}>
                      {TRAINING_PACKAGE_SHORT[code]}
                    </td>
                    {districts.map((d) => (
                      <td key={d.districtName} className="py-2.5 px-2">
                        <DistrictCell trained={d.byPackage[code] ?? 0} total={d.totalFarmers} />
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="align-middle border-t border-border/40">
                  <td
                    className="py-2.5 pr-4 font-semibold"
                    title="Petani yang mengikuti paket apa pun"
                  >
                    Min. 1 Paket
                  </td>
                  {districts.map((d) => (
                    <td key={d.districtName} className="py-2.5 px-2">
                      <DistrictCell trained={d.anyPackage} total={d.totalFarmers} />
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Angka per sel: persen terlatih · jumlah petani sudah dilatih (arahkan kursor untuk
              angka belum). Roll-up dari matriks cakupan — mengikuti seluruh filter aktif.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
