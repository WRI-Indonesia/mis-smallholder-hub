"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowLeft,
  Pencil,
  Users,
  Network,
  Map as MapIcon,
  TrendingUp,
  ClipboardCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GroupFormModal } from "../group-form-modal";
import { BreadcrumbOverride } from "@/components/layout/admin/breadcrumb-override";
import { ProductionMonthlyMatrix } from "@/components/shared/production-monthly-matrix";
import { formatGroupType, formatCertStatus } from "@/lib/farmer-group-labels";
import type { FarmerGroupDetailData } from "@/lib/farmer-group-detail";
import type { DistributionMapParcel } from "@/components/shared/parcels-distribution-map";
import { formatNumber } from "@/lib/format";
import { toast } from "sonner";
import { ParcelExportMenu } from "@/components/shared/parcel-export-menu";
import { getFarmerGroupParcelExportData } from "@/server/actions/land-parcel-export";
import { parcelExportFileBase, type ParcelExportFormat } from "@/lib/parcel-export-data";
import { downloadParcelExport } from "@/lib/parcel-spatial-download";

const ParcelsDistributionMap = dynamic(
  () =>
    import("@/components/shared/parcels-distribution-map").then((m) => m.ParcelsDistributionMap),
  {
    ssr: false,
    loading: () => <div className="h-[768px] rounded-md border bg-muted/30 animate-pulse" />,
  },
);

interface GroupRow {
  id: string;
  code: string | null;
  abrv: string | null;
  abrv3id: string | null;
  name: string;
  category: string;
  groupType: string | null;
  districtId: string;
  district: { id: string; name: string };
  joinYear: number | null;
  establishedYear: number | null;
  rspoCertYear: number | null;
  rspoCertStatus: string | null;
  ispoCertYear: number | null;
  ispoCertStatus: string | null;
  sapMapAssuranceYear: number | null;
  sapMapAssuranceStatus: string | null;
  locationLat: number | null;
  locationLong: number | null;
  isActive: boolean;
  createdAt: Date;
  modifiedAt: Date;
}

interface Props {
  group: GroupRow;
  detail: FarmerGroupDetailData;
  completeness: { healthScore: number; totalAnomalies: number };
  mapParcels: DistributionMapParcel[];
  canEdit: boolean;
  districts: { id: string; name: string }[];
  canViewParcel: boolean;
  canEditParcel: boolean;
  /** EXPORT menu Lembaga Petani — gate tombol "Unduh Lahan" (#313). */
  canExportParcels: boolean;
}

const formatDecimal = (n: number) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const formatDate = (d: Date) =>
  new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(d),
  );

// Badge sertifikasi — pola info panel Main Dashboard (#169).
function CertBadge({
  scheme,
  year,
  status,
}: {
  scheme: string;
  year: number | null;
  status: string | null;
}) {
  if (!status) return null;
  return (
    <Badge
      variant={status === "CERTIFIED" ? "default" : "outline"}
      className="text-[10px] px-1.5 py-0"
    >
      {scheme} {formatCertStatus(year, status)}
    </Badge>
  );
}

function SummaryCard({
  icon: Icon,
  title,
  value,
  sub,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  sub?: React.ReactNode;
  href?: string;
}) {
  const body = (
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {title}
        </p>
        <Icon className="h-4 w-4 shrink-0 text-primary" />
      </div>
      <h3 className="text-xl font-bold mt-1.5 tabular-nums">{value}</h3>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </CardContent>
  );
  if (href) {
    return (
      <Link href={href}>
        <Card className="h-full transition-colors hover:bg-muted/40">{body}</Card>
      </Link>
    );
  }
  return <Card className="h-full">{body}</Card>;
}

function FieldItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="text-sm font-medium mt-1">{children}</div>
    </div>
  );
}

const AVAILABILITY_META: {
  key: "BAIK" | "CUKUP" | "KURANG" | "NONE";
  label: string;
  className: string;
}[] = [
  { key: "BAIK", label: "Baik (>24 bln)", className: "bg-green-100 text-green-800" },
  { key: "CUKUP", label: "Cukup (12–24 bln)", className: "bg-lime-100 text-lime-800" },
  { key: "KURANG", label: "Kurang (<12 bln)", className: "bg-amber-100 text-amber-800" },
  { key: "NONE", label: "Tanpa Data", className: "bg-slate-100 text-slate-600" },
];

