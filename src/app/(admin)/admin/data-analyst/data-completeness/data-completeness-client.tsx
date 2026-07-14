"use client";

import { useState, useEffect, useTransition } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Check,
  ChevronsUpDown,
  ChevronDown,
  Search,
  Download,
  Users,
  Layers,
  GraduationCap,
  Sprout,
  ClipboardCheck,
  AlertTriangle,
  CheckCircle2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { analyzeFarmerGroupCompleteness, getFarmerGroupsForCompleteness } from "@/server/actions/data-completeness";
import type {
  AnomalyItem,
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
}
interface Props {
  districts: District[];
  initialFarmerGroups: FarmerGroup[];
}

const DOMAIN_ICONS: Record<DomainResult["domain"], React.ComponentType<{ className?: string }>> = {
  petani: Users,
  lahan: Layers,
  pelatihan: GraduationCap,
  produksi: Sprout,
};

function scoreTone(score: number): string {
  if (score >= 85) return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
  return "bg-red-500/10 text-red-600 dark:text-red-400";
}

function ScoreBadge({ score }: { score: number }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums", scoreTone(score))}>
      {score.toFixed(0)}%
    </span>
  );
}

export function DataCompletenessClient({ districts, initialFarmerGroups }: Props) {
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [selectedFarmerGroup, setSelectedFarmerGroup] = useState<string | null>(null);
  const [farmerGroups, setFarmerGroups] = useState<FarmerGroup[]>(initialFarmerGroups);

  const [districtComboOpen, setDistrictComboOpen] = useState(false);
  const [groupComboOpen, setGroupComboOpen] = useState(false);

  const [result, setResult] = useState<DataCompletenessResult | null>(null);
  const [isPending, startTransition] = useTransition();

  // Cascading filter: reload groups when district changes.
  useEffect(() => {
    async function updateGroups() {
      try {
        const groups = await getFarmerGroupsForCompleteness(selectedDistrict);
        setFarmerGroups(groups);
      } catch {
        toast.error("Gagal memuat Lembaga Tani");
      }
    }
    updateGroups();
  }, [selectedDistrict]);

  const handleDistrictSelect = (val: string | null) => {
    setSelectedDistrict(val);
    setSelectedFarmerGroup(null);
    setResult(null);
    setDistrictComboOpen(false);
  };

  const handleAnalyze = () => {
    if (!selectedFarmerGroup) return;
    startTransition(async () => {
      try {
        const data = await analyzeFarmerGroupCompleteness(selectedFarmerGroup);
        setResult(data);
        toast.success("Analisis ketersediaan data berhasil dimuat");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Gagal memuat analisis data");
      }
    });
  };

  const handleDownload = async () => {
    if (!result) return;
    const { exportMultiSheetToExcel } = await import("@/lib/xlsx");

    const ringkasanRows = [
      { metrik: "Lembaga Tani", nilai: `${result.group.name}${result.group.code ? ` (${result.group.code})` : ""}` },
      { metrik: "District", nilai: result.group.districtName },
      { metrik: "Index Ketersediaan Data", nilai: `${result.healthScore}%` },
      { metrik: "Total Petani", nilai: result.totalFarmers },
      { metrik: "Total Anomali", nilai: result.totalAnomalies },
      { metrik: "Skor Profil KT", nilai: `${result.profileScore}%` },
      ...result.domains.map((d) => ({ metrik: `Skor ${d.label}`, nilai: `${d.score}%` })),
    ];

    const domainSheets = result.domains.map((d) => ({
      name: d.label.slice(0, 31),
      columns: [
        { header: "Anomali", key: "anomali" },
        { header: "ID Petani", key: "farmerId" },
        { header: "Nama Petani", key: "farmerName" },
        { header: "Detail", key: "detail" },
      ],
      data: d.anomalies.flatMap((a) =>
        a.items.length > 0
          ? a.items.map((it) => ({ anomali: a.label, farmerId: it.farmerId, farmerName: it.farmerName, detail: it.detail ?? "" }))
          : [{ anomali: a.label, farmerId: "", farmerName: "", detail: `${a.count} temuan` }]
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

    await exportMultiSheetToExcel({
      filename: `analisa-ketersediaan-${result.group.code || result.group.name}-${format(new Date(), "yyyyMMdd")}`,
      sheets: [
        { name: "Ringkasan", columns: [{ header: "Metrik", key: "metrik" }, { header: "Nilai", key: "nilai" }], data: ringkasanRows },
        ...domainSheets,
        ...trainingSheets,
      ],
    });
  };

  const selectedDistrictObj = districts.find((d) => d.id === selectedDistrict);
  const selectedGroupObj = farmerGroups.find((g) => g.id === selectedFarmerGroup);

  return (
    <div className="space-y-6">
      {/* Filter Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            {/* District */}
            <div className="flex flex-col gap-1.5 min-w-[200px]">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Distrik</span>
              <Popover open={districtComboOpen} onOpenChange={setDistrictComboOpen}>
                <PopoverTrigger
                  render={
                    <Button variant="outline" role="combobox" aria-expanded={districtComboOpen} className="w-[200px] justify-between h-9 font-normal text-left">
                      {selectedDistrict === null ? <span>Semua Distrik</span> : <span>{selectedDistrictObj?.name}</span>}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  }
                />
                <PopoverContent className="w-[200px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Cari distrik..." />
                    <CommandList className="max-h-[300px]">
                      <CommandEmpty>Distrik tidak ditemukan.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem value="all" onSelect={() => handleDistrictSelect(null)}>
                          <Check className={cn("mr-2 h-4 w-4", selectedDistrict === null ? "opacity-100" : "opacity-0")} />
                          Semua Distrik
                        </CommandItem>
                        {districts.map((d) => (
                          <CommandItem key={d.id} value={d.name} onSelect={() => handleDistrictSelect(d.id)}>
                            <Check className={cn("mr-2 h-4 w-4", selectedDistrict === d.id ? "opacity-100" : "opacity-0")} />
                            {d.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Farmer Group (required) */}
            <div className="flex flex-col gap-1.5 min-w-[250px]">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lembaga Tani</span>
              <Popover open={groupComboOpen} onOpenChange={setGroupComboOpen}>
                <PopoverTrigger
                  render={
                    <Button variant="outline" role="combobox" aria-expanded={groupComboOpen} className="w-[250px] justify-between h-9 font-normal text-left">
                      {selectedFarmerGroup === null ? <span className="text-muted-foreground">Pilih Lembaga Tani</span> : <span>{selectedGroupObj?.name}</span>}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  }
                />
                <PopoverContent className="w-[250px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Cari lembaga tani..." />
                    <CommandList className="max-h-[300px]">
                      <CommandEmpty>Lembaga Tani tidak ditemukan.</CommandEmpty>
                      <CommandGroup>
                        {farmerGroups.map((g) => (
                          <CommandItem
                            key={g.id}
                            value={g.name}
                            onSelect={() => {
                              setSelectedFarmerGroup(g.id);
                              setGroupComboOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", selectedFarmerGroup === g.id ? "opacity-100" : "opacity-0")} />
                            {g.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Analyze */}
            <Button onClick={handleAnalyze} disabled={isPending || !selectedFarmerGroup} className="h-9">
              <Search className={cn("mr-2 h-4 w-4", isPending && "animate-spin")} />
              {isPending ? "Menganalisa..." : "Analisa"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {!result ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
          <ClipboardCheck className="h-12 w-12 text-muted-foreground opacity-40 mb-4" />
          <p className="text-muted-foreground font-medium">Pilih District dan Lembaga Tani, lalu klik Analisa</p>
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
                    <span className="text-red-600 dark:text-red-400 font-medium">{result.totalAnomalies} anomali</span>
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">Index Ketersediaan Data</div>
                    <div className={cn("text-3xl font-bold tabular-nums", scoreTone(result.healthScore).split(" ").slice(1).join(" "))}>
                      {result.healthScore}%
                    </div>
                  </div>
                  <Button variant="outline" onClick={handleDownload} className="h-9">
                    <Download className="mr-2 h-4 w-4" />
                    Excel
                  </Button>
                </div>
              </div>
              {/* Domain chips */}
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs">
                  <ClipboardCheck className="h-3.5 w-3.5 text-muted-foreground" /> Profil KT <ScoreBadge score={result.profileScore} />
                </span>
                {result.domains.map((d) => {
                  const Icon = DOMAIN_ICONS[d.domain];
                  return (
                    <span key={d.domain} className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" /> {d.label} <ScoreBadge score={d.score} />
                    </span>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Zero-farmer notice */}
          {result.totalFarmers === 0 && (
            <Card className="border-amber-500/40 bg-amber-500/5">
              <CardContent className="flex items-center gap-2 py-4 text-sm text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Lembaga Tani ini belum memiliki data petani aktif — domain Petani, Lahan, Pelatihan, dan Produksi kosong.
              </CardContent>
            </Card>
          )}

          {/* Section 1: Profil KT */}
          <ProfileSection result={result} />

          {/* Sections 2-5: domains (Pelatihan pakai tampilan cakupan per paket) */}
          {result.domains.map((d) =>
            d.domain === "pelatihan" && d.training ? (
              <TrainingSection key={d.domain} domain={d} />
            ) : (
              <DomainSection key={d.domain} domain={d} />
            )
          )}
        </div>
      )}
    </div>
  );
}

function SectionShell({
  title,
  icon: Icon,
  score,
  anomalyCount,
  defaultOpen,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  score: number;
  anomalyCount: number;
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
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
                    {anomalyCount} anomali
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

function ProfileSection({ result }: { result: DataCompletenessResult }) {
  const failed = result.profileChecks.filter((c) => !c.complete).length;
  return (
    <SectionShell title="Profil Lembaga Tani" icon={ClipboardCheck} score={result.profileScore} anomalyCount={failed} defaultOpen={failed > 0}>
      <ul className="space-y-2">
        {result.profileChecks.map((c) => (
          <li key={c.key} className="flex items-center justify-between gap-4 text-sm">
            <span className="flex items-center gap-2">
              {c.complete ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              )}
              {c.label}
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
function AnomalyItemsTable({ items }: { items: AnomalyItem[] }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? items : items.slice(0, INITIAL_ANOMALY_ROWS);
  const hasMore = items.length > INITIAL_ANOMALY_ROWS;

  return (
    <div className="rounded-md border">
      <div className="max-h-72 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted/70">
            <tr className="border-b-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-2">ID Petani</th>
              <th className="px-3 py-2">Nama Petani</th>
              <th className="px-3 py-2">Detail</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((it, idx) => (
              <tr key={`${it.farmerDbId}-${it.detail ?? ""}-${idx}`} className="border-b last:border-0">
                <td className="px-3 py-1.5 font-mono text-muted-foreground">{it.farmerId}</td>
                <td className="px-3 py-1.5 font-medium">{it.farmerName}</td>
                <td className="px-3 py-1.5 text-muted-foreground">{it.detail ?? "—"}</td>
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

function DomainSection({ domain }: { domain: DomainResult }) {
  const Icon = DOMAIN_ICONS[domain.domain];
  return (
    <SectionShell title={domain.label} icon={Icon} score={domain.score} anomalyCount={domain.totalAnomalies} defaultOpen={domain.totalAnomalies > 0}>
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {domain.cards.map((card) => (
          <div key={card.label} className="rounded-lg border bg-muted/30 p-3">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{card.label}</div>
            <div className="text-xl font-bold tabular-nums">{card.value}</div>
          </div>
        ))}
      </div>

      {/* Anomalies — satu nested collapse per jenis anomali (analisa) */}
      {domain.anomalies.length === 0 ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          Tidak ada anomali pada domain ini.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {domain.anomalies.map((a) => (
            <SubCollapsible
              key={a.key}
              title={a.label}
              defaultOpen={false}
              badge={<Badge variant="destructive">{a.count}</Badge>}
            >
              {a.items.length > 0 ? (
                <AnomalyItemsTable items={a.items} />
              ) : (
                <p className="text-sm text-muted-foreground">Tidak ada rincian entitas.</p>
              )}
            </SubCollapsible>
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

function TrainingSection({ domain }: { domain: DomainResult }) {
  const t = domain.training!;
  const noActivityPackages = t.packageCoverage.filter((p) => !p.hasActivity);
  return (
    <SectionShell
      title={domain.label}
      icon={GraduationCap}
      score={domain.score}
      anomalyCount={domain.totalAnomalies}
      defaultOpen={domain.totalAnomalies > 0}
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
            Belum ada aktivitas pelatihan di KT ini untuk paket:{" "}
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
                  <span className="font-medium">{row.farmerName}</span>
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
                <td className="px-3 py-1.5 font-medium">{f.farmerName}</td>
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
