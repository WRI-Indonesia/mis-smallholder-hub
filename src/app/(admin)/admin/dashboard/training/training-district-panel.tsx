import { useState } from "react";
import { ChevronDown, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  TRAINING_PACKAGE_LABELS,
  TRAINING_PACKAGE_SHORT,
  trainingDistrictCoverage,
} from "@/lib/training-dashboard-aggregation";
import type { TrainingCoverageRow, TrainingPackageCode } from "@/types/dashboard";

const formatNumber = (n: number) => new Intl.NumberFormat("id-ID").format(n);
const formatPct = (n: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(n);

/**
 * Satu sel: persen di kiri luar bar (revisi owner #198), lalu stacked bar
 * tebal — segmen hijau memuat jumlah sudah, segmen abu memuat jumlah belum.
 * Label segmen disembunyikan/dipindah bila segmennya terlalu sempit; tooltip
 * selalu lengkap.
 */
function DistrictCell({ trained, total }: { trained: number; total: number }) {
  if (total <= 0) {
    return <div className="text-center text-xs text-muted-foreground">—</div>;
  }
  const pct = (trained / total) * 100;
  const belum = total - trained;
  const sudahInside = pct >= 20;
  const belumInside = 100 - pct >= 20;
  return (
    <div
      className="flex items-center gap-2"
      title={`${formatNumber(trained)} sudah · ${formatNumber(belum)} belum dari ${formatNumber(total)} petani`}
    >
      <span className="w-11 shrink-0 text-right text-xs font-semibold tabular-nums">
        {formatPct(pct)}%
      </span>
      {/* Angka sudah selalu menempel di BATAS segmen (kanan-dalam bila muat,
          tepat setelah batas bila sempit) — posisi konsisten antar baris (#198). */}
      <div className="relative h-5 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="absolute inset-y-0 left-0 flex items-center justify-end bg-emerald-600 dark:bg-emerald-500"
          style={{ width: `${Math.min(pct, 100)}%` }}
        >
          {sudahInside && (
            <span className="pr-2 text-[10px] font-semibold text-white tabular-nums whitespace-nowrap">
              {formatNumber(trained)}
            </span>
          )}
        </div>
        {!sudahInside && trained > 0 && (
          <span
            className="absolute inset-y-0 flex items-center pl-1.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums whitespace-nowrap"
            style={{ left: `${pct}%` }}
          >
            {formatNumber(trained)}
          </span>
        )}
        {belumInside && (
          <span className="absolute inset-y-0 right-0 flex items-center pr-2 text-[10px] tabular-nums text-muted-foreground whitespace-nowrap">
            {formatNumber(belum)}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Card full-row "Capaian Paket per Distrik" (#198): roll-up matriks cakupan
 * ke level distrik — baris per paket, kolom per distrik, semua paket terlihat
 * sekaligus tanpa klik. Collapsible mengikuti pola matriks cakupan.
 */
export function TrainingDistrictPanel({
  rows,
  packages,
}: {
  rows: TrainingCoverageRow[];
  packages: TrainingPackageCode[];
}) {
  const [open, setOpen] = useState(true);
  const districts = trainingDistrictCoverage(rows);
  // Kolom Total hanya bermakna bila ada >1 distrik — dengan filter distrik
  // aktif, Total cuma menduplikasi kolom distrik itu (revisi owner #198).
  const showTotal = districts.length > 1;
  // Lebar seragam antar kolom (Total + distrik); kolom label Paket menyisakan ~18%.
  const cellWidth = `${82 / Math.max(districts.length + (showTotal ? 1 : 0), 1)}%`;

  // Ringkasan yang tetap terbaca saat panel dilipat.
  const summaryFarmers = districts.reduce((s, d) => s + d.totalFarmers, 0);
  const summaryTrained = districts.reduce((s, d) => s + d.anyPackage, 0);

  // Kolom Total (Riau) di paling kiri (revisi owner #198) — agregat seluruh
  // distrik dalam scope filter. Label provinsi diminta eksplisit owner; bila
  // program meluas lintas provinsi, jadikan data-driven.
  const totalByPackage: Partial<Record<TrainingPackageCode, number>> = {};
  for (const d of districts) {
    for (const [code, n] of Object.entries(d.byPackage) as [TrainingPackageCode, number][]) {
      totalByPackage[code] = (totalByPackage[code] ?? 0) + n;
    }
  }

  return (
    <Card className="border border-border/60 shadow-sm">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger
          render={
            <button
              type="button"
              className="flex w-full items-start justify-between gap-3 px-6 py-4 text-left"
            >
              <span className="min-w-0">
                <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" /> Capaian Paket per Distrik
                </span>
                <span className="block text-xs text-muted-foreground mt-1">
                  {open
                    ? "Persen & jumlah petani sudah dilatih per paket di tiap distrik — arahkan kursor ke sel untuk angka belum dilatih."
                    : `${formatNumber(districts.length)} distrik · ${formatPct(
                        summaryFarmers > 0 ? (summaryTrained / summaryFarmers) * 100 : 0,
                      )}% petani terlatih (min. 1 paket)`}
                </span>
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 mt-0.5 text-muted-foreground transition-transform ${
                  open ? "rotate-180" : ""
                }`}
              />
            </button>
          }
        />
        <CollapsibleContent>
          <CardContent className="border-t pt-4">
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
                      {showTotal && (
                        <th
                          style={{ width: cellWidth }}
                          className="text-center py-2 px-2 font-semibold whitespace-nowrap border-r border-border/60"
                          title="Agregat seluruh distrik dalam scope filter"
                        >
                          Total (Riau)
                          <span className="block text-[10px] font-normal normal-case tabular-nums">
                            {formatNumber(summaryFarmers)} petani
                          </span>
                        </th>
                      )}
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
                        <td
                          className="py-2.5 pr-4 font-medium"
                          title={TRAINING_PACKAGE_LABELS[code]}
                        >
                          {TRAINING_PACKAGE_SHORT[code]}
                        </td>
                        {showTotal && (
                          <td className="py-2.5 px-2 border-r border-border/60">
                            <DistrictCell
                              trained={totalByPackage[code] ?? 0}
                              total={summaryFarmers}
                            />
                          </td>
                        )}
                        {districts.map((d) => (
                          <td key={d.districtName} className="py-2.5 px-2">
                            <DistrictCell
                              trained={d.byPackage[code] ?? 0}
                              total={d.totalFarmers}
                            />
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
                      {showTotal && (
                        <td className="py-2.5 px-2 border-r border-border/60">
                          <DistrictCell trained={summaryTrained} total={summaryFarmers} />
                        </td>
                      )}
                      {districts.map((d) => (
                        <td key={d.districtName} className="py-2.5 px-2">
                          <DistrictCell trained={d.anyPackage} total={d.totalFarmers} />
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
                {/* Legend di kanan bawah (revisi owner #198), catatan di kiri. */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] text-muted-foreground">
                    Persen di kiri bar; segmen hijau = jumlah petani sudah dilatih, segmen abu =
                    jumlah belum. Roll-up dari matriks capaian — mengikuti seluruh filter aktif.
                  </p>
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
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
