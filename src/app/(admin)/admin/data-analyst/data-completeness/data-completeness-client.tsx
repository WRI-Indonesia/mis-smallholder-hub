"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Check,
  ChevronDown,
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
  Rows3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { StatTooltipContent, StatTooltipRow } from "@/components/shared/stat-tooltip";
import { FilterCombobox } from "@/components/shared/filter-combobox";
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
} from "@/lib/data-completeness-registry";
import { maskIfNik } from "@/lib/mask";
import type {
  AnomalyItem,
  CompletenessDomainKey,
  CompletenessFix,
  DataCompletenessResult,
  DomainAnomaly,
  DomainResult,
  ModuleCoverage,
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

// Rumus singkat per domain — isi tooltip strip skor (#352 B2, menutup 6h).
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

    const fixText = (fix: CompletenessFix) => (fix.field ? `${fix.menu} › ${fix.field}` : fix.menu);

    const domainSheets = result.domains.map((d) => ({
      name: d.label.slice(0, 31),
      columns: [
        { header: "Anomali", key: "anomali" },
        { header: "ID Petani", key: "farmerId" },
        { header: "Nama Petani", key: "farmerName" },
        { header: "Detail", key: "detail" },
        { header: "Perbaiki lewat", key: "fix" },
      ],
      data: d.anomalies.flatMap((a) =>
        a.items.length > 0
          ? a.items.map((it) => ({
              anomali: a.systemic ? `${a.label} (sistemik: ${a.entityCount}/${a.total})` : a.label,
              farmerId: it.farmerId,
              farmerName: it.farmerName,
              detail: it.detail ?? "",
              fix: fixText(a.fix),
            }))
          : [{ anomali: a.label, farmerId: "", farmerName: "", detail: `${a.count} temuan`, fix: fixText(a.fix) }]
      ),
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

    // Sheet Cakupan Modul (#352 A1) — informatif, di luar Index.
    const moduleSheet = {
      name: "Cakupan Modul",
      columns: [
        { header: "Domain", key: "domain" },
        { header: "Modul", key: "modul" },
        { header: "Terisi", key: "covered" },
        { header: "Total", key: "total" },
        { header: "Cakupan", key: "pct" },
        { header: "Perbaiki lewat", key: "fix" },
      ],
      data: result.moduleCoverage.map((m) => ({
        domain: MODULE_DOMAIN_LABELS[m.domain],
        modul: m.label,
        covered: m.covered,
        total: m.total,
        pct: m.pct == null ? "belum ada di Lembaga ini" : `${m.pct.toFixed(1)}%`,
        fix: fixText(m.fix),
      })),
    };

    await exportMultiSheetToExcel({
      filename: `analisa-ketersediaan-${result.group.code || result.group.name}-${format(new Date(), "yyyyMMdd")}`,
      sheets: [
        { name: "Ringkasan", columns: [{ header: "Metrik", key: "metrik" }, { header: "Nilai", key: "nilai" }], data: ringkasanRows },
        ...domainSheets,
        ...trainingSheets,
        moduleSheet,
      ],
    });
  };

  const setSection = (key: CompletenessDomainKey, open: boolean) =>
    setOpenSections((prev) => ({ ...prev, [key]: open }));
  const setAll = (open: boolean) => setOpenSections(Object.fromEntries(DOMAIN_ORDER.map((d) => [d, open])));

  // Strip skor → buka seksi + gulir ke sana.
  const jumpTo = (key: CompletenessDomainKey) => {
    setSection(key, true);
    requestAnimationFrame(() => {
      document.getElementById(SECTION_ID[key])?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

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
          {/* Overview header */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold">
                    {result.group.name}
                    {result.group.code && <span className="ml-2 font-mono text-sm text-muted-foreground">{result.group.code}</span>}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {result.group.districtName} · {result.totalFarmers} petani ·{" "}
                    <span className="text-red-600 dark:text-red-400 font-medium">{result.totalAnomalies} temuan anomali</span>
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">Index Ketersediaan Data</div>
                    <Tooltip>
                      <TooltipTrigger
                        render={<div className={cn("text-3xl font-bold tabular-nums cursor-help", BAND_TEXT[scoreBand(result.healthScore)])} />}
                      >
                        {result.healthScore}%
                      </TooltipTrigger>
                      <StatTooltipContent
                        title="Index = Σ (skor domain × bobot)"
                        footer={`Band: ${bandLabel(result.healthScore)}`}
                      >
                        {DOMAIN_ORDER.map((d) => {
                          const score = d === "profil" ? result.profileScore : result.domains.find((x) => x.domain === d)!.score;
                          return (
                            <StatTooltipRow
                              key={d}
                              chip={BAND_BAR[scoreBand(score)]}
                              label={`${MODULE_DOMAIN_LABELS[d]} × ${weightPct(d)}%`}
                              value={`${score.toFixed(1)}%`}
                            />
                          );
                        })}
                      </StatTooltipContent>
                    </Tooltip>
                  </div>
                  {canExport && (
                    <Button variant="outline" onClick={handleDownload} className="h-9">
                      <Download className="mr-2 h-4 w-4" />
                      Excel
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Strip skor per domain — navigasi mini: klik = buka + gulir ke seksi (menutup 6g/6h).
              Tidak dibuat sticky: `<main>` layout admin ber-overflow-auto sehingga sticky
              tidak pernah menempel ke viewport (header admin pun tidak). */}
          <div>
            <Card className="py-2">
              <CardContent className="flex flex-wrap items-center gap-2 px-3">
                {DOMAIN_ORDER.map((d) => {
                  const score = d === "profil" ? result.profileScore : result.domains.find((x) => x.domain === d)!.score;
                  const Icon = DOMAIN_ICONS[d];
                  return (
                    <Tooltip key={d}>
                      <TooltipTrigger
                        render={
                          <button
                            type="button"
                            onClick={() => jumpTo(d)}
                            className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs hover:bg-muted transition-colors"
                          />
                        }
                      >
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        {MODULE_DOMAIN_LABELS[d]}
                        <span className="text-muted-foreground">· {weightPct(d)} %</span>
                        <ScoreBadge score={score} />
                      </TooltipTrigger>
                      <StatTooltipContent
                        title={`${MODULE_DOMAIN_LABELS[d]} · bobot ${weightPct(d)} % dari Index`}
                        subtitle={DOMAIN_FORMULA[d]}
                        footer="Klik untuk membuka seksinya"
                      >
                        <StatTooltipRow chip={BAND_BAR[scoreBand(score)]} label="Skor domain" value={`${score.toFixed(1)}%`} />
                      </StatTooltipContent>
                    </Tooltip>
                  );
                })}
                <span className="ml-auto flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setAll(true)}>
                    Buka semua
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setAll(false)}>
                    Tutup semua
                  </Button>
                </span>
              </CardContent>
            </Card>
          </div>

          {/* Zero-farmer notice */}
          {result.totalFarmers === 0 && (
            <Card className="border-amber-500/40 bg-amber-500/5">
              <CardContent className="flex items-center gap-2 py-4 text-sm text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Lembaga Petani ini belum memiliki data petani aktif — domain Petani, Lahan, Pelatihan, dan Produksi kosong.
              </CardContent>
            </Card>
          )}

          {/* Cakupan modul (#352 A1) — informatif, di luar Index */}
          <ModuleCoverageBlock modules={result.moduleCoverage} />

          {/* Section 1: Profil KT */}
          <ProfileSection result={result} open={!!openSections.profil} onOpenChange={(o) => setSection("profil", o)} />

          {/* Sections 2-5: domains (Pelatihan pakai tampilan cakupan per paket) */}
          {result.domains.map((d) =>
            d.domain === "pelatihan" && d.training ? (
              <TrainingSection key={d.domain} domain={d} open={!!openSections[d.domain]} onOpenChange={(o) => setSection(d.domain, o)} />
            ) : (
              <DomainSection key={d.domain} domain={d} open={!!openSections[d.domain]} onOpenChange={(o) => setSection(d.domain, o)} />
            )
          )}
        </div>
      )}
    </div>
  );
}

// ── Cakupan modul ──

function ModuleCoverageBlock({ modules }: { modules: ModuleCoverage[] }) {
  const [open, setOpen] = useState(true);
  if (modules.length === 0) return null;
  const byDomain = DOMAIN_ORDER.map((d) => ({ domain: d, items: modules.filter((m) => m.domain === d) })).filter(
    (g) => g.items.length > 0
  );
  const started = modules.filter((m) => m.applicable).length;
  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger
          render={
            <button className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left">
              <span className="min-w-0">
                <span className="flex items-center gap-2 font-semibold">
                  <Rows3 className="h-5 w-5 text-muted-foreground" />
                  Cakupan Modul
                  <Badge variant="secondary">{started}/{modules.length} modul dimulai</Badge>
                </span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  Informatif — tidak masuk Index. Abu-abu = modul belum dimulai di Lembaga ini (tidak dihitung).
                </span>
              </span>
              <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open ? "rotate-180" : "")} />
            </button>
          }
        />
        <CollapsibleContent>
          <div className="border-t px-6 py-4 space-y-3">
            {byDomain.map(({ domain, items }) => (
              <div key={domain} className="flex flex-wrap items-center gap-2">
                <span className="w-full sm:w-28 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {MODULE_DOMAIN_LABELS[domain]}
                </span>
                {items.map((m) => (
                  <ModuleChip key={m.key} m={m} />
                ))}
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function ModuleChip({ m }: { m: ModuleCoverage }) {
  const inactive = !m.applicable;
  const band = m.pct == null ? null : scoreBand(m.pct);
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs cursor-help",
              inactive && "border-dashed text-muted-foreground bg-muted/30"
            )}
          />
        }
      >
        {m.label}
        {m.pct == null ? (
          <span className="italic">belum ada di Lembaga ini</span>
        ) : (
          <span className={cn("font-semibold tabular-nums", BAND_TEXT[band!])}>
            {m.grain === "lembaga" ? (m.covered ? "ada" : "tidak ada") : `${m.pct.toFixed(0)}%`}
          </span>
        )}
      </TooltipTrigger>
      <StatTooltipContent
        title={m.label}
        subtitle={m.fix.field ? `${m.fix.menu} › ${m.fix.field}` : m.fix.menu}
        footer={m.pct == null ? "Tidak berlaku: belum satu pun entitas mengisi modul ini — keluar dari penyebut" : undefined}
      >
        <StatTooltipRow chip={band ? BAND_BAR[band] : "bg-muted-foreground/40"} label={`Terisi (${m.grain})`} value={`${m.covered} / ${m.total}`} />
      </StatTooltipContent>
    </Tooltip>
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
  children,
}: {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  score: number;
  anomalyCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <Card id={id} className="scroll-mt-4">
      <Collapsible open={open} onOpenChange={onOpenChange}>
        <CollapsibleTrigger
          render={
            <button className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left">
              <span className="flex items-center gap-2 font-semibold">
                <Icon className="h-5 w-5 text-muted-foreground" />
                {title}
              </span>
              <span className="flex items-center gap-2">
                {anomalyCount > 0 ? (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {anomalyCount} temuan
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Lengkap
                  </Badge>
                )}
                <ScoreBadge score={score} />
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
  return (
    <SectionShell
      id={SECTION_ID.profil}
      title="Profil Lembaga Petani"
      icon={ClipboardCheck}
      score={result.profileScore}
      anomalyCount={failed}
      open={open}
      onOpenChange={onOpenChange}
    >
      <ul className="space-y-2">
        {result.profileChecks.map((c) => (
          <li key={c.key} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
            <span className="flex items-center gap-2">
              {c.complete ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              )}
              {c.label}
              {!c.complete && (
                <span className="text-xs text-muted-foreground">
                  · isi {c.fix.field ? `kolom ${c.fix.field} ` : ""}di{" "}
                  <Link href={`/admin/master-data/groups/${result.group.id}`} className="text-primary hover:underline">
                    Detail Lembaga › Edit
                  </Link>
                </span>
              )}
            </span>
            <span className="flex items-center gap-2">
              {c.value && <span className="font-mono text-xs text-muted-foreground">{c.value}</span>}
              <Badge variant={c.complete ? "secondary" : "destructive"}>{c.complete ? "Lengkap" : "Belum"}</Badge>
            </span>
          </li>
        ))}
      </ul>
    </SectionShell>
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
              <th className="px-3 py-2">{hasParcel ? "ID Lahan" : "Detail"}</th>
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
          <span>Menampilkan {visible.length} dari {items.length} baris</span>
          <Button variant="ghost" size="sm" className="h-7" onClick={() => setShowAll((v) => !v)}>
            {showAll ? "Ringkas" : `Tampilkan semua (${items.length})`}
          </Button>
        </div>
      )}
    </div>
  );
}

