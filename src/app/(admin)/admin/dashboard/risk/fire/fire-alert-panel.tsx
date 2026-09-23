"use client";

import { CalendarDays, Flame, Loader2, Printer, ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { StatTooltipContent, StatTooltipRow } from "@/components/shared/stat-tooltip";
import {
  FIRMS_SOURCES,
  HOTSPOT_DAY_RANGES,
  HOTSPOT_MONTH_MIN,
  parseHotspotMonth,
  utcMonth,
  type HotspotCoverage,
  type HotspotDayRange,
} from "@/lib/firms";
import {
  HOTSPOT_CONF_COLORS,
  HOTSPOT_CONF_LABELS,
  hotspotWindowLabel,
  type HotspotConfBucket,
} from "@/app/(admin)/admin/map/parcel/map-hotspot";
import {
  formatDateList,
  formatHotspotRange,
  type AreaCount,
  type FireGroupCount,
  type FireSummary,
} from "@/lib/fire-alert";

/** Scope cetak: seluruh Riau atau satu distrik (keputusan owner: tanpa per-lembaga). */
export type FirePrintScope = "riau" | `district:${string}`;

/** "Januari" … "Desember" — indeks 0–11, untuk pemilih bulan. */
const MONTH_NAMES = Array.from({ length: 12 }, (_, i) =>
  new Intl.DateTimeFormat("id-ID", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2020, i, 1)))
);

/** Label sumber ringkas di panel; kalimat lengkapnya ada di catatan metodologi PDF. */
const SOURCE_SHORT: Record<string, string> = {
  [FIRMS_SOURCES.sp]: "arsip Standard Processing",
  [FIRMS_SOURCES.nrt]: "near-real-time (NRT)",
};

interface Props {
  helpSlot?: React.ReactNode;
  dayRange: HotspotDayRange;
  onDayRangeChange: (d: HotspotDayRange) => void;
  /** Mode Bulan (#365): "YYYY-MM"; null = rentang live `dayRange`. */
  month: string | null;
  onMonthChange: (month: string) => void;
  /** Cakupan periode dari proxy — hanya terisi di mode Bulan. */
  coverage: HotspotCoverage | null;
  /** "Januari 2025" / "5 hari terakhir" — judul tabel lembaga. */
  periodLabel: string;
  loading: boolean;
  summary: FireSummary | null;
  /** Breakdown confidence titik DALAM boundary. */
  confInside: Record<HotspotConfBucket, number>;
  /** Tooltip kartu Dalam Boundary: rincian per distrik program. */
  insideByDistrict: AreaCount[];
  /** Tooltip kartu Luar Boundary: rincian per kabupaten + "Kab. Lainnya". */
  outsideByKabupaten: AreaCount[];
  /** Tooltip kartu Total se-Riau: rincian semua titik per kabupaten. */
  totalByKabupaten: AreaCount[];
  rows: FireGroupCount[];
  /** Klik baris tabel → zoom peta ke boundary lembaga tsb (klik ulang = batal). */
  onZoomToGroup: (farmerGroupId: string) => void;
  /** Lembaga yang sedang terpilih — barisnya di-highlight. */
  selectedGroupId: string | null;
  districts: { id: string; name: string }[];
  canPrint: boolean;
  printScope: FirePrintScope;
  onPrintScopeChange: (s: FirePrintScope) => void;
  onPrint: () => void;
  printing: boolean;
  /** Kemajuan capture lampiran per lembaga; null = tahap persiapan (#276). */
  printProgress: { done: number; total: number } | null;
  onCancelPrint: () => void;
}

