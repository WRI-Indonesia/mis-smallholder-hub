"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  bmpMonevActivityProfile,
  bmpMonevAvailableYears,
  bmpMonevGroupProfiles,
  bmpMonevGroupRows,
  bmpMonevScoreHistogram,
  bmpMonevTotals,
  bmpMonevTrend,
  bmpMonevWeakestIndicators,
  filterBmpMonevGroups,
  type BmpMonevDashboardView,
  type BmpMonevGroupProfileSort,
} from "@/lib/bmp-monev-dashboard-aggregation";
import { BmpMonevActivityRadar, type BmpMonevRadarSelection } from "./bmp-monev-activity-radar";
import { BmpMonevWeakestIndicators } from "./bmp-monev-weakest-indicators";
import { BmpMonevGroupHeatmap } from "./bmp-monev-group-heatmap";
import { BmpMonevScoreCards } from "./bmp-monev-score-cards";
import { BmpMonevCategoryOverview } from "./bmp-monev-category-overview";
import { BmpMonevScoreHistogram } from "./bmp-monev-score-histogram";
import { BmpMonevGroupBoard } from "./bmp-monev-group-board";
import { BmpMonevPriorityFarmers } from "./bmp-monev-priority-farmers";
import { BmpMonevSection } from "./bmp-monev-section";
import { BmpMonevTrendChart } from "./bmp-monev-trend-chart";
import { BmpMonevGroupTable } from "./bmp-monev-group-table";
import { formatGeneratedAt } from "@/lib/format";