export function GroupDetailClient({
  group,
  detail,
  completeness,
  mapParcels,
  canEdit,
  districts,
  canViewParcel,
  canEditParcel,
  canExportParcels,
}: Props) {
  const [showEdit, setShowEdit] = useState(false);
  const { summary, struktur, pelatihan, produksi } = detail;

  // Unduh spasial lahan lembaga ini (#313) — action ber-guard mengembalikan
  // FeatureCollection beratribut lengkap; konversi format berjalan di client.
  const [exporting, setExporting] = useState(false);
  async function handleParcelExport(format: ParcelExportFormat) {
    if (exporting) return;
    setExporting(true);
    try {
      const res = await getFarmerGroupParcelExportData(group.id);
      if (!res.success || !res.data) {
        toast.error(res.success ? "Gagal menyiapkan data lahan" : res.error);
        return;
      }
      if (res.data.count === 0) {
        toast.info("Tidak ada lahan ber-poligon pada Lembaga ini");
        return;
      }
      await downloadParcelExport(format, res.data.fc, parcelExportFileBase(res.data.label, new Date()));
      toast.success(
        res.data.skipped > 0
          ? `${res.data.count} lahan diunduh (${res.data.skipped} dilewati — geometri tidak valid)`
          : `${res.data.count} lahan diunduh`
      );
    } catch {
      toast.error("Gagal membuat berkas unduhan lahan");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb: tampilkan nama Lembaga, bukan id URL */}
      <BreadcrumbOverride label={group.name} />
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/master-data/groups">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{group.name}</h1>
            <p className="text-muted-foreground font-mono text-sm">{group.code ?? "—"}</p>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <CertBadge scheme="RSPO" year={group.rspoCertYear} status={group.rspoCertStatus} />
              <CertBadge scheme="ISPO" year={group.ispoCertYear} status={group.ispoCertStatus} />
              <CertBadge
                scheme="SAP/MAP"
                year={group.sapMapAssuranceYear}
                status={group.sapMapAssuranceStatus}
              />
              <Badge variant={group.isActive ? "default" : "outline"}>
                {group.isActive ? "Aktif" : "Nonaktif"}
              </Badge>
            </div>
          </div>
        </div>
        {canEdit && (
          <Button size="sm" variant="outline" onClick={() => setShowEdit(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <SummaryCard
          icon={Users}
          title="Total Petani"
          value={formatNumber(summary.totalFarmers)}
          sub={`${formatNumber(summary.totalFarmersMale)} L · ${formatNumber(summary.totalFarmersFemale)} P`}
        />
        <SummaryCard
          icon={Network}
          title="Kelompok Tani"
          value={formatNumber(summary.kelompokTaniCount)}
          sub={`${formatNumber(summary.blokCount)} Blok`}
        />
        <SummaryCard
          icon={MapIcon}
          title="Persil Lahan"
          value={formatNumber(summary.totalParcels)}
          sub={`${formatDecimal(summary.totalArea)} Ha`}
        />
        <SummaryCard
          icon={TrendingUp}
          title="Produksi"
          value={`${formatDecimal(summary.productionTotalKg / 1000)} Ton`}
          sub={
            summary.productionYears.length > 0
              ? `${summary.productionYears.length} tahun ber-data (${summary.productionYears[0]}–${summary.productionYears[summary.productionYears.length - 1]})`
              : "Belum ada data"
          }
        />
        <SummaryCard
          icon={ClipboardCheck}
          title="Kelengkapan Data"
          value={`${Math.round(completeness.healthScore)}%`}
          sub={`${formatNumber(completeness.totalAnomalies)} anomali · lihat analisa →`}
          href="/admin/data-analyst/data-completeness"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="ringkasan" className="w-full">
        <TabsList className="grid w-full max-w-[560px] grid-cols-5 mb-4">
          <TabsTrigger value="ringkasan">Ringkasan</TabsTrigger>
          <TabsTrigger value="petani">Petani</TabsTrigger>
          <TabsTrigger value="lahan">Lahan</TabsTrigger>
          <TabsTrigger value="pelatihan">Pelatihan</TabsTrigger>
          <TabsTrigger value="produksi">Produksi</TabsTrigger>
        </TabsList>

        {/* ── Ringkasan: profil + struktur kelembagaan ── */}
        <TabsContent value="ringkasan" className="space-y-4">
          <Card className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <FieldItem label="Distrik">{group.district.name}</FieldItem>
              <FieldItem label="Kategori">
                <Badge variant="secondary">
                  {group.category === "EX_PLASMA" ? "Ex Plasma" : "Swadaya"}
                </Badge>
              </FieldItem>
              <FieldItem label="Tipe Grup">{formatGroupType(group.groupType)}</FieldItem>
              <FieldItem label="Singkatan">{group.abrv ?? "—"}</FieldItem>
              <FieldItem label="Tahun Berdiri Lembaga">{group.establishedYear ?? "—"}</FieldItem>
              <FieldItem label="Tahun Bergabung Program">{group.joinYear ?? "—"}</FieldItem>
              <FieldItem label="Sertifikasi RSPO">
                {formatCertStatus(group.rspoCertYear, group.rspoCertStatus)}
              </FieldItem>
              <FieldItem label="Sertifikasi ISPO">
                {formatCertStatus(group.ispoCertYear, group.ispoCertStatus)}
              </FieldItem>
              <FieldItem label="Assurance SAP/MAP">
                {formatCertStatus(group.sapMapAssuranceYear, group.sapMapAssuranceStatus)}
              </FieldItem>
              <FieldItem label="Koordinat">
                <span className="font-mono text-xs text-muted-foreground">
                  {group.locationLat != null && group.locationLong != null
                    ? `${group.locationLat}, ${group.locationLong}`
                    : "—"}
                </span>
              </FieldItem>
              <FieldItem label="Dibuat">{formatDate(group.createdAt)}</FieldItem>
              <FieldItem label="Terakhir Diubah">{formatDate(group.modifiedAt)}</FieldItem>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Struktur Kelembagaan (dari lahan)
              </h2>
              <Link
                href="/admin/report/kelompok-tani-detail"
                className="text-sm text-primary hover:underline"
              >
                Lihat roster lengkap →
              </Link>
            </div>
            {struktur.kelompokTaniList.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Belum ada data Kelompok Tani dari lahan.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="py-2 pr-4">Kelompok Tani</th>
                      <th className="py-2 pr-4 text-right">Petani</th>
                      <th className="py-2 pr-4 text-right">Lahan</th>
                      <th className="py-2 text-right">Luas (Ha)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {struktur.kelompokTaniList.map((kt) => (
                      <tr
                        key={kt.kelompokTani ?? "-"}
                        className="border-b last:border-0"
                      >
                        <td className="py-2 pr-4">
                          {kt.kelompokTani ?? (
                            <span className="text-muted-foreground">(tidak diketahui)</span>
                          )}
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums">
                          {formatNumber(kt.totalPetani)}
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums">
                          {formatNumber(kt.totalLahan)}
                        </td>
                        <td className="py-2 text-right tabular-nums">
                          {formatDecimal(kt.totalLuas)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ── Petani (ringkas — Fase 2 pending) ── */}
        <TabsContent value="petani" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SummaryCard
              icon={Users}
              title="Total Petani"
              value={formatNumber(summary.totalFarmers)}
            />
            <SummaryCard
              icon={Users}
              title="Laki-laki / Perempuan"
              value={`${formatNumber(summary.totalFarmersMale)} / ${formatNumber(summary.totalFarmersFemale)}`}
            />
            <SummaryCard
              icon={Users}
              title="Petani Tanpa Lahan"
              value={formatNumber(summary.farmersWithoutParcel)}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Detail per petani ada di{" "}
            <Link href="/admin/master-data/farmers" className="text-primary hover:underline">
              Master Data Petani
            </Link>{" "}
            dan{" "}
            <Link
              href="/admin/data-analyst/farmer-summary"
              className="text-primary hover:underline"
            >
              Ringkasan Petani
            </Link>
            . Analisa mendalam (pertumbuhan keanggotaan per tahun) menyusul setelah data memadai.
          </p>
        </TabsContent>

        {/* ── Lahan (ringkas — Fase 2 pending) ── */}
        <TabsContent value="lahan" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SummaryCard
              icon={MapIcon}
              title="Persil Lahan"
              value={formatNumber(summary.totalParcels)}
              sub={`${formatDecimal(summary.totalArea)} Ha`}
            />
            <SummaryCard
              icon={Network}
              title="Kelompok Tani"
              value={formatNumber(summary.kelompokTaniCount)}
            />
            <SummaryCard icon={MapIcon} title="Blok" value={formatNumber(summary.blokCount)} />
          </div>
          <Card className="p-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Sebaran Lahan
              </h2>
              {/* Unduh lahan lembaga ini sebagai SHP/GeoJSON/KML (#313) —
                  cakupannya sudah pasti satu Lembaga, jadi tak perlu filter. */}
              {canExportParcels && (
                <ParcelExportMenu
                  disabled={mapParcels.length === 0}
                  disabledReason="Lembaga ini belum punya lahan ber-poligon"
                  exporting={exporting}
                  onExport={handleParcelExport}
                />
              )}
            </div>
            <ParcelsDistributionMap parcels={mapParcels} canViewParcel={canViewParcel} canEditParcel={canEditParcel} />
          </Card>
          <p className="text-sm text-muted-foreground">
            Detail per lahan ada di{" "}
            <Link href="/admin/master-data/parcels" className="text-primary hover:underline">
              Master Data Lahan
            </Link>{" "}
            dan{" "}
            <Link href="/admin/map/parcel" className="text-primary hover:underline">
              Peta Lahan
            </Link>
            . Analisa mendalam (distribusi umur tanam) menyusul setelah data memadai.
          </p>
        </TabsContent>

        {/* ── Pelatihan ── */}
        <TabsContent value="pelatihan" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Cakupan per Paket
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 pr-4">Paket</th>
                    <th className="py-2 pr-4 text-right">Petani Terlatih</th>
                    <th className="py-2 pr-4 text-right">Cakupan</th>
                    <th className="py-2 pr-4 text-right">Rataan Pre Test</th>
                    <th className="py-2 text-right">Rataan Post Test</th>
                  </tr>
                </thead>
                <tbody>
                  {pelatihan.coverage.map((c) => (
                    <tr key={c.code} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">{c.label}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">
                        {formatNumber(c.covered)}/{formatNumber(c.totalFarmers)}
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums">
                        {formatDecimal(c.coveragePct)}%
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums">
                        {c.avgPreTest != null ? formatDecimal(c.avgPreTest) : "—"}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {c.avgPostTest != null ? formatDecimal(c.avgPostTest) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Aktivitas Pelatihan ({formatNumber(pelatihan.activities.length)})
            </h2>
            {pelatihan.activities.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Belum ada aktivitas pelatihan untuk Lembaga ini.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="py-2 pr-4">Tanggal</th>
                      <th className="py-2 pr-4">Paket</th>
                      <th className="py-2 pr-4">Lokasi</th>
                      <th className="py-2 pr-4 text-right">Peserta</th>
                      <th className="py-2 text-right">Rata-rata Pre → Post</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pelatihan.activities.map((a) => (
                      <tr key={a.id} className="border-b last:border-0">
                        <td className="py-2 pr-4 whitespace-nowrap">
                          {formatDate(a.trainingDate)}
                        </td>
                        <td className="py-2 pr-4">{a.packageLabel}</td>
                        <td className="py-2 pr-4">{a.location ?? "—"}</td>
                        <td className="py-2 pr-4 text-right tabular-nums">
                          {formatNumber(a.participantCount)}
                        </td>
                        <td className="py-2 text-right tabular-nums">
                          {a.avgPreTest != null || a.avgPostTest != null
                            ? `${a.avgPreTest ?? "—"} → ${a.avgPostTest ?? "—"}`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ── Produksi ── */}
        <TabsContent value="produksi" className="space-y-4">
          <ProductionMonthlyMatrix
            all={produksi.all}
            exclude={produksi.exclude}
            scopeLabel="Lembaga"
            emptyMessage="Belum ada data produksi untuk Lembaga ini."
            tonDecimals={0}
            currentYear={produksi.currentYear}
          />

          <Card className="p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Ketersediaan Data Produksi per Lahan
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {AVAILABILITY_META.map((m) => (
                <div key={m.key} className={`rounded-lg px-3 py-2 ${m.className}`}>
                  <p className="text-xs font-medium">{m.label}</p>
                  <p className="text-lg font-bold tabular-nums">
                    {formatNumber(produksi.availability[m.key])} lahan
                  </p>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              Kategori dari run bulan berturut-turut (aturan Peta BMP). Lihat juga{" "}
              <Link href="/admin/map/bmp" className="text-primary hover:underline">
                Peta BMP
              </Link>
              ,{" "}
              <Link href="/admin/report/production" className="text-primary hover:underline">
                Report Produksi
              </Link>
              , dan{" "}
              <Link href="/admin/dashboard/bmp" className="text-primary hover:underline">
                BMP Dashboard
              </Link>
              .
            </p>
          </Card>
        </TabsContent>
      </Tabs>

      {canEdit && (
        <GroupFormModal
          key={group.id}
          open={showEdit}
          onClose={() => setShowEdit(false)}
          group={group}
          districts={districts}
        />
      )}
    </div>
  );
}