const GRAIN_LABEL: Record<DomainAnomaly["grain"], string> = {
  lembaga: "Lembaga",
  petani: "petani",
  persil: "persil",
  aktivitas: "aktivitas",
};

/** Satu jenis anomali: sistemik → satu temuan agregat (#352 A3); selainnya tabel daftar kerja. */
function AnomalyBlock({ a }: { a: DomainAnomaly }) {
  const [showList, setShowList] = useState(false);
  if (a.systemic) {
    return (
      <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            {a.label}
          </span>
          <Badge variant="outline" className="border-amber-500/50 text-amber-700 dark:text-amber-400">
            sistemik · {a.entityCount.toLocaleString("id-ID")} / {a.total.toLocaleString("id-ID")} {GRAIN_LABEL[a.grain]}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Kolom ini praktis belum pernah diisi di Lembaga ini (≥ 95 % {GRAIN_LABEL[a.grain]} kosong) — bukan anomali yang
          dikejar per {GRAIN_LABEL[a.grain]}, melainkan alur pengisian yang belum berjalan. Dihitung sebagai satu temuan; daftar
          lengkap tetap ada di Excel.
        </p>
        <FixHint fix={a.fix} />
        {a.items.length > 0 && (
          <div className="pt-1">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowList((v) => !v)}>
              {showList ? "Sembunyikan daftar" : `Tampilkan daftar (${a.items.length.toLocaleString("id-ID")})`}
            </Button>
            {showList && (
              <div className="mt-2">
                <AnomalyItemsTable items={a.items} />
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
  return (
    <SubCollapsible title={a.label} defaultOpen={false} badge={<Badge variant="destructive">{a.count}</Badge>}>
      <div className="space-y-3">
        <FixHint fix={a.fix} />
        {a.items.length > 0 ? <AnomalyItemsTable items={a.items} /> : <p className="text-sm text-muted-foreground">Tidak ada rincian entitas.</p>}
      </div>
    </SubCollapsible>
  );
}

function DomainSection({
  domain,
  open,
  onOpenChange,
}: {
  domain: DomainResult;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const Icon = DOMAIN_ICONS[domain.domain];
  const systemic = domain.anomalies.filter((a) => a.systemic);
  const perEntity = domain.anomalies.filter((a) => !a.systemic);
  return (
    <SectionShell
      id={SECTION_ID[domain.domain]}
      title={domain.label}
      icon={Icon}
      score={domain.score}
      anomalyCount={domain.totalAnomalies}
      open={open}
      onOpenChange={onOpenChange}
    >
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {domain.cards.map((card) => (
          <div key={card.label} className="rounded-lg border bg-muted/30 p-3">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{card.label}</div>
            <div className="text-xl font-bold tabular-nums">{card.value}</div>
          </div>
        ))}
      </div>

      {/* Anomalies — sistemik dilipat, per entitas satu nested collapse per jenis */}
      {domain.anomalies.length === 0 ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          Tidak ada anomali pada domain ini.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {systemic.map((a) => (
            <AnomalyBlock key={a.key} a={a} />
          ))}
          {perEntity.map((a) => (
            <AnomalyBlock key={a.key} a={a} />
          ))}
        </div>
      )}
    </SectionShell>
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
  open,
  onOpenChange,
}: {
  domain: DomainResult;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const t = domain.training!;
  const noActivityPackages = t.packageCoverage.filter((p) => !p.hasActivity);
  // Anomali selain "belum ikut paket" (yang sudah tergambar di kartu per paket).
  const otherAnomalies = domain.anomalies.filter((a) => !a.key.startsWith(PACKAGE_ANOMALY_PREFIX));
  return (
    <SectionShell
      id={SECTION_ID.pelatihan}
      title={domain.label}
      icon={GraduationCap}
      score={domain.score}
      anomalyCount={domain.totalAnomalies}
      open={open}
      onOpenChange={onOpenChange}
    >
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {domain.cards.map((card) => (
          <div key={card.label} className="rounded-lg border bg-muted/30 p-3">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{card.label}</div>
            <div className="text-xl font-bold tabular-nums">{card.value}</div>
          </div>
        ))}
      </div>

      {/* Banner: paket tanpa aktivitas di KT */}
      {noActivityPackages.length > 0 && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Belum ada aktivitas pelatihan di Lembaga ini untuk paket:{" "}
            {noActivityPackages.map((p) => p.label).join(", ")}.
          </span>
        </div>
      )}

      {t.packages.length === 0 ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          Belum ada paket pelatihan wajib terdaftar.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
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
            badge={<Badge variant="secondary">{t.matrix.length} petani</Badge>}
          >
            <CoverageMatrix training={t} />
          </SubCollapsible>

          {/* 4c — Petani Belum Lengkap */}
          <SubCollapsible
            title="Petani Belum Lengkap"
            defaultOpen={t.incompleteCount > 0}
            badge={
              t.incompleteCount > 0 ? (
                <Badge variant="destructive">{t.incompleteCount}</Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Lengkap
                </Badge>
              )
            }
          >
            <IncompleteFarmersTable training={t} />
          </SubCollapsible>

          {otherAnomalies.map((a) => (
            <AnomalyBlock key={a.key} a={a} />
          ))}
        </div>
      )}
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
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{pkg.label}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {pkg.covered}/{pkg.totalFarmers} sudah ikut · {pkg.notCovered} belum
                </span>
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
          <span>Menampilkan {rows.length} dari {training.matrix.length} petani</span>
          <Button variant="ghost" size="sm" className="h-7" onClick={() => setShowAll((v) => !v)}>
            {showAll ? "Ringkas" : `Tampilkan semua (${training.matrix.length})`}
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
          <span>Menampilkan {rows.length} dari {training.incompleteFarmers.length} petani</span>
          <Button variant="ghost" size="sm" className="h-7" onClick={() => setShowAll((v) => !v)}>
            {showAll ? "Ringkas" : `Tampilkan semua (${training.incompleteFarmers.length})`}
          </Button>
        </div>
      )}
    </div>
  );
}