export function BmpMonevDashboardClient({
  view,
  helpSlot,
  canExport,
}: {
  view: BmpMonevDashboardView;
  helpSlot?: React.ReactNode;
  canExport: boolean;
}) {
  // Filter di query string (TD-021) — pola Dashboard Pelatihan.
  const { get, setMany } = useUrlFilters();
  const allGroups = view.data.groups;

  const districtParam = get("distrik");
  const districtId = allGroups.some((g) => g.districtId === districtParam) ? districtParam : null;
  const groupParam = get("lembaga");
  const groupId = allGroups.some((g) => g.id === groupParam) ? groupParam : null;

  const yearOptions = useMemo(() => bmpMonevAvailableYears(allGroups), [allGroups]);
  // Default = tahun terbaru ber-data (penilaian bersifat per tahun, bukan kumulatif).
  const yearParam = get("tahun");
  const year =
    yearParam != null && /^\d{4}$/.test(yearParam) && yearOptions.includes(Number(yearParam))
      ? Number(yearParam)
      : (yearOptions[0] ?? null);

  const setDistrictId = (v: string | null) => setMany({ distrik: v, lembaga: null });
  const setGroupId = (v: string | null) => setMany({ lembaga: v });
  const setYear = (v: number | null) => setMany({ tahun: v == null ? null : String(v) });

  const [districtOpen, setDistrictOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);

  const districtOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of allGroups) map.set(g.districtId, g.districtName);
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [allGroups]);
  const groupOptions = useMemo(() => allGroups.filter((g) => !districtId || g.districtId === districtId), [allGroups, districtId]);

  const groups = useMemo(() => filterBmpMonevGroups(allGroups, { districtId, groupId }), [allGroups, districtId, groupId]);
  const totals = useMemo(() => (year == null ? null : bmpMonevTotals(groups, year)), [groups, year]);
  const rows = useMemo(() => (year == null ? [] : bmpMonevGroupRows(groups, year)), [groups, year]);
  const trend = useMemo(() => bmpMonevTrend(groups), [groups]);
  const histogram = useMemo(() => (year == null ? [] : bmpMonevScoreHistogram(groups, year)), [groups, year]);
  // Rincian indikator (#346) — payload lama tanpa `activities` tetap jalan (kartu disembunyikan).
  const activities = useMemo(() => view.data.activities ?? [], [view.data.activities]);
  const indicatorCatalog = useMemo(() => view.data.indicators ?? [], [view.data.indicators]);
  const indicatorStats = useMemo(() => view.data.indicatorStats ?? [], [view.data.indicatorStats]);
  const activityProfile = useMemo(() => (year == null ? [] : bmpMonevActivityProfile(groups, year, activities, indicatorCatalog)), [groups, year, activities, indicatorCatalog]);
  const weakest = useMemo(() => (year == null ? [] : bmpMonevWeakestIndicators(groups, year, indicatorCatalog, indicatorStats)), [groups, year, indicatorCatalog, indicatorStats]);
  const [profileSort, setProfileSort] = useState<BmpMonevGroupProfileSort>("avg");
  const groupProfiles = useMemo(() => (year == null ? [] : bmpMonevGroupProfiles(groups, year, profileSort)), [groups, year, profileSort]);
  const hasDetails = activities.length > 0 && (activityProfile[0]?.n ?? 0) > 0;
  const hasGroupProfiles = groupProfiles.some((g) => g.hasProfile);
  // Seri B radar mengikuti filter dashboard sebagai pilihan awal (Lembaga > Distrik),
  // tetapi setelah itu bebas dipilih — komponen di-remount lewat `key` saat filter berubah.
  const radarDefaultB: BmpMonevRadarSelection | null = groupId ? { kind: "group", id: groupId } : districtId ? { kind: "district", id: districtId } : null;

  const yearLabel = year == null ? "—" : String(year);
  const selectedDistrict = districtOptions.find((d) => d.id === districtId);
  const selectedGroup = allGroups.find((g) => g.id === groupId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Dashboard Monev BMP</h1>
            {helpSlot}
          </div>
          <p className="text-muted-foreground">
            Hasil Monitoring &amp; Evaluasi praktik BMP per petani — data per{" "}
            <span className="font-medium text-foreground">{formatGeneratedAt(view.generatedAt)}</span>. Produksi &amp; produktivitas ada di{" "}
            <Link href="/admin/dashboard/bmp" className="text-primary hover:underline">
              BMP Dashboard (Produksi)
            </Link>
            .
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Popover open={districtOpen} onOpenChange={setDistrictOpen}>
            <PopoverTrigger
              render={
                <Button variant="outline" role="combobox" className="w-[180px] justify-between h-9 font-normal">
                  <span className={cn("truncate", !districtId && "text-muted-foreground")}>{selectedDistrict?.name ?? "Semua Distrik"}</span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              }
            />
            <PopoverContent className="w-[220px] p-0" align="end">
              <Command>
                <CommandInput placeholder="Cari distrik..." />
                <CommandList>
                  <CommandEmpty>Distrik tidak ditemukan.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="Semua Distrik"
                      onSelect={() => {
                        setDistrictId(null);
                        setDistrictOpen(false);
                      }}
                    >
                      <Check className={cn("mr-2 h-4 w-4", !districtId ? "opacity-100" : "opacity-0")} />
                      Semua Distrik
                    </CommandItem>
                    {districtOptions.map((d) => (
                      <CommandItem
                        key={d.id}
                        value={d.name}
                        onSelect={() => {
                          setDistrictId(d.id);
                          setDistrictOpen(false);
                        }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", districtId === d.id ? "opacity-100" : "opacity-0")} />
                        {d.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <Popover open={groupOpen} onOpenChange={setGroupOpen}>
            <PopoverTrigger
              render={
                <Button variant="outline" role="combobox" className="w-[200px] justify-between h-9 font-normal">
                  <span className={cn("truncate", !groupId && "text-muted-foreground")}>{selectedGroup?.name ?? "Semua Lembaga Petani"}</span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              }
            />
            <PopoverContent className="w-[240px] p-0" align="end">
              <Command>
                <CommandInput placeholder="Cari lembaga petani..." />
                <CommandList>
                  <CommandEmpty>Lembaga petani tidak ditemukan.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="Semua Lembaga Petani"
                      onSelect={() => {
                        setGroupId(null);
                        setGroupOpen(false);
                      }}
                    >
                      <Check className={cn("mr-2 h-4 w-4", !groupId ? "opacity-100" : "opacity-0")} />
                      Semua Lembaga Petani
                    </CommandItem>
                    {groupOptions.map((g) => (
                      <CommandItem
                        key={g.id}
                        value={g.name}
                        onSelect={() => {
                          setGroupId(g.id);
                          setGroupOpen(false);
                        }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", groupId === g.id ? "opacity-100" : "opacity-0")} />
                        {g.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <Select value={year == null ? "" : String(year)} onValueChange={(v) => setYear(v ? Number(v) : null)} disabled={yearOptions.length === 0}>
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue placeholder="Tahun">{(v: string) => (v ? `Survei ${v}` : "Tahun")}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {totals == null ? (
        <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">
          Belum ada penilaian Monev BMP. Input atau import skor lewat{" "}
          <Link href="/admin/master-data/bmp-monev" className="text-primary hover:underline">
            Master Data › Monev BMP
          </Link>
          .
        </div>
      ) : (
        <>
          {/* Alur baca (revisi UX owner 2026-09-19/20): 1 gambaran umum → 2 Lembaga
              (papan gabungan komposisi+rerata+cakupan, klik = filter; profil
              kelembagaan) → 3 kegiatan & indikator (radar pembanding) → 4 tindak lanjut
              (petani prioritas, sebaran, tren) → tabel terlipat paling bawah. */}
          <BmpMonevSection step={1} title="Gambaran umum" lead="Seberapa jauh petani sudah menerapkan BMP pada tahun survei terpilih.">
            <BmpMonevScoreCards totals={totals} yearLabel={yearLabel} />
            <BmpMonevCategoryOverview totals={totals} yearLabel={yearLabel} />
          </BmpMonevSection>

          <BmpMonevSection step={2} title="Lembaga Petani" lead="Lembaga mana yang unggul dan tertinggal — komposisi kategori, rerata, cakupan survei, dan profil kelembagaannya.">
            <BmpMonevGroupBoard rows={rows} yearLabel={yearLabel} selectedGroupId={groupId} onSelectGroup={setGroupId} />
            {hasGroupProfiles && <BmpMonevGroupHeatmap rows={groupProfiles} indicators={indicatorCatalog} yearLabel={yearLabel} sort={profileSort} onSortChange={setProfileSort} />}
          </BmpMonevSection>

          {(hasDetails || hasGroupProfiles) && (
            <BmpMonevSection step={3} title="Kegiatan & indikator" lead="Bandingkan profil 5 kegiatan antar cakupan (semua · distrik · Lembaga) dan lihat indikator apa yang paling lemah — bahan materi pendampingan.">
              <BmpMonevActivityRadar key={`${districtId ?? ""}|${groupId ?? ""}|${year}`} allGroups={allGroups} year={year!} activities={activities} indicators={indicatorCatalog} defaultB={radarDefaultB} />
              <BmpMonevWeakestIndicators rows={weakest} yearLabel={yearLabel} />
            </BmpMonevSection>
          )}

          <BmpMonevSection step={hasDetails || hasGroupProfiles ? 4 : 3} title="Tindak lanjut & tren" lead="Siapa yang perlu dikunjungi dulu dan siapa yang bisa jadi contoh, bagaimana bentuk sebaran skornya, dan perubahannya antar tahun survei.">
            <div className="grid gap-4 lg:grid-cols-2">
              <BmpMonevPriorityFarmers districtId={districtId} groupId={groupId} year={year!} order="lowest" />
              <BmpMonevPriorityFarmers districtId={districtId} groupId={groupId} year={year!} order="highest" />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <BmpMonevScoreHistogram bins={histogram} avgScore={totals.avgScore} yearLabel={yearLabel} />
              <BmpMonevTrendChart buckets={trend} activeYear={year} />
            </div>
            <BmpMonevGroupTable rows={rows} year={year} canExport={canExport} />
          </BmpMonevSection>
        </>
      )}
    </div>
  );
}
