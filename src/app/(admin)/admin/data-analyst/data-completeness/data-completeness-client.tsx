"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Check,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Download,
  Users,
  Layers,
  GraduationCap,
  Sprout,
  ClipboardCheck,
  AlertTriangle,
  CheckCircle2,
  X,
  ExternalLink,
  Wrench,
  ListChecks,
  Network,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { StatTooltipContent, StatTooltipRow } from "@/components/shared/stat-tooltip";
import { FilterCombobox } from "@/components/shared/filter-combobox";
import { BandBar } from "@/components/shared/score-visuals";
import { RadarChart } from "@/components/shared/radar-chart";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { analyzeFarmerGroupCompleteness } from "@/server/actions/data-completeness";
import { DOMAIN_WEIGHTS } from "@/lib/data-completeness";
import { scoreBand } from "@/lib/data-availability-aggregation";
import { BAND_BAR, BAND_LEGEND, BAND_TEXT } from "@/lib/score-band-styles";
import {
  ANOMALY_CATALOG,
  FARMER_CHECK_COUNT,
  FARMER_FIELD_CHECKS,
  MODULE_DOMAIN_LABELS,
  PACKAGE_ANOMALY_PREFIX,
  PARCEL_CHECKS,
  PARCEL_CHECK_WEIGHT_TOTAL,
  PROFILE_CHECKS,
  SYSTEMIC_THRESHOLD,
} from "@/lib/data-completeness-registry";
import { maskIfNik } from "@/lib/mask";
import { formatNumber } from "@/lib/format";
import type {
  AnomalyItem,
  CheckKind,
  CheckRow,
  CompletenessDomainKey,
  CompletenessFix,
  DataCompletenessResult,
  DomainResult,
  TrainingCoverageDetail,
} from "@/types/data-completeness";

interface District {
  id: string;
  name: string;
}
interface FarmerGroup {
  id: string;
  name: string;
  code: string | null;
  districtId: string;
}
interface Props {
  districts: District[];
  initialFarmerGroups: FarmerGroup[];
  canExport: boolean;
}

const DOMAIN_ICONS: Record<CompletenessDomainKey, React.ComponentType<{ className?: string }>> = {
  profil: ClipboardCheck,
  petani: Users,
  lahan: Layers,
  pelatihan: GraduationCap,
  produksi: Sprout,
};

const SECTION_ID: Record<CompletenessDomainKey, string> = {
  profil: "seksi-profil",
  petani: "seksi-petani",
  lahan: "seksi-lahan",
  pelatihan: "seksi-pelatihan",
  produksi: "seksi-produksi",
};

const DOMAIN_ORDER: CompletenessDomainKey[] = ["profil", "petani", "lahan", "pelatihan", "produksi"];

const weightPct = (d: CompletenessDomainKey) => Math.round(DOMAIN_WEIGHTS[d] * 100);

// Rumus singkat per domain — tooltip badge skor di judul seksi (#352 B2, menutup 6h;
// semula di kartu domain strip skor yang dihapus pada putaran 4).
// Nama field diturunkan dari registri supaya tooltip tidak usang saat check bertambah.
const fieldName = (anomalyKey: string) => ANOMALY_CATALOG[anomalyKey]?.fix.field ?? anomalyKey;
const farmerFields = FARMER_FIELD_CHECKS.map((c) => fieldName(c.anomalyKey)).join(", ");
const parcelFields = PARCEL_CHECKS.map((c) => `${fieldName(c.anomalyKey)} ×${c.weight}`).join(", ");
const DOMAIN_FORMULA: Record<CompletenessDomainKey, string> = {
  profil: `${PROFILE_CHECKS.length} check profil terisi ÷ ${PROFILE_CHECKS.length}`,
  petani: `rata-rata per petani: check lolos ÷ ${FARMER_CHECK_COUNT} (NIK sahih & unik, ID Petani unik, ${farmerFields})`,
  lahan: `rata-rata per persil: Σ bobot atribut terisi ÷ ${PARCEL_CHECK_WEIGHT_TOTAL} (${parcelFields})`,
  pelatihan: "rata-rata per petani: paket wajib yang diikuti ÷ jumlah paket wajib",
  produksi: "petani yang punya ≥1 record produksi ÷ total petani",
};

// Jenis check (#352 putaran 2) — warna chip & urutan tampil.
const KIND_META: Record<CheckKind, { label: string; className: string; hint: string }> = {
  inti: { label: "Inti", className: "bg-primary/10 text-primary", hint: "Masuk skor domain (bobot penuh)" },
  lapangan: { label: "Lapangan", className: "bg-sky-500/10 text-sky-700 dark:text-sky-400", hint: "Masuk skor domain (bobot 1/3 — atribut lapangan)" },
  validitas: { label: "Validitas", className: "bg-violet-500/10 text-violet-700 dark:text-violet-400", hint: "Masuk skor domain (nilai harus sahih/unik)" },
  relasi: { label: "Relasi", className: "bg-slate-500/10 text-slate-700 dark:text-slate-300", hint: "Informatif — hubungan antar data (lahan, produksi), tidak mengubah skor; bisa dilipat sistemik" },
  kualitas: { label: "Kualitas", className: "bg-amber-500/10 text-amber-700 dark:text-amber-400", hint: "Informatif — konsistensi/plausibilitas, tidak mengubah skor" },
  modul: { label: "Modul", className: "bg-teal-500/10 text-teal-700 dark:text-teal-400", hint: "Informatif — cakupan modul tambahan, tidak mengubah skor" },
};
const KIND_ORDER: CheckKind[] = ["inti", "lapangan", "validitas", "relasi", "kualitas", "modul"];

const GRAIN_LABEL: Record<CheckRow["grain"], string> = {
  lembaga: "Lembaga",
  petani: "petani",
  persil: "persil",
  aktivitas: "aktivitas",
};

const bandLabel = (score: number) => BAND_LEGEND.find((s) => s.band === scoreBand(score))?.label ?? "";

/** Badge skor — warna satu sumber `scoreBand` (#352 B2, menutup 6c). */
function ScoreBadge({ score }: { score: number }) {
  const band = scoreBand(score);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums bg-muted/60",
        BAND_TEXT[band]
      )}
    >
      {score.toFixed(0)}%
    </span>
  );
}

