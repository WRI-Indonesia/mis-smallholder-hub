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
 * Satu angka ringkasan: label kecil di atas, nilai memimpin di bawah (#294).
 * `dot` memberi penanda warna keyakinan — selalu berdampingan dengan label
 * teks, tidak pernah sebagai satu-satunya pembeda.
 */
function Stat({
  label,
  value,
  dot,
  lead = false,
  accent = false,
}: {
  label: string;
  value: string;
  dot?: string;
  lead?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 ${
        accent ? "border-primary/30 bg-primary/5" : "bg-muted/40"
      }`}
    >
      <div className="flex items-center gap-1.5 text-[11px] leading-tight text-muted-foreground">
        {dot && (
          <span
            aria-hidden
            className="inline-block h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: dot }}
          />
        )}
        <span className="truncate">{label}</span>
      </div>
      <div className={`mt-0.5 ${lead ? "text-2xl font-semibold" : "text-xl font-medium"}`}>
        {value}
      </div>
    </div>
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
      {/* Lebar modal (#292). Kelas dasar DialogContent: `w-full
          max-w-[calc(100%-2rem)] sm:max-w-sm`.
          - `sm:max-w-5xl` menggantikan `sm:max-w-sm` (segrup di tailwind-merge).
            Tanpa prefiks, `max-w-*` justru membuang penjaga dan MEMBIARKAN
            `sm:max-w-sm` hidup — itu sebabnya modal ini dulu terjepit 384px.
          - `w-[calc(100%-2rem)]` menggantikan `w-full`: penjaga bawaan hanya
            berlaku di bawah 640px (aturan `sm:` ada di blok @media yang
            di-emit belakangan), jadi tanpa ini modal menempel ke tepi layar
            pada lebar 640–1056px. Lihat docs/standards/ui-ux.md. */}
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-red-500" />
            Ringkasan Titik Api
          </DialogTitle>
          <DialogDescription>
            {/* Wilayah kosong dihilangkan, bukan dicetak "—" (#294): baris meta
                ini konteks, dan field kosong hanya menambah derau. */}
            {[
              `Rentang ${hotspotWindowLabel(dayRange)} terakhir`,
              area.provinceName,
              area.districtName,
              "NASA FIRMS (VIIRS 375 m)",
            ]
              .filter(Boolean)
              .join(" · ")}
          </DialogDescription>
        </DialogHeader>

        {/* Ringkasan (#294): dua angka utama + grafik sebaran keyakinan.
            Bar HORIZONTAL, bukan stacked/pie: nama kategori panjang ("Nominal
            (Medium)") dan sebarannya sangat timpang — pada stacked bar segmen
            "Rendah" (2 dari 543) hilang sama sekali, sedangkan pada bar
            horizontal ia tetap punya barisnya sendiri lengkap dengan angka.
            Angka di-direct-label pada tiap baris; warna keyakinan tidak pernah
            jadi pembeda tunggal (kuning #facc15 hanya 1,49:1 vs latar terang). */}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Total titik" value={formatNumber(total)} lead />
          {distancesAvailable ? (
            <Stat
              label={`< ${NEAR_KM_THRESHOLD} km dari Lembaga`}
              value={formatNumber(nearRows.length)}
              lead
              accent
            />
          ) : (
            <p className="self-center rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
              Jarak ke Lembaga Petani tidak dapat dihitung — data peta yang dimuat tidak memiliki
              titik Lembaga Petani.
            </p>
          )}
          <div className="rounded-lg border bg-muted/40 px-3 py-2 sm:col-span-2">
            <div className="mb-1.5 text-[11px] leading-tight text-muted-foreground">
              Sebaran keyakinan deteksi
            </div>
            <div className="space-y-1">
              {(["high", "nominal", "low"] as HotspotConfBucket[]).map((b) => {
                const n = counts[b];
                const pct = total > 0 ? (n / total) * 100 : 0;
                return (
                  <div key={b} className="flex items-center gap-2 text-xs">
                    <span className="w-28 shrink-0 truncate text-muted-foreground">
                      {HOTSPOT_CONF_LABELS[b]}
                    </span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-foreground/5">
                      {/* min 3px agar nilai bukan-nol tetap terlihat; angka
                          persisnya tetap tertulis di sebelahnya. */}
                      <span
                        className="block h-full rounded-full"
                        style={{
                          width: n > 0 ? `max(3px, ${pct.toFixed(2)}%)` : 0,
                          backgroundColor: HOTSPOT_CONF_COLORS[b],
                        }}
                      />
                    </span>
                    <span className="w-16 shrink-0 text-right tabular-nums">
                      {formatNumber(n)}
                      <span className="ml-1 text-[10px] text-muted-foreground">
                        {pct.toFixed(pct > 0 && pct < 1 ? 1 : 0)}%
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
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
                  {/* TableHead/TableCell sudah `whitespace-nowrap` di kelas
                      dasarnya (components/ui/table.tsx), jadi kolom lain tidak
                      perlu diapa-apakan. Hanya "Lembaga Terdekat" yang di-opt-out
                      lewat `whitespace-normal` agar nama panjang membungkus dan
                      tidak melebarkan tabel melewati modal (#292). */}
                  <TableHead className="w-10">No</TableHead>
                  <TableHead>Waktu Deteksi (WIB)</TableHead>
                  <TableHead>Satelit</TableHead>
                  <TableHead>Keyakinan</TableHead>
                  <TableHead className="text-right">FRP (MW)</TableHead>
                  <TableHead>Lembaga Terdekat</TableHead>
                  <TableHead className="text-right">Jarak (km)</TableHead>
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
                      <TableCell>{cells.time}</TableCell>
                      <TableCell>{cells.satellite}</TableCell>
                      <TableCell>
                        <ConfidenceBadge confidence={r.f.properties?.confidence} />
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {cells.frp}
                      </TableCell>
                      <TableCell className="min-w-[14rem] whitespace-normal">
                        {cells.nearestName}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
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
