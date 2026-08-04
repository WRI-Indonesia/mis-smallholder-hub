"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Users,
  User,
  Map,
  Ruler,
  BookOpen,
  Network,
  BadgeCheck,
  Search,
  SearchX,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCertStatus } from "@/lib/farmer-group-labels";
import type { DashboardStats, KTDetails } from "@/types/dashboard";

const formatNumber = (n: number) => new Intl.NumberFormat("id-ID").format(n);
const formatArea = (n: number) =>
  `${new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)} ha`;

// Kartu yang bisa diklik untuk popup rincian (#206) — 5 kartu baris teratas.
type DetailKey = "lembaga" | "kelompokTani" | "rspo" | "ispo" | "sapMap";

interface CardConfig {
  title: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  detailKey?: DetailKey;
}

interface Props {
  stats: DashboardStats;
  /**
   * Daftar KT yang menjadi sumber angka kartu (irisan filter aktif). Bila diisi,
   * 5 kartu teratas bisa diklik untuk melihat rincian (#206); tanpa ini kartu
   * statis (halaman Snapshot Detail).
   */
  kts?: KTDetails[];
  /** Timestamp snapshot terformat — footer dialog rincian. */
  generatedAtLabel?: string;
}

export function DashboardSummaryCards({ stats, kts, generatedAtLabel }: Props) {
  const [openDetail, setOpenDetail] = useState<DetailKey | null>(null);

  // Card sertifikasi (#169): angka besar = Lembaga tersertifikasi, sub = jumlah plan.
  // Year-independent — tidak ikut filter Tahun. Snapshot pra-#169 → 0 sampai regenerate.
  const certCard = (title: string, detailKey: DetailKey, counts?: { certified: number; planned: number }): CardConfig => ({
    title,
    value: `${formatNumber(counts?.certified ?? 0)} lembaga`,
    sub: `Tersertifikasi · ${formatNumber(counts?.planned ?? 0)} plan`,
    icon: BadgeCheck,
    iconClass: "text-emerald-600",
    detailKey,
  });

  const cards: CardConfig[] = [
    { title: "Total Lembaga Petani", value: formatNumber(stats.totalKelompokTani), icon: Users, iconClass: "text-slate-600", detailKey: "lembaga" },
    { title: "Total Kelompok Tani", value: formatNumber(stats.totalKelompokTaniLahan ?? 0), icon: Network, iconClass: "text-teal-600", detailKey: "kelompokTani" },
    // Sertifikasi & assurance (#169) — posisi setelah Total Kelompok Tani (permintaan owner)
    certCard("Sertifikasi RSPO", "rspo", stats.certStats?.rspo),
    certCard("Sertifikasi ISPO", "ispo", stats.certStats?.ispo),
    certCard("Assurance SAP/MAP", "sapMap", stats.certStats?.sapMap),
    { title: "Total Petani", value: formatNumber(stats.totalPetani), icon: Users, iconClass: "text-blue-600" },
    { title: "Petani Laki-laki", value: formatNumber(stats.totalPetaniLaki ?? 0), icon: User, iconClass: "text-sky-600" },
    { title: "Petani Perempuan", value: formatNumber(stats.totalPetaniPerempuan ?? 0), icon: User, iconClass: "text-pink-600" },
    { title: "Total Persil Lahan", value: formatNumber(stats.totalPersilLahan), icon: Map, iconClass: "text-green-600" },
    { title: "Total Luas Lahan", value: formatArea(stats.totalLuasLahan), icon: Ruler, iconClass: "text-green-600" },
    { title: "Paket 1 - BMP/NKT/RSPO", value: `${formatNumber(stats.trainingCounts.PAKET_1_BMP_PC_RSPO_NKT)} petani`, icon: BookOpen, iconClass: "text-orange-600" },
    { title: "Paket 2 - MK", value: `${formatNumber(stats.trainingCounts.PAKET_2_MK)} petani`, icon: BookOpen, iconClass: "text-purple-600" },
    { title: "Paket 2 - HSE", value: `${formatNumber(stats.trainingCounts.PAKET_2_K3)} petani`, icon: BookOpen, iconClass: "text-red-600" },
    { title: "Paket 3 & 4 - GEDSI/BUSDEV", value: `${formatNumber(stats.trainingCounts.PAKET_3_4_GEDSI_FINANCIAL_LIVELIHOOD_BUSDEV)} petani`, icon: BookOpen, iconClass: "text-indigo-600" },
  ];

  return (
    <>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card) => {
          const Icon = card.icon;
          const clickable = kts != null && card.detailKey != null;
          return (
            <Card
              key={card.title}
              role={clickable ? "button" : undefined}
              tabIndex={clickable ? 0 : undefined}
              onClick={clickable ? () => setOpenDetail(card.detailKey!) : undefined}
              onKeyDown={
                clickable
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setOpenDetail(card.detailKey!);
                      }
                    }
                  : undefined
              }
              className={cn(
                "shadow-sm border border-border/60",
                clickable &&
                  "group cursor-pointer transition-all hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              )}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {card.title}
                </CardTitle>
                <span className="flex items-center gap-1 shrink-0">
                  {clickable && (
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  )}
                  <Icon className={`h-4 w-4 shrink-0 ${card.iconClass}`} />
                </span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">{card.value}</div>
                {card.sub && (
                  <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {kts != null && (
        <Dialog open={openDetail != null} onOpenChange={(open) => !open && setOpenDetail(null)}>
          <DialogContent className="sm:max-w-lg">
            {openDetail && <CardDetail detailKey={openDetail} kts={kts} generatedAtLabel={generatedAtLabel} />}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

// ── Popup rincian kartu (#206) — dihitung dari daftar KT yang sama dengan angka
// kartu, sehingga jumlah baris selalu identik dengan angka yang tampil. ────────

const DETAIL_META: Record<
  DetailKey,
  {
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    iconWrapClass: string;
  }
> = {
  lembaga: {
    title: "Total Lembaga Petani",
    description: "Lembaga Petani aktif dalam cakupan filter yang dipilih. Klik lembaga untuk membuka detailnya.",
    icon: Users,
    iconWrapClass: "bg-slate-500/10 text-slate-600",
  },
  kelompokTani: {
    title: "Total Kelompok Tani",
    description:
      "Jumlah Kelompok Tani per Lembaga — nama KT unik yang tercatat pada data lahan. Klik lembaga untuk membuka detailnya.",
    icon: Network,
    iconWrapClass: "bg-teal-500/10 text-teal-600",
  },
  rspo: {
    title: "Sertifikasi RSPO",
    description: "Lembaga Petani berstatus tersertifikasi atau plan RSPO. Lembaga tanpa info status tidak dihitung.",
    icon: BadgeCheck,
    iconWrapClass: "bg-emerald-500/10 text-emerald-600",
  },
  ispo: {
    title: "Sertifikasi ISPO",
    description: "Lembaga Petani berstatus tersertifikasi atau plan ISPO. Lembaga tanpa info status tidak dihitung.",
    icon: BadgeCheck,
    iconWrapClass: "bg-emerald-500/10 text-emerald-600",
  },
  sapMap: {
    title: "Assurance SAP/MAP",
    description:
      "Lembaga Petani berstatus ter-assurance atau plan SAP/MAP. Lembaga tanpa info status tidak dihitung.",
    icon: BadgeCheck,
    iconWrapClass: "bg-emerald-500/10 text-emerald-600",
  },
};

const CERT_FIELDS: Record<
  "rspo" | "ispo" | "sapMap",
  { status: (kt: KTDetails) => string | null | undefined; year: (kt: KTDetails) => number | null | undefined }
> = {
  rspo: { status: (kt) => kt.rspoCertStatus, year: (kt) => kt.rspoCertYear },
  ispo: { status: (kt) => kt.ispoCertStatus, year: (kt) => kt.ispoCertYear },
  sapMap: { status: (kt) => kt.sapMapAssuranceStatus, year: (kt) => kt.sapMapAssuranceYear },
};

/** Daftar mulai panjang → tampilkan kotak pencarian di dialog. */
const SEARCH_THRESHOLD = 8;

function CardDetail({
  detailKey,
  kts,
  generatedAtLabel,
}: {
  detailKey: DetailKey;
  kts: KTDetails[];
  generatedAtLabel?: string;
}) {
  const meta = DETAIL_META[detailKey];
  const MetaIcon = meta.icon;
  const [query, setQuery] = useState("");

  const sorted = useMemo(() => [...kts].sort((a, b) => a.name.localeCompare(b.name)), [kts]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((kt) =>
      [kt.name, kt.code, kt.districtName].some((v) => v?.toLowerCase().includes(q))
    );
  }, [sorted, query]);

  const totalKt = sorted.reduce((s, kt) => s + (kt.kelompokTaniCount ?? 0), 0);
  const certFields = detailKey === "rspo" || detailKey === "ispo" || detailKey === "sapMap" ? CERT_FIELDS[detailKey] : null;
  const certified = certFields ? sorted.filter((kt) => certFields.status(kt) === "CERTIFIED") : [];
  const planned = certFields ? sorted.filter((kt) => certFields.status(kt) === "PLANNED") : [];

  return (
    <>
      <DialogHeader>
        <div className="flex items-start gap-3 pr-8">
          <div className={cn("rounded-lg p-2.5 shrink-0", meta.iconWrapClass)}>
            <MetaIcon className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <DialogTitle>{meta.title}</DialogTitle>
            <DialogDescription>{meta.description}</DialogDescription>
          </div>
        </div>
        {/* Chip ringkasan — angka yang sama dengan kartu, sebagai jangkar visual. */}
        <div className="flex flex-wrap gap-1.5">
          {detailKey === "lembaga" && <Badge variant="secondary">{formatNumber(sorted.length)} lembaga</Badge>}
          {detailKey === "kelompokTani" && (
            <>
              <Badge variant="secondary">{formatNumber(totalKt)} Kelompok Tani</Badge>
              <Badge variant="outline">{formatNumber(sorted.length)} lembaga</Badge>
            </>
          )}
          {certFields && (
            <>
              <Badge className="bg-emerald-600 hover:bg-emerald-600">
                {formatNumber(certified.length)} {detailKey === "sapMap" ? "Ter-assurance" : "Tersertifikasi"}
              </Badge>
              <Badge variant="outline">{formatNumber(planned.length)} Plan</Badge>
            </>
          )}
        </div>
      </DialogHeader>

      {sorted.length > SEARCH_THRESHOLD && (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari lembaga, kode, atau distrik..."
            className="h-9 pl-8"
          />
        </div>
      )}

      <div className="max-h-[50vh] overflow-y-auto pr-1 -mr-1">
        {sorted.length === 0 ? (
          <EmptyState message="Tidak ada data pada filter ini." />
        ) : filtered.length === 0 ? (
          <EmptyState message={`Tidak ada yang cocok dengan "${query.trim()}".`} />
        ) : detailKey === "lembaga" ? (
          <div className="divide-y divide-border/40">
            {filtered.map((kt) => (
              <LembagaRow key={kt.id} kt={kt} />
            ))}
          </div>
        ) : detailKey === "kelompokTani" ? (
          <KelompokTaniList kts={filtered} showTotal={filtered.length === sorted.length} totalKt={totalKt} />
        ) : (
          certFields && (
            <CertSections
              detailKey={detailKey as "rspo" | "ispo" | "sapMap"}
              certified={certified.filter((kt) => filtered.includes(kt))}
              planned={planned.filter((kt) => filtered.includes(kt))}
              fields={certFields}
            />
          )
        )}
      </div>

      {generatedAtLabel && (
        <p className="text-xs text-muted-foreground border-t pt-3">
          Nilai di-generate pada <span className="font-medium text-foreground">{generatedAtLabel}</span>
        </p>
      )}
    </>
  );
}

function KelompokTaniList({ kts, showTotal, totalKt }: { kts: KTDetails[]; showTotal: boolean; totalKt: number }) {
  return (
    <div>
      <div className="divide-y divide-border/40">
        {kts.map((kt) => (
          <LembagaRow
            key={kt.id}
            kt={kt}
            right={
              <span className="font-semibold tabular-nums">
                {formatNumber(kt.kelompokTaniCount ?? 0)} KT
              </span>
            }
          />
        ))}
      </div>
      {showTotal && (
        <div className="mt-1 flex items-center justify-between border-t pt-2.5 text-sm font-semibold">
          <span>Total</span>
          <span className="tabular-nums">{formatNumber(totalKt)}</span>
        </div>
      )}
    </div>
  );
}

function CertSections({
  detailKey,
  certified,
  planned,
  fields,
}: {
  detailKey: "rspo" | "ispo" | "sapMap";
  certified: KTDetails[];
  planned: KTDetails[];
  fields: (typeof CERT_FIELDS)["rspo"];
}) {
  const section = (label: string, dotClass: string, items: KTDetails[], status: string) => (
    <section>
      <h4 className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <span className={cn("h-2 w-2 rounded-full", dotClass)} />
        {label}
        <span className="ml-auto tabular-nums">{formatNumber(items.length)}</span>
      </h4>
      {items.length === 0 ? (
        <p className="pb-1 text-sm text-muted-foreground">Tidak ada.</p>
      ) : (
        <div className="divide-y divide-border/40">
          {items.map((kt) => (
            <LembagaRow
              key={kt.id}
              kt={kt}
              right={
                <Badge variant={status === "CERTIFIED" ? "default" : "outline"}>
                  {formatCertStatus(fields.year(kt) ?? null, status)}
                </Badge>
              }
            />
          ))}
        </div>
      )}
    </section>
  );

  return (
    <div className="space-y-4">
      {section(
        detailKey === "sapMap" ? "Ter-assurance" : "Tersertifikasi",
        "bg-emerald-500",
        certified,
        "CERTIFIED"
      )}
      {section("Plan", "bg-amber-400", planned, "PLANNED")}
    </div>
  );
}

function LembagaRow({ kt, right }: { kt: KTDetails; right?: React.ReactNode }) {
  return (
    <Link
      href={`/admin/master-data/groups/${kt.id}`}
      target="_blank"
      rel="noopener noreferrer"
      title="Buka detail lembaga di tab baru"
      className="group/row -mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted/60"
    >
      <div className="min-w-0">
        <p className="truncate font-medium group-hover/row:text-primary">{kt.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {kt.code && <span className="font-mono">{kt.code}</span>}
          {kt.code && kt.districtName && " · "}
          {kt.districtName}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 tabular-nums">
        {right}
        <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover/row:opacity-100" />
      </div>
    </Link>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <SearchX className="h-8 w-8 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