export function DataCompletenessClient({ districts, initialFarmerGroups, canExport }: Props) {
  // Filter di query string (TD-021): `?lembaga=` = deep link dari Dashboard
  // Ketersediaan Data & kartu KPI Detail Lembaga; `?distrik=` opsional.
  const { get, setMany } = useUrlFilters();
  const districtParam = get("distrik");
  const selectedDistrict = districts.some((d) => d.id === districtParam) ? districtParam : null;
  const lembagaParam = get("lembaga");
  // Daftar awal = seluruh Lembaga dalam scope akses → id di luar daftar berarti
  // di luar akses atau tidak ada (pesan di bawah, tanpa memanggil action).
  const selectedFarmerGroup = initialFarmerGroups.some((g) => g.id === lembagaParam) ? lembagaParam : null;
  const outOfScope = !!lembagaParam && !selectedFarmerGroup;

  const visibleGroups = useMemo(
    () => (selectedDistrict ? initialFarmerGroups.filter((g) => g.districtId === selectedDistrict) : initialFarmerGroups),
    [initialFarmerGroups, selectedDistrict]
  );

  const [result, setResult] = useState<DataCompletenessResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  // Lembaga yang sedang dianalisa — respons yang datang untuk Lembaga lain
  // (pengguna berganti pilihan saat request berjalan) diabaikan (review #352).
  const analyzedFor = useRef<string | null>(null);

  const analyze = useCallback(
    (groupId: string, silent = false) => {
      startTransition(async () => {
        try {
          const data = await analyzeFarmerGroupCompleteness(groupId);
          if (analyzedFor.current !== groupId) return;
          setResult(data);
          // Default hanya seksi berskor terendah yang terbuka (menutup 6g).
          const scores: [CompletenessDomainKey, number][] = [
            ["profil", data.profileScore],
            ...data.domains.map((d) => [d.domain, d.score] as [CompletenessDomainKey, number]),
          ];
          const lowest = scores.reduce((m, s) => (s[1] < m[1] ? s : m), scores[0])[0];
          setOpenSections(Object.fromEntries(DOMAIN_ORDER.map((d) => [d, d === lowest])));
          if (!silent) toast.success("Analisis ketersediaan data berhasil dimuat");
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Gagal memuat analisis data");
        }
      });
    },
    [startTransition]
  );

  // Analisa otomatis (keputusan #352 P5): saat `?lembaga=` ada di URL awal dan
  // tiap kali Lembaga dipilih — tombol tinggal "Muat ulang". Hasil Lembaga
  // sebelumnya dikosongkan begitu pilihan berganti.
  useEffect(() => {
    if (!selectedFarmerGroup) {
      analyzedFor.current = null;
      setResult(null);
      return;
    }
    if (analyzedFor.current === selectedFarmerGroup) return;
    analyzedFor.current = selectedFarmerGroup;
    setResult(null);
    analyze(selectedFarmerGroup, true);
  }, [selectedFarmerGroup, analyze]);

  const handleDistrictSelect = (id: string | null) => {
    const keep = selectedFarmerGroup && (id == null || initialFarmerGroups.find((g) => g.id === selectedFarmerGroup)?.districtId === id);
    setMany({ distrik: id, ...(keep ? {} : { lembaga: null }) });
  };

  const handleDownload = async () => {
    if (!result) return;
    const { exportMultiSheetToExcel } = await import("@/lib/xlsx");
    const fixText = (fix: CompletenessFix) => (fix.field ? `${fix.menu} › ${fix.field}` : fix.menu);

    const ringkasanRows = [
      { metrik: "Lembaga Petani", nilai: `${result.group.name}${result.group.code ? ` (${result.group.code})` : ""}` },
      { metrik: "Distrik", nilai: result.group.districtName },
      { metrik: "Index Ketersediaan Data", nilai: `${result.healthScore}%` },
      { metrik: "Total Petani", nilai: result.totalFarmers },
      { metrik: "Total Temuan Anomali", nilai: result.totalAnomalies },
      { metrik: `Skor Profil Lembaga Petani (bobot ${weightPct("profil")}%)`, nilai: `${result.profileScore}%` },
      ...result.domains.map((d) => ({ metrik: `Skor ${d.label} (bobot ${weightPct(d.domain)}%)`, nilai: `${d.score}%` })),
      { metrik: "Periode acuan kebaruan produksi", nilai: result.referencePeriod },
    ];

    // Checklist lengkap — satu baris per check per domain (termasuk yang lolos).
    const checklistRows = [
      ...result.profileChecks.map((c) => ({
        domain: MODULE_DOMAIN_LABELS.profil,
        check: c.label,
        jenis: KIND_META[c.kind].label,
        bermasalah: c.complete ? 0 : 1,
        total: 1,
        pct: c.complete ? "100%" : "0%",
        fix: fixText(c.fix),
      })),
      // Modul tingkat Lembaga (boundary, acuan, Monev Lembaga, sertifikasi) — dari moduleCoverage domain profil.
      ...result.moduleCoverage
        .filter((m) => m.domain === "profil")
        .map((m) => ({
          domain: MODULE_DOMAIN_LABELS.profil,
          check: m.label,
          jenis: KIND_META.modul.label,
          bermasalah: m.total - m.covered,
          total: m.total,
          pct: m.pct == null ? "belum ada di Lembaga ini" : `${m.pct.toFixed(1)}%`,
          fix: fixText(m.fix),
        })),
      ...result.domains.flatMap((d) =>
        d.checks.map((c) => ({
          domain: d.label,
          check: c.label,
          jenis: KIND_META[c.kind].label + (c.systemic ? " · sistemik" : ""),
          bermasalah: c.flagged,
          total: c.total,
          pct: !c.applicable ? "belum ada di Lembaga ini" : c.total > 0 ? `${(((c.total - c.flagged) / c.total) * 100).toFixed(1)}%` : "—",
          fix: fixText(c.fix),
        }))
      ),
    ];

    const domainSheets = result.domains.map((d) => ({
      name: d.label.slice(0, 31),
      columns: [
        { header: "Anomali", key: "anomali" },
        { header: "Jenis", key: "jenis" },
        { header: "ID Petani", key: "farmerId" },
        { header: "Nama Petani", key: "farmerName" },
        { header: "Detail", key: "detail" },
        { header: "Perbaiki lewat", key: "fix" },
      ],
      data: [
        ...d.anomalies.flatMap((a) =>
          a.items.length > 0
            ? a.items.map((it) => ({
                anomali: a.systemic ? `${a.label} (sistemik: ${a.entityCount}/${a.total})` : a.label,
                jenis: KIND_META[a.kind].label,
                farmerId: it.farmerId,
                farmerName: it.farmerName,
                detail: it.detail ?? "",
                fix: fixText(a.fix),
              }))
            : [{ anomali: a.label, jenis: KIND_META[a.kind].label, farmerId: "", farmerName: "", detail: `${a.count} temuan`, fix: fixText(a.fix) }]
        ),
        // Daftar kerja modul (entitas yang belum mengisi modul) ikut sheet domainnya.
        ...result.moduleCoverage
          .filter((m) => m.domain === d.domain && m.missing.length > 0)
          .flatMap((m) =>
            m.missing.map((it) => ({
              anomali: `Belum ${m.label}`,
              jenis: KIND_META.modul.label,
              farmerId: it.farmerId,
              farmerName: it.farmerName,
              detail: it.detail ?? "",
              fix: fixText(m.fix),
            }))
          ),
      ],
    }));

    // Sheet tambahan untuk cakupan pelatihan per paket (DA-02b).
    const training = result.domains.find((d) => d.domain === "pelatihan")?.training;
    const trainingSheets = training
      ? [
          {
            name: "Matriks Pelatihan",
            columns: [
              { header: "ID Petani", key: "farmerId" },
              { header: "Nama Petani", key: "farmerName" },
              ...training.packages.map((p) => ({ header: p.label, key: p.code })),
            ],
            data: training.matrix.map((row) => ({
              farmerId: row.farmerId,
              farmerName: row.farmerName,
              ...Object.fromEntries(row.cells.map((c) => [c.code, c.done ? "Ya" : "Belum"])),
            })),
          },
          {
            name: "Petani Belum Lengkap",
            columns: [
              { header: "ID Petani", key: "farmerId" },
              { header: "Nama Petani", key: "farmerName" },
              { header: "Cakupan", key: "coverage" },
              { header: "Paket yang Masih Kurang", key: "missing" },
            ],
            data: training.incompleteFarmers.map((f) => ({
              farmerId: f.farmerId,
              farmerName: f.farmerName,
              coverage: `${f.doneCount}/${f.total} (${f.coveragePct}%)`,
              missing: f.missing.join(", "),
            })),
          },
        ]
      : [];

    await exportMultiSheetToExcel({
      filename: `analisa-ketersediaan-${result.group.code || result.group.name}-${format(new Date(), "yyyyMMdd")}`,
      sheets: [
        { name: "Ringkasan", columns: [{ header: "Metrik", key: "metrik" }, { header: "Nilai", key: "nilai" }], data: ringkasanRows },
        {
          name: "Prioritas",
          columns: [
            { header: "Domain", key: "domain" },
            { header: "Tindakan", key: "label" },
            { header: "Bermasalah", key: "flagged" },
            { header: "Total", key: "total" },
            { header: "Δ Index (poin)", key: "gain" },
            { header: "Perbaiki lewat", key: "fix" },
          ],
          data: result.priorities.map((p) => ({
            domain: MODULE_DOMAIN_LABELS[p.domain],
            label: p.label,
            flagged: p.flagged,
            total: p.total,
            gain: p.indexGain,
            fix: fixText(p.fix),
          })),
        },
        {
          name: "Checklist",
          columns: [
            { header: "Domain", key: "domain" },
            { header: "Check", key: "check" },
            { header: "Jenis", key: "jenis" },
            { header: "Bermasalah", key: "bermasalah" },
            { header: "Total", key: "total" },
            { header: "% OK", key: "pct" },
            { header: "Perbaiki lewat", key: "fix" },
          ],
          data: checklistRows,
        },
        {
          name: "Per Kelompok Tani",
          columns: [
            { header: "Kelompok Tani", key: "name" },
            { header: "Petani", key: "farmers" },
            { header: "Persil", key: "parcels" },
            { header: "Luas (ha)", key: "areaHa" },
            { header: "Skor Lahan", key: "lahanScore" },
            { header: "Skor Petani", key: "petaniScore" },
            { header: "Persil Berproduksi", key: "parcelsProducing" },
            { header: "% Berproduksi", key: "parcelsProducingPct" },
          ],
          data: result.byKelompokTani,
        },
        ...domainSheets,
        ...trainingSheets,
      ],
    });
  };

  const setSection = (key: CompletenessDomainKey, open: boolean) =>
    setOpenSections((prev) => ({ ...prev, [key]: open }));
  const setAll = (open: boolean) => setOpenSections(Object.fromEntries(DOMAIN_ORDER.map((d) => [d, open])));

  // Strip skor / prioritas → buka seksi + gulir ke sana.
  const jumpTo = (key: CompletenessDomainKey) => {
    setSection(key, true);
    requestAnimationFrame(() => {
      document.getElementById(SECTION_ID[key])?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const domainScore = (d: CompletenessDomainKey) =>
    d === "profil" ? result!.profileScore : result!.domains.find((x) => x.domain === d)!.score;

  return (
    <div className="space-y-6">
      {/* Filter Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Distrik</span>
              <FilterCombobox
                options={districts}
                value={selectedDistrict}
                onSelect={handleDistrictSelect}
                allLabel="Semua Distrik"
                searchPlaceholder="Cari distrik..."
                emptyLabel="Distrik tidak ditemukan."
                widthClass="w-full sm:w-[200px]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lembaga Petani</span>
              <FilterCombobox
                options={visibleGroups}
                value={selectedFarmerGroup}
                onSelect={(id) => setMany({ lembaga: id })}
                placeholder="Pilih Lembaga Petani"
                searchPlaceholder="Cari lembaga petani..."
                emptyLabel="Lembaga Petani tidak ditemukan."
                widthClass="w-full sm:w-[260px]"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => selectedFarmerGroup && analyze(selectedFarmerGroup)}
              disabled={isPending || !selectedFarmerGroup}
              className="h-9"
            >
              <RefreshCw className={cn("mr-2 h-4 w-4", isPending && "animate-spin")} />
              {isPending ? "Menganalisa..." : "Muat ulang"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {outOfScope ? (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex items-center gap-2 py-4 text-sm text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Lembaga Petani pada tautan ini tidak ditemukan atau di luar akses Anda. Pilih Lembaga lain dari daftar.
          </CardContent>
        </Card>
      ) : !result ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
          <ClipboardCheck className={cn("h-12 w-12 text-muted-foreground opacity-40 mb-4", isPending && "animate-pulse")} />
          <p className="text-muted-foreground font-medium">
            {isPending ? "Menganalisa Lembaga Petani…" : "Pilih Lembaga Petani — analisa berjalan otomatis"}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Overview: gauge + identitas + strip domain */}
          <Card>
            <CardContent className="pt-6">
              {/* Urutan baca (owner): identitas Lembaga di kiri → instrumen (angka Index +
                  radar) → aksi Excel di ujung — konsisten dengan kartu radar Semua Lembaga
                  (nama kiri, skor kanan). */}
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:gap-6">
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-bold leading-tight">
                    {result.group.name}
                    {result.group.code && <span className="ml-2 font-mono text-sm font-normal text-muted-foreground">{result.group.code}</span>}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {result.group.districtName} · {formatNumber(result.totalFarmers)} petani ·{" "}
                    <span className="font-medium text-red-600 dark:text-red-400">{formatNumber(result.totalAnomalies)} temuan</span>
                  </p>
                  <p className="mt-3 max-w-xl text-xs leading-relaxed text-muted-foreground">
                    Angka besar = Index (0–100); pentagon = skor lima domain — klik nama sumbu untuk membuka seksinya. Bobot tiap domain ada di judul seksi.
                  </p>
                </div>

                {/* Instrumen: angka Index besar (label band di bawahnya) + pentagon lima domain
                    berangka — satu sumber untuk skor (#352 putaran 4: tanpa cincin gauge, tanpa
                    kartu domain). Label sumbu = tautan ke seksi domain; bobot ada di tooltip &
                    judul seksi. Proporsi: strip pendek (radar 260 px), angka sebesar tinggi radar. */}
                <Tooltip>
                  <TooltipTrigger render={<div className="flex shrink-0 items-center gap-5 self-center md:border-l md:pl-6" />}>
                    <div className="flex cursor-help flex-col items-center gap-1.5">
                      <span className={cn("text-7xl font-bold leading-none tabular-nums", BAND_TEXT[scoreBand(result.healthScore)])}>
                        {Math.round(result.healthScore)}
                      </span>
                      <span className={cn("whitespace-nowrap text-[11px] font-semibold", BAND_TEXT[scoreBand(result.healthScore)])}>{bandLabel(result.healthScore)}</span>
                    </div>
                    <RadarChart
                      name={result.group.name}
                      total={result.healthScore}
                      scores={Object.fromEntries(DOMAIN_ORDER.map((d) => [d, domainScore(d)])) as Record<CompletenessDomainKey, number>}
                      onAxisClick={jumpTo}
                      className="w-[260px]"
                    />
                  </TooltipTrigger>
                  <StatTooltipContent title="Index = Σ (skor domain × bobot)" footer={`Band: ${bandLabel(result.healthScore)} · klik nama sumbu untuk membuka seksinya`}>
                    {DOMAIN_ORDER.map((d) => (
                      <StatTooltipRow
                        key={d}
                        chip={BAND_BAR[scoreBand(domainScore(d))]}
                        label={`${MODULE_DOMAIN_LABELS[d]} × ${weightPct(d)}%`}
                        value={`${domainScore(d).toFixed(1)}%`}
                      />
                    ))}
                  </StatTooltipContent>
                </Tooltip>

                {canExport && (
                  <Button variant="outline" onClick={handleDownload} className="h-9 shrink-0 self-start md:self-center">
                    <Download className="mr-2 h-4 w-4" />
                    Excel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Zero-farmer notice */}
          {result.totalFarmers === 0 && (
            <Card className="border-amber-500/40 bg-amber-500/5">
              <CardContent className="flex items-center gap-2 py-4 text-sm text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Lembaga Petani ini belum memiliki data petani aktif — domain Petani, Lahan, Pelatihan, dan Produksi kosong.
              </CardContent>
            </Card>
          )}

          {/* Prioritas perbaikan (#352 putaran 2) */}
          <PriorityPanel result={result} onJump={jumpTo} />

          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setAll(true)}>
              Buka semua
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setAll(false)}>
              Tutup semua
            </Button>
          </div>

          {/* Section 1: Profil KT */}
          <ProfileSection result={result} open={!!openSections.profil} onOpenChange={(o) => setSection("profil", o)} />

          {/* Sections 2-5: domains (Pelatihan pakai tampilan cakupan per paket) */}
          {result.domains.map((d) =>
            d.domain === "pelatihan" && d.training ? (
              <TrainingSection key={d.domain} domain={d} result={result} open={!!openSections[d.domain]} onOpenChange={(o) => setSection(d.domain, o)} />
            ) : (
              <DomainSection key={d.domain} domain={d} result={result} open={!!openSections[d.domain]} onOpenChange={(o) => setSection(d.domain, o)} />
            )
          )}
        </div>
      )}
    </div>
  );
}

