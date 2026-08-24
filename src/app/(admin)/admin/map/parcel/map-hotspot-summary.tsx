"use client";

import type { ReactNode } from "react";
import { Download, Flame, MapPin, Printer } from "lucide-react";
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

/** Nilai yang ditonjolkan di baris meta (#294). */
function Emph({ children }: { children: ReactNode }) {
  return <span className="font-semibold text-foreground">{children}</span>;
}

/** Pemisah redup antar segmen baris meta. */
function Sep() {
  return (
    <span aria-hidden className="text-muted-foreground/50">
      ·
    </span>
  );
}

/**
 * Satu angka ringkasan: label kecil di atas, nilai memimpin di bawah (#294).
 * `dot` memberi penanda warna keyakinan — selalu berdampingan dengan label
 * teks, tidak pernah sebagai satu-satunya pembeda.
 */
function Stat({
  icon,
  label,
  value,
  accent = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    /* Ikon di kiri, label + nilai rata kanan (#294). Kartunya jauh lebih lebar
       daripada angkanya; menaruh teks di kiri menyisakan ruang kosong besar di
       kanan, sedangkan ikon-kiri/teks-kanan memakai lebar itu sebagai jarak
       yang disengaja. Ikon `aria-hidden` — label teks yang menamai angkanya. */
    <div
      className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${
        accent ? "border-primary/30 bg-primary/5" : "bg-muted/40"
      }`}
    >
      <span
        aria-hidden
        className={`shrink-0 ${accent ? "text-primary/70" : "text-muted-foreground/60"}`}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1 text-right">
        <div className="truncate text-[11px] leading-tight text-muted-foreground">{label}</div>
        <div className="mt-1 text-3xl font-semibold leading-none tracking-tight">{value}</div>
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
  // Wilayah data LAHAN yang dimuat — bukan cakupan titik apinya, yang selalu
  // se-Provinsi Riau. Dipakai untuk melabeli jarak "< 15 km", karena Lembaga
  // Petani pembanding hanya yang ada di data yang dimuat itu.
  const loadedAreaLabel = area.districtName ?? area.provinceName ?? null;
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
          {/* Nilai penting (rentang & wilayah) ditonjolkan, kata penghubungnya
              tetap redup (#294) — sebelumnya seluruh baris seragam abu-abu
              sehingga tidak ada yang menonjol.
              "Riau · Kampar" polos SENGAJA tidak dipakai lagi: modal ini
              mencampur dua cakupan berbeda — hitungan titik api selalu
              se-Provinsi Riau (lihat map-parcel-client.tsx: fetchHotspots
              memakai RIAU_BBOX lalu dipangkas ke poligon kabupaten Riau, tanpa
              filter distrik), sedangkan "< 15 km" dihitung terhadap Lembaga
              Petani pada data lahan yang dimuat. Menulis keduanya berjajar
              membuat pembaca menyangka semua angka milik Kampar. */}
          <DialogDescription className="flex flex-wrap items-center gap-x-1.5 text-sm">
            <span>Rentang</span>
            <Emph>{hotspotWindowLabel(dayRange)} terakhir</Emph>
            {loadedAreaLabel && (
              <>
                <Sep />
                <span>Data lahan</span>
                <Emph>{loadedAreaLabel}</Emph>
              </>
            )}
            <Sep />
            <span>NASA FIRMS (VIIRS 375 m)</span>
          </DialogDescription>
        </DialogHeader>

        {/* Ringkasan (#294, opsi C — pilihan owner 2026-08-24): dua angka
            tunggal sebagai kartu, tiga tingkat keyakinan sebagai satu bar
            bertumpuk.
            Catatan untuk yang membaca nanti: pada sebaran timpang (mis. 507
            dari 543 Nominal) segmen kecil menyusut jadi serpihan — termasuk
            "Tinggi" yang justru paling genting. Itu diterima sebagai keputusan
            desain; kompensasinya WAJIB dipertahankan: lebar minimum 3px per
            segmen bukan-nol, dan legenda di bawahnya yang memuat hitungan
            persis + persentase. Warna tidak pernah jadi pembeda tunggal —
            kuning #facc15 hanya 1,49:1 terhadap latar terang. */}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_2fr]">
          {/* "se-Riau" eksplisit: cakupan titik api TIDAK mengikuti distrik
              yang dimuat, dan tanpa keterangan ini pembaca menyangka angkanya
              milik distrik tsb (#294). "Riau" dikeraskan karena pemangkasannya
              memang selalu ke poligon kabupaten Provinsi Riau. */}
          <Stat
            icon={<Flame className="h-8 w-8" strokeWidth={1.5} />}
            label="Total titik se-Riau"
            value={formatNumber(total)}
          />
          {distancesAvailable ? (
            <Stat
              icon={<MapPin className="h-8 w-8" strokeWidth={1.5} />}
              label={`< ${NEAR_KM_THRESHOLD} km dari Lembaga`}
              value={formatNumber(nearRows.length)}
              accent
            />
          ) : (
            <p className="self-center rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
              Jarak ke Lembaga Petani tidak dapat dihitung — data peta yang dimuat tidak memiliki
              titik Lembaga Petani.
            </p>
          )}
          <div className="rounded-lg border bg-muted/40 px-3 py-2">
            <div className="mb-2 text-[11px] leading-tight text-muted-foreground">
              Sebaran keyakinan deteksi
            </div>
            {/* gap-[2px]: pemisah antar segmen agar dua warna bersebelahan
                tidak terbaca menyatu. */}
            <div className="flex h-3 gap-[2px] overflow-hidden rounded-full">
              {(["high", "nominal", "low"] as HotspotConfBucket[]).map((b) => {
                const n = counts[b];
                const pct = total > 0 ? (n / total) * 100 : 0;
                return (
                  <span
                    key={b}
                    className="block h-full first:rounded-l-full last:rounded-r-full"
                    style={{
                      width: n > 0 ? `max(3px, ${pct.toFixed(2)}%)` : 0,
                      backgroundColor: HOTSPOT_CONF_COLORS[b],
                    }}
                  />
                );
              })}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
              {(["high", "nominal", "low"] as HotspotConfBucket[]).map((b) => {
                const n = counts[b];
                const pct = total > 0 ? (n / total) * 100 : 0;
                return (
                  <span key={b} className="flex items-center gap-1.5">
                    <span
                      aria-hidden
                      className="inline-block h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: HOTSPOT_CONF_COLORS[b] }}
                    />
                    <span className="text-muted-foreground">{HOTSPOT_CONF_LABELS[b]}</span>
                    <span className="font-medium tabular-nums">{formatNumber(n)}</span>
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {pct.toFixed(pct > 0 && pct < 1 ? 1 : 0)}%
                    </span>
                  </span>
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
