"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Users,
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
import { formatNumber, formatArea } from "@/lib/format";

const formatAreaHa = (n: number) => `${formatArea(n)} ha`;

// Kartu yang bisa diklik untuk popup rincian (#206) — 5 kartu baris teratas.
type DetailKey = "lembaga" | "kelompokTani" | "rspo" | "ispo" | "sapMap";

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

  const clickable = kts != null;
  const open = (key: DetailKey) => (clickable ? () => setOpenDetail(key) : undefined);
  const pctOf = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : null);

  const totalPetani = stats.totalPetani;
  const male = stats.totalPetaniLaki ?? 0;
  const female = stats.totalPetaniPerempuan ?? 0;
  const malePct = pctOf(male, male + female);

  // Sertifikasi & assurance (#169): angka = Lembaga tersertifikasi, sub = jumlah plan.
  // Year-independent — tidak ikut filter Tahun. Snapshot pra-#169 → 0 sampai regenerate.
  const certRows: { label: string; key: DetailKey; counts?: { certified: number; planned: number } }[] = [
    { label: "RSPO", key: "rspo", counts: stats.certStats?.rspo },
    { label: "ISPO", key: "ispo", counts: stats.certStats?.ispo },
    { label: "Assurance SAP/MAP", key: "sapMap", counts: stats.certStats?.sapMap },
  ];

  const trainingRows = [
    { label: "Paket 1 · BMP/NKT/RSPO", value: stats.trainingCounts.PAKET_1_BMP_PC_RSPO_NKT },
    { label: "Paket 2 · MK", value: stats.trainingCounts.PAKET_2_MK },
    { label: "Paket 2 · HSE", value: stats.trainingCounts.PAKET_2_K3 },
    { label: "Paket 3 & 4 · GEDSI/BUSDEV", value: stats.trainingCounts.PAKET_3_4_GEDSI_FINANCIAL_LIVELIHOOD_BUSDEV },
  ];

  // #420: 14 kartu → 5 kartu tematik (Kelembagaan · Sertifikasi · Petani · Lahan · Pelatihan).
  // Satu warna aksen (owner 2026-10-11: "terlalu warna warni") — bar = primary, ikon netral.
  return (
    <>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        <ThemeCard title="Kelembagaan" icon={Network} iconClass="text-muted-foreground">
          <StatRow label="Lembaga Petani" value={formatNumber(stats.totalKelompokTani)} onClick={open("lembaga")} big />
          <StatRow label="Kelompok Tani" value={formatNumber(stats.totalKelompokTaniLahan ?? 0)} onClick={open("kelompokTani")} big />
        </ThemeCard>

        <ThemeCard title="Sertifikasi & assurance" icon={BadgeCheck} iconClass="text-muted-foreground">
          {certRows.map((c) => (
            <StatRow
              key={c.key}
              label={c.label}
              value={`${formatNumber(c.counts?.certified ?? 0)} lembaga`}
              sub={`${formatNumber(c.counts?.planned ?? 0)} plan`}
              onClick={open(c.key)}
            />
          ))}
        </ThemeCard>

        <ThemeCard title="Petani" icon={Users} iconClass="text-muted-foreground">
          <p className="text-3xl font-bold tabular-nums">{formatNumber(totalPetani)}</p>
          <div
            className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-muted"
            role="img"
            aria-label={`Komposisi petani: laki-laki ${formatNumber(male)}, perempuan ${formatNumber(female)}`}
          >
            <div className="bg-primary" style={{ width: `${malePct ?? 0}%` }} />
            <div className="bg-primary/35" style={{ width: `${malePct == null ? 0 : 100 - malePct}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Laki-laki <strong className="tabular-nums text-foreground">{formatNumber(male)}</strong>
              {malePct != null && <span className="tabular-nums">({malePct}%)</span>}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary/35" />
              Perempuan <strong className="tabular-nums text-foreground">{formatNumber(female)}</strong>
              {malePct != null && <span className="tabular-nums">({100 - malePct}%)</span>}
            </span>
          </div>
        </ThemeCard>

        <ThemeCard title="Lahan" icon={Map} iconClass="text-muted-foreground">
          <StatRow label="Persil lahan" value={formatNumber(stats.totalPersilLahan)} big />
          <StatRow label="Total luas" value={formatAreaHa(stats.totalLuasLahan)} big icon={Ruler} />
        </ThemeCard>

        <ThemeCard
          title="Pelatihan"
          subtitle="Petani yang pernah mengikuti paket · % dari total petani"
          icon={BookOpen}
          iconClass="text-muted-foreground"
          className="md:col-span-2"
        >
          <ul className="space-y-2.5">
            {trainingRows.map((t) => {
              const pct = pctOf(t.value, totalPetani);
              return (
                <li key={t.label} className="grid grid-cols-[minmax(0,11rem)_minmax(0,1fr)_auto] items-center gap-3 text-sm">
                  <span className="truncate text-muted-foreground" title={t.label}>{t.label}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
                    <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.min(pct ?? 0, 100)}%` }} />
                  </span>
                  <span className="whitespace-nowrap tabular-nums">
                    <strong>{formatNumber(t.value)}</strong>
                    <span className="text-xs text-muted-foreground"> petani{pct != null && ` · ${pct}%`}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </ThemeCard>
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

/** Kartu tematik Dashboard Main (#420). */
function ThemeCard({
  title,
  subtitle,
  icon: Icon,
  iconClass,
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn("shadow-sm border border-border/60", className)}>
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div>
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</CardTitle>
          {subtitle && <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>}
        </div>
        <Icon className={cn("h-4 w-4 shrink-0", iconClass)} />
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/**
 * Satu angka di kartu tematik. Dengan `onClick` (Lembaga/KT/sertifikasi, #206)
 * baris jadi tombol yang membuka dialog rincian — afordansi panah saat hover.
 */
function StatRow({
  label,
  value,
  sub,
  onClick,
  big,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  onClick?: () => void;
  big?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const body = (
    <>
      <span className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
        <span className="truncate">{label}</span>
      </span>
      <span className="flex items-baseline gap-1.5 whitespace-nowrap">
        <span className={cn("font-bold tabular-nums", big ? "text-2xl" : "text-base")}>{value}</span>
        {sub && <span className="text-xs text-muted-foreground tabular-nums">· {sub}</span>}
        {onClick && (
          <ArrowUpRight className="h-3.5 w-3.5 self-center text-muted-foreground opacity-40 transition-opacity group-hover/stat:opacity-100" />
        )}
      </span>
    </>
  );
  const cls = "flex w-full items-center justify-between gap-3 py-1.5";
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      className={cn(cls, "group/stat -mx-2 rounded-md px-2 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring")}
      style={{ width: "calc(100% + 1rem)" }}
    >
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
}