export function FireAlertPanel({
  helpSlot,
  dayRange,
  onDayRangeChange,
  month,
  onMonthChange,
  coverage,
  periodLabel,
  loading,
  summary,
  confInside,
  insideByDistrict,
  outsideByKabupaten,
  totalByKabupaten,
  rows,
  onZoomToGroup,
  selectedGroupId,
  districts,
  canPrint,
  printScope,
  onPrintScopeChange,
  onPrint,
  printing,
  printProgress,
  onCancelPrint,
}: Props) {
  // Opsi tahun/bulan dibatasi [HOTSPOT_MONTH_MIN, bulan berjalan UTC] — bulan
  // yang belum tiba tidak ditawarkan, bukan ditolak setelah dipilih.
  const now = new Date();
  const currentMonth = utcMonth(now);
  const firstYear = Number(HOTSPOT_MONTH_MIN.slice(0, 4));
  const lastYear = Number(currentMonth.slice(0, 4));
  const years = Array.from({ length: lastYear - firstYear + 1 }, (_, i) => String(lastYear - i));
  const selectedYear = month?.slice(0, 4) ?? currentMonth.slice(0, 4);
  const selectedMonth = month?.slice(5, 7) ?? currentMonth.slice(5, 7);
  const monthOptions = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).filter(
    (mm) => parseHotspotMonth(`${selectedYear}-${mm}`, now) !== null
  );
  const isPartial = coverage !== null && coverage.to.slice(0, 7) === currentMonth;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <ShieldAlert className="h-4 w-4 text-red-600 dark:text-red-400" />
        <h1 className="text-sm font-semibold">Fire Alert</h1>
        <div className="ml-auto">{helpSlot}</div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {/* Rentang waktu — mengikuti Peta Lahan (24 jam / 5 / 10 / 30 hari, #284)
            + mode Bulan kalender dari arsip FIRMS (#365). */}
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Rentang waktu</p>
          <div className="grid grid-cols-2 gap-1 rounded-md border p-1">
            {HOTSPOT_DAY_RANGES.map((d) => (
              <button
                key={d}
                onClick={() => onDayRangeChange(d)}
                className={cn(
                  "rounded px-2 py-1.5 text-xs font-medium transition-colors",
                  month === null && dayRange === d
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {hotspotWindowLabel(d)} terakhir
              </button>
            ))}
            {/* Masuk mode Bulan = bulan lalu: laporan bulanan lazimnya untuk
                bulan yang sudah rampung; bulan berjalan tetap bisa dipilih. */}
            <button
              onClick={() => month === null && onMonthChange(utcMonth(now, -1))}
              className={cn(
                "col-span-2 flex items-center justify-center gap-1.5 rounded px-2 py-1.5 text-xs font-medium transition-colors",
                month !== null
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <CalendarDays className="h-3.5 w-3.5" /> Bulan tertentu (laporan bulanan)
            </button>
          </div>
          {month !== null && (
            <div className="mt-1.5 space-y-1.5">
              <div className="grid grid-cols-[1fr_5.5rem] gap-1.5">
                <Select
                  value={selectedMonth}
                  onValueChange={(v) => v && onMonthChange(`${selectedYear}-${v}`)}
                  items={Object.fromEntries(monthOptions.map((mm) => [mm, MONTH_NAMES[Number(mm) - 1]]))}
                >
                  <SelectTrigger className="h-8 w-full text-xs" aria-label="Bulan">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((mm) => (
                      <SelectItem key={mm} value={mm}>
                        {MONTH_NAMES[Number(mm) - 1]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={selectedYear}
                  onValueChange={(v) => v && onMonthChange(`${v}-${selectedMonth}`)}
                  items={Object.fromEntries(years.map((y) => [y, y]))}
                >
                  <SelectTrigger className="h-8 w-full text-xs" aria-label="Tahun">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={y}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Cakupan dari proxy: bulan berjalan = parsial; sumber yang
                  dipakai; tanggal kosong disebut terang — FIRMS memangkas
                  jendela di luar ketersediaan tanpa galat. */}
              {coverage && !loading && (
                <div className="space-y-0.5 text-[10px] leading-snug text-muted-foreground">
                  {isPartial && (
                    <p>
                      Bulan berjalan — data{" "}
                      {formatHotspotRange(
                        new Date(`${coverage.from}T00:00:00Z`),
                        new Date(`${coverage.to}T00:00:00Z`)
                      )}{" "}
                      (parsial).
                    </p>
                  )}
                  <p>
                    Sumber FIRMS:{" "}
                    {coverage.sources.length > 0
                      ? coverage.sources.map((src) => SOURCE_SHORT[src] ?? src).join(" + ")
                      : "tidak ada"}
                    .
                  </p>
                  {coverage.missingDates.length > 0 && (
                    <p className="font-medium text-amber-700 dark:text-amber-400">
                      {formatNumber(coverage.missingDates.length)} tanggal belum tersedia di FIRMS:{" "}
                      {formatDateList(coverage.missingDates)}.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Kartu ringkasan */}
        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-md border py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Memuat titik api…
          </div>
        ) : summary ? (
          <div className="grid grid-cols-2 gap-2">
            <SummaryCard
              label="Dalam Boundary"
              value={formatNumber(summary.inside)}
              highlight={summary.inside > 0}
              breakdown={insideByDistrict}
            />
            <SummaryCard
              label="Lembaga Terdampak"
              value={`${summary.groupsAffected}/${rows.length}`}
              breakdown={rows
                .filter((r) => r.count > 0)
                .map((r) => ({ name: r.name, count: r.count }))}
            />
            <SummaryCard
              label="Luar Boundary"
              value={formatNumber(summary.outside)}
              muted
              breakdown={outsideByKabupaten}
            />
            <SummaryCard
              label="Total se-Riau"
              value={formatNumber(summary.total)}
              muted
              breakdown={totalByKabupaten}
            />
          </div>
        ) : (
          <div className="rounded-md border py-6 text-center text-sm text-muted-foreground">
            Gagal memuat titik api.
          </div>
        )}

        {/* Breakdown confidence titik dalam boundary */}
        {summary && summary.inside > 0 && (
          <div className="space-y-1.5 rounded-md border p-3">
            {/* "Keyakinan", bukan "Confidence" — seragam dengan kolom PDF,
                modal Peta Lahan, dan tabel ekspor. */}
            <p className="text-xs font-medium text-muted-foreground">
              Keyakinan deteksi (dalam boundary)
            </p>
            {/* Satu baris per tingkat (bukan flex-wrap yang mengalir 2+1) dengan
                bar porsi terhadap total: dominasi satu tingkat langsung terbaca
                tanpa membandingkan angka satu per satu. */}
            <div className="space-y-1">
              {(Object.keys(HOTSPOT_CONF_COLORS) as HotspotConfBucket[]).map((b) => {
                const count = confInside[b];
                const share = summary.inside > 0 ? (count / summary.inside) * 100 : 0;
                return (
                  <div key={b} className="flex items-center gap-2 text-xs">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: HOTSPOT_CONF_COLORS[b] }}
                    />
                    <span className="w-28 shrink-0 truncate">{HOTSPOT_CONF_LABELS[b]}</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <span
                        className="block h-full rounded-full"
                        style={{ width: `${share}%`, backgroundColor: HOTSPOT_CONF_COLORS[b] }}
                      />
                    </span>
                    {/* Nol diredupkan agar tingkat yang benar-benar terdeteksi menonjol. */}
                    <span
                      className={cn(
                        "w-10 shrink-0 text-right tabular-nums",
                        count > 0 ? "font-semibold" : "text-muted-foreground"
                      )}
                    >
                      {formatNumber(count)}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between border-t pt-1.5 text-xs text-muted-foreground">
              <span>Total dalam boundary</span>
              <span className="font-semibold tabular-nums text-foreground">
                {formatNumber(summary.inside)}
              </span>
            </div>
          </div>
        )}

        {/* Tabel Lembaga × jumlah titik api — hanya lembaga ber-titik api
            (baris 0 disembunyikan, keputusan owner; berlaku juga di PDF). */}
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            Titik api per lembaga ({periodLabel})
          </p>
          <div className="overflow-hidden rounded-md border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                  <th className="px-2.5 py-1.5 font-medium">Lembaga</th>
                  <th className="w-14 px-2.5 py-1.5 text-right font-medium">Titik</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows
                  .filter((r) => r.count > 0)
                  .map((r) => (
                    <tr
                      key={r.farmerGroupId}
                      onClick={() => onZoomToGroup(r.farmerGroupId)}
                      title={
                        selectedGroupId === r.farmerGroupId
                          ? "Klik lagi untuk batal pilih"
                          : "Zoom ke boundary lembaga ini"
                      }
                      className={cn(
                        "cursor-pointer transition-colors",
                        selectedGroupId === r.farmerGroupId
                          ? // Selaras warna boundary terpilih di peta (#660099).
                            "border-l-2 border-l-purple-800 bg-purple-500/10 hover:bg-purple-500/15 dark:border-l-purple-400"
                          : "hover:bg-muted/50"
                      )}
                    >
                      <td className="px-2.5 py-1.5">
                        <p
                          className={cn(
                            "leading-tight",
                            selectedGroupId === r.farmerGroupId &&
                              "font-semibold text-purple-900 dark:text-purple-300"
                          )}
                        >
                          {r.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{r.districtName}</p>
                      </td>
                      <td className="px-2.5 py-1.5 text-right font-semibold tabular-nums text-red-600 dark:text-red-400">
                        <Flame className="mr-1 inline h-3 w-3" />
                        {formatNumber(r.count)}
                        {r.shared > 0 && (
                          <p className="text-[9px] font-normal leading-tight text-muted-foreground">
                            {formatNumber(r.shared)} bersama
                          </p>
                        )}
                      </td>
                    </tr>
                  ))}
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-2.5 py-4 text-center text-muted-foreground">
                      Tidak ada boundary lembaga dalam cakupan akses Anda.
                    </td>
                  </tr>
                ) : (
                  rows.every((r) => r.count === 0) && (
                    <tr>
                      <td colSpan={2} className="px-2.5 py-4 text-center text-muted-foreground">
                        Tidak ada titik api dalam boundary lembaga pada {month ? "periode" : "rentang"} ini.
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
          {/* Anti-"double counting": titik di wilayah tumpang-tindih memang
              dihitung di tiap lembaga pemilik — jelaskan selisihnya. */}
          {summary && summary.insideShared > 0 && (
            <p className="mt-1.5 text-[10px] leading-snug text-muted-foreground">
              {formatNumber(summary.insideShared)} titik berada di wilayah tumpang-tindih boundary dan
              dihitung di tiap lembaga pemiliknya — jumlah kolom Titik dapat melebihi total titik unik (
              {formatNumber(summary.inside)}).
            </p>
          )}
        </div>
      </div>

      {/* Print Map — Full Riau / Per District (per-lembaga dicabut, review owner) */}
      {canPrint && (
        <div className="space-y-2 border-t p-4">
          <p className="text-xs font-medium text-muted-foreground">Print Map</p>
          <Select
            value={printScope}
            onValueChange={(v) => v && onPrintScopeChange(v as FirePrintScope)}
            // Base UI SelectValue menampilkan value mentah tanpa peta label ini.
            items={{
              riau: "Full Riau",
              ...Object.fromEntries(districts.map((d) => [`district:${d.id}`, `Distrik ${d.name}`])),
            }}
          >
            <SelectTrigger className="h-8 w-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="riau">Full Riau</SelectItem>
              <SelectGroup>
                <SelectLabel>Per District</SelectLabel>
                {districts.map((d) => (
                  <SelectItem key={d.id} value={`district:${d.id}`}>
                    Distrik {d.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            className="w-full"
            onClick={onPrint}
            disabled={printing || loading || !summary}
          >
            {printing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {printProgress
                  ? `Peta lembaga ${printProgress.done} dari ${printProgress.total}…`
                  : "Menyiapkan…"}
              </>
            ) : (
              <>
                <Printer className="h-3.5 w-3.5" />{" "}
                {month ? "Cetak Laporan Bulanan (PDF)" : "Cetak Peta (PDF)"}
              </>
            )}
          </Button>
          {/* Lampiran di-capture berurutan menunggu tile tiap lembaga — pada
              Full Riau bisa beberapa menit, jadi harus bisa dihentikan. */}
          {printing && (
            <Button size="sm" variant="outline" className="w-full" onClick={onCancelPrint}>
              <X className="h-3.5 w-3.5" /> Batalkan
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  highlight,
  muted,
  breakdown,
}: {
  label: string;
  value: number | string;
  highlight?: boolean;
  muted?: boolean;
  /** Rincian per wilayah — ditampilkan sebagai tooltip saat hover kartu. */
  breakdown?: AreaCount[];
}) {
  const card = (
    <div
      className={cn(
        "rounded-md border p-2.5",
        highlight && "border-red-300 bg-red-500/5 dark:border-red-900"
      )}
    >
      <p className="text-[11px] leading-tight text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-0.5 text-lg font-bold tabular-nums leading-tight",
          highlight && "text-red-600 dark:text-red-400",
          muted && "text-muted-foreground"
        )}
      >
        {value}
      </p>
    </div>
  );

  if (!breakdown || breakdown.length === 0) return card;
  return (
    <Tooltip>
      <TooltipTrigger render={card} />
      <StatTooltipContent title={label}>
        {breakdown.map((b) => (
          <StatTooltipRow
            key={b.name}
            chip={b.count > 0 ? (highlight ? "bg-red-500" : "bg-orange-400") : "bg-muted-foreground/40"}
            label={b.name}
            value={b.count}
          />
        ))}
      </StatTooltipContent>
    </Tooltip>
  );
}