// ── Prioritas perbaikan ──

function PriorityPanel({ result, onJump }: { result: DataCompletenessResult; onJump: (d: CompletenessDomainKey) => void }) {
  const items = result.priorities.slice(0, 6);
  if (items.length === 0) {
    const perfect = result.healthScore === 100;
    return (
      <Card className={cn(perfect ? "border-emerald-500/40 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/5")}>
        <CardContent className={cn("flex items-center gap-2 py-4 text-sm", perfect ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400")}>
          {perfect ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
          {perfect
            ? "Semua check berskor sudah lengkap — Index 100. Sisa temuan (bila ada) bersifat kualitas/modul."
            : "Tidak ada tindakan per entitas yang bisa diusulkan — domain berskor 0 karena belum ada petani/persil untuk dinilai. Daftarkan petani & lahannya dulu."}
        </CardContent>
      </Card>
    );
  }
  const maxGain = Math.max(items[0].indexGain, 0.1);
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">Prioritas perbaikan</h3>
          <span className="text-xs text-muted-foreground">— tindakan yang paling menaikkan Index bila dilengkapi 100 %</span>
        </div>
        <ol className="grid gap-2 md:grid-cols-2">
          {items.map((p, idx) => {
            const Icon = DOMAIN_ICONS[p.domain];
            return (
              <li key={p.key} className="flex items-start gap-3 rounded-lg border px-3 py-2.5">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <button type="button" onClick={() => onJump(p.domain)} className="min-w-0 text-left text-sm font-medium hover:underline">
                      {p.label}
                    </button>
                    <span className="shrink-0 text-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                      +{p.indexGain.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} poin
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(p.indexGain / maxGain) * 100}%` }} />
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Icon className="h-3 w-3" />
                      {MODULE_DOMAIN_LABELS[p.domain]}
                    </span>
                    <span>·</span>
                    <span className="tabular-nums">
                      {formatNumber(p.flagged)} / {formatNumber(p.total)}
                    </span>
                    <span>·</span>
                    {p.fix.href ? (
                      <Link href={p.fix.href} className="text-primary hover:underline">
                        {p.fix.field ? `${p.fix.menu} › ${p.fix.field}` : p.fix.menu}
                      </Link>
                    ) : (
                      <span>{p.fix.menu}</span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}

// ── Seksi ──

function SectionShell({
  id,
  title,
  icon: Icon,
  score,
  anomalyCount,
  open,
  onOpenChange,
  summary,
  weightPct,
  formula,
  children,
}: {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  score: number;
  anomalyCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary?: React.ReactNode;
  /** Bobot domain terhadap Index (%) — tampil di judul sejak kartu domain di strip dihapus (#352 putaran 4). */
  weightPct: number;
  /** Rumus skor domain — tooltip badge skor (semula tooltip kartu domain). */
  formula: string;
  children: React.ReactNode;
}) {
  return (
    <Card id={id} className="scroll-mt-4">
      <Collapsible open={open} onOpenChange={onOpenChange}>
        <CollapsibleTrigger
          render={
            <button className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left">
              <span className="min-w-0">
                <span className="flex items-center gap-2 font-semibold">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  {title}
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground" title="Bobot domain ini terhadap Index">
                    bobot {weightPct} % Index
                  </span>
                </span>
                {summary && <span className="mt-0.5 block text-xs text-muted-foreground">{summary}</span>}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                {anomalyCount > 0 ? (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {formatNumber(anomalyCount)} temuan
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Lengkap
                  </Badge>
                )}
                <Tooltip>
                  <TooltipTrigger render={<span className="cursor-help" />}>
                    <ScoreBadge score={score} />
                  </TooltipTrigger>
                  <StatTooltipContent title={`${title} · bobot ${weightPct} % dari Index`} subtitle={formula} footer={`Band: ${bandLabel(score)}`}>
                    <StatTooltipRow chip={BAND_BAR[scoreBand(score)]} label="Skor domain" value={`${score.toFixed(1)}%`} />
                  </StatTooltipContent>
                </Tooltip>
                <ChevronDown className={cn("h-4 w-4 transition-transform", open ? "rotate-180" : "")} />
              </span>
            </button>
          }
        />
        <CollapsibleContent>
          <div className="border-t px-6 py-4">{children}</div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

/** Baris "Perbaiki lewat" — menu + kolom dari registri, tautan bila ada (menutup 6e). */
function FixHint({ fix }: { fix: CompletenessFix }) {
  const text = fix.field ? `${fix.menu} › ${fix.field}` : fix.menu;
  return (
    <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
      <Wrench className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>
        Perbaiki lewat:{" "}
        {fix.href ? (
          <Link href={fix.href} className="font-medium text-primary hover:underline">
            {text}
          </Link>
        ) : (
          <span className="font-medium">{text}</span>
        )}
      </span>
    </p>
  );
}

function KindChip({ kind }: { kind: CheckKind }) {
  const m = KIND_META[kind];
  return (
    <span title={m.hint} className={cn("inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide", m.className)}>
      {m.label}
    </span>
  );
}

/** Legenda jenis check — sekali per seksi. */
function KindLegend({ kinds }: { kinds: CheckKind[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
      {kinds.map((k) => (
        <span key={k} className="inline-flex items-center gap-1">
          <KindChip kind={k} /> {KIND_META[k].hint}
        </span>
      ))}
    </div>
  );
}

const INITIAL_ANOMALY_ROWS = 50;

// Bounded render: only mount the first N rows until the user opts to expand,
// keeping the DOM light for farmer groups with thousands of flagged rows.
// Full data is always available via the section's Excel export.
// Daftar kerja (#352 B2, menutup 6d): nama → Detail Petani, ID Lahan → Detail Lahan.
function AnomalyItemsTable({ items }: { items: AnomalyItem[] }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? items : items.slice(0, INITIAL_ANOMALY_ROWS);
  const hasMore = items.length > INITIAL_ANOMALY_ROWS;
  const hasParcel = items.some((it) => it.parcelDbId);

  return (
    <div className="rounded-md border">
      <div className="max-h-72 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted/70">
            <tr className="border-b-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-2">ID Petani</th>
              <th className="px-3 py-2">Nama Petani</th>
              <th className="px-3 py-2">{hasParcel ? "ID Lahan · Detail" : "Detail"}</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((it, idx) => (
              <tr key={`${it.farmerDbId}-${it.parcelDbId ?? it.detail ?? ""}-${idx}`} className="border-b last:border-0">
                <td className="px-3 py-1.5 font-mono text-muted-foreground">{it.farmerId}</td>
                <td className="px-3 py-1.5 font-medium">
                  <Link href={`/admin/master-data/farmers/${it.farmerDbId}`} className="hover:underline">
                    {it.farmerName}
                  </Link>
                </td>
                {/* Detail NIK-like di-sensor di layar (Excel export tetap penuh). */}
                <td className="px-3 py-1.5 text-muted-foreground">
                  {it.parcelDbId ? (
                    <Link
                      href={`/admin/master-data/parcels/${it.parcelDbId}`}
                      className="inline-flex items-center gap-1 font-mono text-primary hover:underline"
                    >
                      {it.detail}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  ) : (
                    maskIfNik(it.detail)
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hasMore && (
        <div className="flex items-center justify-between border-t bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <span>Menampilkan {visible.length} dari {formatNumber(items.length)} baris</span>
          <Button variant="ghost" size="sm" className="h-7" onClick={() => setShowAll((v) => !v)}>
            {showAll ? "Ringkas" : `Tampilkan semua (${formatNumber(items.length)})`}
          </Button>
        </div>
      )}
    </div>
  );
}

/** Daftar kerja untuk satu baris checklist: dari anomali (inti/validitas/kualitas) atau modul (`missing`). */
function itemsForRow(row: CheckRow, domain: DomainResult | null, result: DataCompletenessResult): AnomalyItem[] {
  if (row.kind === "modul") return result.moduleCoverage.find((m) => m.key === row.key)?.missing ?? [];
  return domain?.anomalies.find((a) => a.key === row.key)?.items ?? [];
}

/**
 * Satu baris checklist (#352 putaran 2): chip jenis · label · bar % OK · n/total · chevron.
 * Terbuka → Perbaiki lewat + tabel daftar kerja; sistemik → penjelasan agregat.
 */
function CheckRowItem({ row, items, defaultOpen = false }: { row: CheckRow; items: AnomalyItem[]; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const okPct = row.total > 0 ? ((row.total - row.flagged) / row.total) * 100 : null;
  const expandable = row.flagged > 0 && (items.length > 0 || row.systemic);
  const inactive = !row.applicable;

  const status = inactive ? (
    <span className="text-xs italic text-muted-foreground">belum ada di Lembaga ini</span>
  ) : row.total === 0 ? (
    <span className="text-xs italic text-muted-foreground">tidak ada yang bisa dicek</span>
  ) : row.flagged === 0 ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
      <CheckCircle2 className="h-3.5 w-3.5" /> lengkap
    </span>
  ) : (
    <span className="text-xs tabular-nums">
      <span className="font-semibold text-red-600 dark:text-red-400">{formatNumber(row.flagged)}</span>
      <span className="text-muted-foreground"> / {formatNumber(row.total)} {GRAIN_LABEL[row.grain]}</span>
    </span>
  );

  return (
    <div className={cn("rounded-lg border", row.systemic && "border-amber-500/40 bg-amber-500/5", inactive && "border-dashed bg-muted/20")}>
      <button
        type="button"
        onClick={() => expandable && setOpen((v) => !v)}
        className={cn("flex w-full items-center gap-3 px-3 py-2 text-left", expandable ? "cursor-pointer hover:bg-muted/40" : "cursor-default")}
        aria-expanded={expandable ? open : undefined}
      >
        <span className="flex w-full min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <KindChip kind={row.kind} />
            <span className={cn("truncate text-sm", inactive && "text-muted-foreground")}>{row.label}</span>
            {row.systemic && (
              <Badge variant="outline" className="shrink-0 border-amber-500/50 text-[10px] text-amber-700 dark:text-amber-400">
                sistemik
              </Badge>
            )}
            {row.weightLabel && (
              <span className="shrink-0 rounded bg-muted px-1 text-[10px] tabular-nums text-muted-foreground" title="Bobot dalam skor domain">
                bobot {row.weightLabel}
              </span>
            )}
          </span>
          <span className="flex items-center gap-3 sm:w-[300px] sm:shrink-0">
            <span className="w-28 shrink-0 sm:w-32">
              <BandBar pct={okPct ?? 0} inactive={inactive || okPct == null} />
            </span>
            <span className="min-w-0 flex-1">{status}</span>
            {expandable ? (
              <ChevronRight className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")} />
            ) : (
              <span className="h-4 w-4 shrink-0" />
            )}
          </span>
        </span>
      </button>
      {expandable && open && (
        <div className="space-y-3 border-t px-3 py-3">
          {row.systemic && (
            <p className="text-sm text-muted-foreground">
              Kolom ini praktis belum pernah diisi di Lembaga ini (≥ {SYSTEMIC_THRESHOLD * 100} % {GRAIN_LABEL[row.grain]} kosong) — bukan anomali yang
              dikejar per {GRAIN_LABEL[row.grain]}, melainkan alur pengisian yang belum berjalan. Dihitung sebagai satu temuan; daftar lengkap
              tetap ada di Excel.
            </p>
          )}
          <FixHint fix={row.fix} />
          {items.length > 0 ? <AnomalyItemsTable items={items} /> : <p className="text-sm text-muted-foreground">Tidak ada rincian entitas.</p>}
        </div>
      )}
    </div>
  );
}

/** Checklist satu domain, dikelompokkan per jenis (berskor dulu, lalu kualitas & modul). */
function Checklist({ rows, domain, result }: { rows: CheckRow[]; domain: DomainResult | null; result: DataCompletenessResult }) {
  const groups = KIND_ORDER.map((kind) => ({ kind, rows: rows.filter((r) => r.kind === kind) })).filter((g) => g.rows.length > 0);
  const kindsPresent = groups.map((g) => g.kind);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <ListChecks className="h-4 w-4 text-muted-foreground" /> Checklist
          <span className="text-xs font-normal text-muted-foreground">
            {rows.filter((r) => r.applicable && r.total > 0 && r.flagged === 0).length} lengkap ·{" "}
            {rows.filter((r) => r.applicable && r.flagged > 0).length} bermasalah ·{" "}
            {rows.filter((r) => !r.applicable).length} belum berlaku
          </span>
        </h4>
        <KindLegend kinds={kindsPresent} />
      </div>
      {groups.map((g) => (
        <div key={g.kind} className="space-y-1.5">
          {g.rows.map((row) => (
            <CheckRowItem key={row.key} row={row} items={itemsForRow(row, domain, result)} />
          ))}
        </div>
      ))}
    </div>
  );
}

function SummaryCards({ cards }: { cards: DomainResult["cards"] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <div key={card.label} className="rounded-lg border bg-muted/30 p-3">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{card.label}</div>
          <div className="text-lg font-bold tabular-nums">{typeof card.value === "number" ? formatNumber(card.value) : card.value}</div>
        </div>
      ))}
    </div>
  );
}

function ProfileSection({
  result,
  open,
  onOpenChange,
}: {
  result: DataCompletenessResult;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const failed = result.profileChecks.filter((c) => !c.complete).length;
  const rows: CheckRow[] = [
    ...result.profileChecks.map((c) => ({
      key: c.key,
      label: c.label,
      kind: c.kind,
      grain: "lembaga" as const,
      flagged: c.complete ? 0 : 1,
      total: 1,
      weight: c.kind === "inti" ? 1 / PROFILE_CHECKS.length : undefined,
      weightLabel: c.kind === "inti" ? `1/${PROFILE_CHECKS.length}` : undefined,
      systemic: false,
      applicable: true,
      fix: c.fix,
    })),
    ...result.moduleCoverage
      .filter((m) => m.domain === "profil")
      .map((m) => ({
        key: m.key,
        label: m.label,
        kind: "modul" as const,
        grain: m.grain,
        flagged: m.total - m.covered,
        total: m.total,
        systemic: false,
        applicable: m.applicable,
        fix: m.fix,
      })),
  ];
  const valueOf = new Map(result.profileChecks.map((c) => [c.key, c.value]));
  return (
    <SectionShell
      id={SECTION_ID.profil}
      title="Profil Lembaga Petani"
      icon={ClipboardCheck}
      score={result.profileScore}
      anomalyCount={failed}
      open={open}
      onOpenChange={onOpenChange}
      weightPct={weightPct("profil")}
      formula={DOMAIN_FORMULA.profil}
      summary={`${PROFILE_CHECKS.length} check inti · ${result.profileChecks.length - PROFILE_CHECKS.length} check kualitas · ${rows.filter((r) => r.kind === "modul").length} modul`}
    >
      <div className="space-y-3">
        <KindLegend kinds={[...new Set(rows.map((r) => r.kind))]} />
        <div className="space-y-1.5">
          {rows.map((row) => {
            const value = valueOf.get(row.key);
            const ok = row.flagged === 0;
            return (
              <div key={row.key} className={cn("flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg border px-3 py-2 text-sm", !row.applicable && "border-dashed bg-muted/20")}>
                <span className="flex min-w-0 items-center gap-2">
                  {row.kind === "modul" ? (
                    row.applicable && ok ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <X className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )
                  ) : ok ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  )}
                  <KindChip kind={row.kind} />
                  <span className="truncate">{row.label}</span>
                  {!ok && row.kind !== "modul" && (
                    <span className="text-xs text-muted-foreground">
                      · isi {row.fix.field ? `kolom ${row.fix.field} ` : ""}di{" "}
                      <Link href={`/admin/master-data/groups/${result.group.id}`} className="text-primary hover:underline">
                        Detail Lembaga › Edit
                      </Link>
                    </span>
                  )}
                  {!ok && row.kind === "modul" && (
                    <span className="text-xs text-muted-foreground">
                      ·{" "}
                      {row.fix.href ? (
                        <Link href={row.fix.href} className="text-primary hover:underline">
                          {row.fix.menu}
                        </Link>
                      ) : (
                        row.fix.menu
                      )}
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-2">
                  {value && <span className="max-w-[260px] truncate font-mono text-xs text-muted-foreground">{value}</span>}
                  <Badge variant={ok ? "secondary" : row.kind === "inti" ? "destructive" : "outline"}>
                    {row.kind === "modul" ? (ok ? "ada" : "tidak ada") : ok ? "Lengkap" : "Belum"}
                  </Badge>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </SectionShell>
  );
}

function DomainSection({
  domain,
  result,
  open,
  onOpenChange,
}: {
  domain: DomainResult;
  result: DataCompletenessResult;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const Icon = DOMAIN_ICONS[domain.domain];
  const scored = domain.checks.filter((c) => c.weight != null);
  const others = domain.checks.filter((c) => c.weight == null);
  return (
    <SectionShell
      id={SECTION_ID[domain.domain]}
      title={domain.label}
      icon={Icon}
      score={domain.score}
      anomalyCount={domain.totalAnomalies}
      open={open}
      onOpenChange={onOpenChange}
      weightPct={weightPct(domain.domain)}
      formula={DOMAIN_FORMULA[domain.domain]}
      summary={`${scored.length} check berskor · ${others.filter((c) => c.kind === "kualitas").length} check kualitas · ${others.filter((c) => c.kind === "modul").length} modul`}
    >
      <div className="space-y-5">
        <SummaryCards cards={domain.cards} />
        <Checklist rows={domain.checks} domain={domain} result={result} />
        {domain.domain === "lahan" && <KelompokTaniPanel rows={result.byKelompokTani} />}
      </div>
    </SectionShell>
  );
}

/** Rincian per Kelompok Tani (#352 putaran 2) — KT mana yang paling tertinggal. */
function KelompokTaniPanel({ rows }: { rows: DataCompletenessResult["byKelompokTani"] }) {
  const [open, setOpen] = useState(rows.length > 1);
  if (rows.length === 0) return null;
  return (
    <div className="rounded-lg border">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger
          render={
            <button className="flex w-full items-center justify-between gap-3 rounded-lg bg-muted/40 px-4 py-2.5 text-left">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Network className="h-4 w-4 text-muted-foreground" /> Per Kelompok Tani
                <span className="text-xs font-normal text-muted-foreground">{rows.length} KT · urut skor lahan terendah</span>
              </span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", open ? "rotate-180" : "")} />
            </button>
          }
        />
        <CollapsibleContent>
          <div className="overflow-x-auto border-t">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2">Kelompok Tani</th>
                  <th className="px-3 py-2 text-right">Petani</th>
                  <th className="px-3 py-2 text-right">Persil</th>
                  <th className="px-3 py-2 text-right">Luas (ha)</th>
                  <th className="px-3 py-2">Skor Lahan</th>
                  <th className="px-3 py-2">Skor Petani</th>
                  <th className="px-3 py-2">Persil Berproduksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.name} className="border-t">
                    <td className={cn("px-3 py-1.5 font-medium", r.name.startsWith("(") && "italic text-muted-foreground")}>{r.name}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{formatNumber(r.farmers)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{formatNumber(r.parcels)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{r.areaHa.toLocaleString("id-ID", { maximumFractionDigits: 1 })}</td>
                    <td className="px-3 py-1.5">
                      <span className="flex items-center gap-2">
                        <span className="w-20">
                          <BandBar pct={r.lahanScore} className="h-1.5" />
                        </span>
                        <span className={cn("text-xs font-semibold tabular-nums", BAND_TEXT[scoreBand(r.lahanScore)])}>{r.lahanScore.toFixed(0)}%</span>
                      </span>
                    </td>
                    <td className="px-3 py-1.5">
                      <span className="flex items-center gap-2">
                        <span className="w-20">
                          <BandBar pct={r.petaniScore} className="h-1.5" />
                        </span>
                        <span className={cn("text-xs font-semibold tabular-nums", BAND_TEXT[scoreBand(r.petaniScore)])}>{r.petaniScore.toFixed(0)}%</span>
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-xs tabular-nums">
                      {formatNumber(r.parcelsProducing)} / {formatNumber(r.parcels)}{" "}
                      <span className="text-muted-foreground">({r.parcelsProducingPct.toFixed(0)}%)</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// ── DA-02b: Domain Pelatihan dengan cakupan per paket (nested collapse per analisa) ──

// Sub-section collapsible di dalam Domain Pelatihan (4a/4b/4c).
function SubCollapsible({
  title,
  badge,
  defaultOpen,
  children,
}: {
  title: string;
  badge?: React.ReactNode;
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger
          render={
            <button className="flex w-full items-center justify-between gap-3 rounded-lg bg-muted/40 px-4 py-2.5 text-left">
              <span className="text-sm font-semibold">{title}</span>
              <span className="flex items-center gap-2">
                {badge}
                <ChevronDown className={cn("h-4 w-4 transition-transform", open ? "rotate-180" : "")} />
              </span>
            </button>
          }
        />
        <CollapsibleContent>
          <div className="border-t p-4">{children}</div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function TrainingSection({
  domain,
  result,
  open,
  onOpenChange,
}: {
  domain: DomainResult;
  result: DataCompletenessResult;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const t = domain.training!;
  const noActivityPackages = t.packageCoverage.filter((p) => !p.hasActivity);
  // Baris paket sudah tergambar di "Ringkasan per Paket" — checklist memuat sisanya.
  const rows = domain.checks.filter((c) => !c.key.startsWith(PACKAGE_ANOMALY_PREFIX));
  const noActivity = domain.anomalies.find((a) => a.key === "kt-tanpa-aktivitas");
  return (
    <SectionShell
      id={SECTION_ID.pelatihan}
      title={domain.label}
      icon={GraduationCap}
      score={domain.score}
      anomalyCount={domain.totalAnomalies}
      open={open}
      onOpenChange={onOpenChange}
      weightPct={weightPct("pelatihan")}
      formula={DOMAIN_FORMULA.pelatihan}
      summary={`${t.packages.length} paket wajib · ${rows.filter((c) => c.kind === "kualitas").length} check kualitas · ${rows.filter((c) => c.kind === "modul").length} modul`}
    >
      <div className="space-y-5">
        <SummaryCards cards={domain.cards} />

        {/* Banner: paket tanpa aktivitas di KT */}
        {(noActivityPackages.length > 0 || noActivity) && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {noActivity
                ? "Lembaga ini belum memiliki aktivitas pelatihan sama sekali."
                : `Belum ada aktivitas pelatihan di Lembaga ini untuk paket: ${noActivityPackages.map((p) => p.label).join(", ")}.`}
            </span>
          </div>
        )}

        {t.packages.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            Belum ada paket pelatihan wajib terdaftar.
          </p>
        ) : (
          <div className="space-y-3">
            {/* 4a — Ringkasan per Paket */}
            <SubCollapsible title="Ringkasan per Paket" defaultOpen>
              <div className="grid gap-3 sm:grid-cols-2">
                {t.packageCoverage.map((p) => (
                  <PackageCoverageCard key={p.code} pkg={p} />
                ))}
              </div>
            </SubCollapsible>

            {/* 4b — Matriks Cakupan */}
            <SubCollapsible
              title="Matriks Cakupan"
              defaultOpen={false}
              badge={<Badge variant="secondary">{formatNumber(t.matrix.length)} petani</Badge>}
            >
              <CoverageMatrix training={t} />
            </SubCollapsible>

            {/* 4c — Petani Belum Lengkap */}
            <SubCollapsible
              title="Petani Belum Lengkap"
              defaultOpen={t.incompleteCount > 0}
              badge={
                t.incompleteCount > 0 ? (
                  <Badge variant="destructive">{formatNumber(t.incompleteCount)}</Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Lengkap
                  </Badge>
                )
              }
            >
              <IncompleteFarmersTable training={t} />
            </SubCollapsible>
          </div>
        )}

        <Checklist rows={rows} domain={domain} result={result} />
      </div>
    </SectionShell>
  );
}

function PackageCoverageCard({ pkg }: { pkg: TrainingCoverageDetail["packageCoverage"][number] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger
          render={
            <button className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{pkg.label}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formatNumber(pkg.covered)}/{formatNumber(pkg.totalFarmers)} sudah ikut · {formatNumber(pkg.notCovered)} belum
                </span>
                <BandBar pct={pkg.coveragePct} className="mt-1.5 h-1.5" />
              </span>
              <span className="flex items-center gap-2">
                <ScoreBadge score={pkg.coveragePct} />
                {pkg.notCovered > 0 && (
                  <ChevronDown className={cn("h-4 w-4 transition-transform", open ? "rotate-180" : "")} />
                )}
              </span>
            </button>
          }
        />
        {pkg.notCovered > 0 && (
          <CollapsibleContent>
            <div className="border-t px-3 py-2">
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Petani belum ikut paket ini</p>
              <AnomalyItemsTable items={pkg.notCoveredFarmers} />
            </div>
          </CollapsibleContent>
        )}
      </Collapsible>
    </div>
  );
}

const INITIAL_MATRIX_ROWS = 50;

function CoverageMatrix({ training }: { training: TrainingCoverageDetail }) {
  const [showAll, setShowAll] = useState(false);
  const rows = showAll ? training.matrix : training.matrix.slice(0, INITIAL_MATRIX_ROWS);
  const hasMore = training.matrix.length > INITIAL_MATRIX_ROWS;

  if (training.matrix.length === 0) {
    return <p className="text-sm text-muted-foreground">Belum ada petani aktif.</p>;
  }

  return (
    <div className="rounded-md border">
      <div className="max-h-96 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-muted/70">
            <tr className="border-b-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="sticky left-0 z-10 bg-muted/70 px-3 py-2">Petani</th>
              {training.packages.map((p) => (
                <th key={p.code} className="px-3 py-2 text-center" title={p.label}>
                  {p.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.farmerDbId} className="border-b last:border-0">
                <td className="sticky left-0 bg-background px-3 py-1.5">
                  <Link href={`/admin/master-data/farmers/${row.farmerDbId}`} className="font-medium hover:underline">
                    {row.farmerName}
                  </Link>
                  <span className="ml-2 font-mono text-xs text-muted-foreground">{row.farmerId}</span>
                </td>
                {row.cells.map((c) => (
                  <td key={c.code} className="px-3 py-1.5 text-center">
                    {c.done ? (
                      <Check className="mx-auto h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <X className="mx-auto h-4 w-4 text-red-500/70" />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hasMore && (
        <div className="flex items-center justify-between border-t bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <span>Menampilkan {rows.length} dari {formatNumber(training.matrix.length)} petani</span>
          <Button variant="ghost" size="sm" className="h-7" onClick={() => setShowAll((v) => !v)}>
            {showAll ? "Ringkas" : `Tampilkan semua (${formatNumber(training.matrix.length)})`}
          </Button>
        </div>
      )}
    </div>
  );
}

function IncompleteFarmersTable({ training }: { training: TrainingCoverageDetail }) {
  const [showAll, setShowAll] = useState(false);
  const rows = showAll ? training.incompleteFarmers : training.incompleteFarmers.slice(0, INITIAL_ANOMALY_ROWS);
  const hasMore = training.incompleteFarmers.length > INITIAL_ANOMALY_ROWS;

  if (training.incompleteFarmers.length === 0) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        Semua petani sudah mengikuti seluruh paket wajib.
      </p>
    );
  }

  return (
    <div className="rounded-md border">
      <div className="max-h-96 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted/70">
            <tr className="border-b-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-2">ID Petani</th>
              <th className="px-3 py-2">Nama Petani</th>
              <th className="px-3 py-2 text-center">Cakupan</th>
              <th className="px-3 py-2">Paket yang Masih Kurang</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((f) => (
              <tr key={f.farmerDbId} className="border-b last:border-0">
                <td className="px-3 py-1.5 font-mono text-muted-foreground">{f.farmerId}</td>
                <td className="px-3 py-1.5 font-medium">
                  <Link href={`/admin/master-data/farmers/${f.farmerDbId}`} className="hover:underline">
                    {f.farmerName}
                  </Link>
                </td>
                <td className="px-3 py-1.5 text-center tabular-nums">
                  {f.doneCount}/{f.total} ({f.coveragePct}%)
                </td>
                <td className="px-3 py-1.5">
                  <span className="flex flex-wrap gap-1">
                    {f.missing.map((m) => (
                      <Badge key={m} variant="outline" className="font-normal">
                        {m}
                      </Badge>
                    ))}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hasMore && (
        <div className="flex items-center justify-between border-t bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <span>Menampilkan {rows.length} dari {formatNumber(training.incompleteFarmers.length)} petani</span>
          <Button variant="ghost" size="sm" className="h-7" onClick={() => setShowAll((v) => !v)}>
            {showAll ? "Ringkas" : `Tampilkan semua (${formatNumber(training.incompleteFarmers.length)})`}
          </Button>
        </div>
      )}
    </div>
  );
}
