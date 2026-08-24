"use client";

import { Download, Flame, Printer } from "lucide-react";
import { formatNumber } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  HOTSPOT_CONF_COLORS,
  HOTSPOT_CONF_LABELS,
  confidenceBucket,
  hotspotWindowLabel,
  type HotspotConfBucket,
  type HotspotDayRange,
} from "./map-hotspot";
import { NEAR_KM_THRESHOLD, hotspotRowCells, type HotspotNearestRow } from "./map-hotspot-export";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dayRange: HotspotDayRange;
  /** Provinsi & Distrik terpilih di filter lahan (level muat data = Distrik). */
  area: { provinceName: string | null; districtName: string | null };
  /** Jumlah titik per keyakinan (seluruh titik termuat, bukan hanya < 15 km). */
  counts: Record<HotspotConfBucket, number>;
  /** False bila jarak tak bisa dihitung (data peta tanpa titik Lembaga Petani)
   *  — tampilkan keterangan, jangan "0 titik" yang terbaca sebagai hasil. */
  distancesAvailable: boolean;
  /** Baris < 15 km dari Lembaga Petani, sudah urut jarak terdekat. */
  nearRows: HotspotNearestRow[];
  onDownloadShp: () => void;
  onPrintPdf: () => void;
  /** Klik baris tabel: tutup modal + zoom peta ke titik api tsb. */
  onZoomToPoint: (lon: number, lat: number) => void;
  /** EXPORT menu Peta Lahan — gate tombol "Unduh SHP". */
  canExport: boolean;
  /** PRINT menu Peta Lahan — gate tombol "Cetak PDF". */
  canPrint: boolean;
}

/** Pill keyakinan mengikuti warna legenda titik api. */
function ConfidenceBadge({ confidence }: { confidence: unknown }) {
  const bucket = confidenceBucket(confidence);
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{
        backgroundColor: HOTSPOT_CONF_COLORS[bucket],
        color: bucket === "low" ? "#422006" : "#ffffff",
      }}
    >
      {HOTSPOT_CONF_LABELS[bucket]}
    </span>
  );
}

/**
 * Modal ringkasan titik api: tampil otomatis saat kalkulasi jarak selesai
 * (bisa dibuka ulang dari panel). Ringkasan total + per keyakinan + jumlah
 * < 15 km, lalu tabel titik < 15 km saja (urut jarak terdekat).
 */
export function HotspotSummaryDialog({
  open,
  onOpenChange,
  dayRange,
  area,
  counts,
  distancesAvailable,
  nearRows,
  onDownloadShp,
  onPrintPdf,
  onZoomToPoint,
  canExport,
  canPrint,
}: Props) {
  const total = counts.high + counts.nominal + counts.low;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* `sm:max-w-*` (berprefiks) — WAJIB. Bentuk tanpa prefiks (`max-w-3xl`)
          menimpa penjaga `max-w-[calc(100%-2rem)]` milik DialogContent lewat
          tailwind-merge, sehingga modal bisa melebihi viewport di layar sempit
          (#292). Tujuh kolom tabel butuh 5xl agar terbaca tanpa geser. */}
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-red-500" />
            Ringkasan Titik Api
          </DialogTitle>
          <DialogDescription>
            Rentang {hotspotWindowLabel(dayRange)} terakhir · Provinsi:{" "}
            {area.provinceName ?? "—"} · Distrik: {area.districtName ?? "—"} · sumber NASA FIRMS
            (VIIRS 375 m)
          </DialogDescription>
        </DialogHeader>

        {/* Ringkasan angka */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
          <span>
            Total <span className="font-semibold tabular-nums">{formatNumber(total)}</span> titik
          </span>
          {(["high", "nominal", "low"] as HotspotConfBucket[]).map((b) => (
            <span key={b} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: HOTSPOT_CONF_COLORS[b] }}
              />
              <span className="text-muted-foreground">{HOTSPOT_CONF_LABELS[b]}</span>
              <span className="font-mono text-xs tabular-nums">{formatNumber(counts[b])}</span>
            </span>
          ))}
          {distancesAvailable ? (
            <span className="text-muted-foreground">
              &lt; {NEAR_KM_THRESHOLD} km dari Lembaga Petani:{" "}
              <span className="font-semibold text-foreground tabular-nums">
                {formatNumber(nearRows.length)}
              </span>{" "}
              titik
            </span>
          ) : (
            <span className="text-muted-foreground">
              Jarak ke Lembaga Petani tidak dapat dihitung — data peta yang dimuat tidak memiliki
              titik Lembaga Petani.
            </span>
          )}
        </div>

        {/* Tabel titik < 15 km */}
        {!distancesAvailable ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Tabel titik terdekat membutuhkan titik Lembaga Petani pada data yang dimuat.
          </p>
        ) : nearRows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Tidak ada titik api berjarak &lt; {NEAR_KM_THRESHOLD} km dari Lembaga Petani.
          </p>
        ) : (
          <div className="max-h-[50vh] overflow-auto rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  {/* Semua kolom nowrap kecuali "Lembaga Terdekat" — nama
                      lembaga yang panjang dibiarkan membungkus di kolom itu
                      saja, agar tanggal/badge/angka tidak pecah baris (#292). */}
                  <TableHead className="w-10">No</TableHead>
                  <TableHead className="whitespace-nowrap">Waktu Deteksi (WIB)</TableHead>
                  <TableHead className="whitespace-nowrap">Satelit</TableHead>
                  <TableHead className="whitespace-nowrap">Keyakinan</TableHead>
                  <TableHead className="whitespace-nowrap text-right">FRP (MW)</TableHead>
                  <TableHead>Lembaga Terdekat</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Jarak (km)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nearRows.map((r, i) => {
                  const cells = hotspotRowCells(r);
                  return (
                    <TableRow
                      key={`${r.lon},${r.lat},${String(r.f.properties?.acqDatetime ?? i)}`}
                      className="cursor-pointer"
                      title="Zoom ke titik api ini"
                      onClick={() => onZoomToPoint(r.lon, r.lat)}
                    >
                      <TableCell className="text-muted-foreground tabular-nums">{i + 1}</TableCell>
                      <TableCell className="whitespace-nowrap">{cells.time}</TableCell>
                      <TableCell className="whitespace-nowrap">{cells.satellite}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <ConfidenceBadge confidence={r.f.properties?.confidence} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right font-mono tabular-nums">
                        {cells.frp}
                      </TableCell>
                      <TableCell>{cells.nearestName}</TableCell>
                      <TableCell className="whitespace-nowrap text-right font-mono tabular-nums">
                        {cells.distanceKm}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] leading-snug text-muted-foreground">
            Deteksi anomali panas, bukan konfirmasi kebakaran · jeda ±3 jam. Klik baris untuk zoom
            ke titiknya.
          </p>
          <div className="flex shrink-0 gap-2">
            {canExport && (
              <Button variant="outline" size="sm" onClick={onDownloadShp}>
                <Download className="h-3.5 w-3.5" />
                Unduh SHP
              </Button>
            )}
            {canPrint && (
              <Button size="sm" onClick={onPrintPdf}>
                <Printer className="h-3.5 w-3.5" />
                Cetak PDF
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
