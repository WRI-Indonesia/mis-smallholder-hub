"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Loader2,
  Map as MapIcon,
  Pencil,
  Printer,
  BookOpen,
  TrendingUp,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FarmerFormModal } from "../farmer-form-modal";
import { BreadcrumbOverride } from "@/components/layout/admin/breadcrumb-override";
import { getFarmerParcelPassport } from "@/server/actions/farmer";
import { maskNik, maskBirthDate } from "@/lib/mask";
import type { FarmerDetailData } from "@/lib/farmer-detail";
import type { DistributionMapParcel } from "@/components/shared/parcels-distribution-map";

const ParcelsDistributionMap = dynamic(
  () =>
    import("@/components/shared/parcels-distribution-map").then((m) => m.ParcelsDistributionMap),
  {
    ssr: false,
    loading: () => <div className="h-[768px] rounded-md border bg-muted/30 animate-pulse" />,
  },
);

interface FarmerProfile {
  id: string;
  farmerGroupId: string;
  gender: "M" | "F";
  name: string;
  farmerId: string;
  nik: string | null;
  address: string | null;
  birthPlace: string | null;
  birthDate: Date | null;
  joinedYear: number | null;
  isActive: boolean;
  createdAt: Date;
  modifiedAt: Date;
  farmerGroup: { id: string; name: string; district: { name: string } };
}

interface ParcelRow {
  id: string;
  parcelId: string;
  area: number | null;
  subGroupLv1: string | null;
  subGroupLv2: string | null;
  blok: string | null;
  plantingYear: number | null;
  cropType: string | null;
  landStatus: string | null;
  revision: number;
}

interface Props {
  farmer: FarmerProfile;
  detail: FarmerDetailData;
  parcels: ParcelRow[];
  mapParcels: DistributionMapParcel[];
  canEdit: boolean;
  farmerGroups: { id: string; name: string }[];
}

const formatNumber = (n: number) => new Intl.NumberFormat("id-ID").format(n);
const formatDecimal = (n: number) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const formatDate = (d: Date | null) =>
  d
    ? new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(
        new Date(d),
      )
    : "—";

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];
const formatPeriod = (period: string) => {
  const m = parseInt(period.slice(5, 7), 10);
  return `${MONTH_LABELS[m - 1] ?? period.slice(5, 7)} ${period.slice(0, 4)}`;
};

// Umur dalam tahun dari tanggal lahir; null bila tak diketahui.
function ageFrom(birthDate: Date | null): number | null {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const beforeBirthday =
    now.getMonth() < b.getMonth() ||
    (now.getMonth() === b.getMonth() && now.getDate() < b.getDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 ? age : null;
}

// Placeholder avatar inisial (TD-017 — field foto petani pending).
function AvatarPlaceholder({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <div className="h-14 w-14 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-bold">
      {initials || "?"}
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  title,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  sub?: React.ReactNode;
}) {
  return (
    <Card className="h-full">
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
    </Card>
  );
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

export function FarmerDetailClient({
  farmer,
  detail,
  parcels,
  mapParcels,
  canEdit,
  farmerGroups,
}: Props) {
  const [showEdit, setShowEdit] = useState(false);
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);
  const { summary, subGroups, pelatihan, produksi } = detail;

  const toggleYear = (year: number) =>
    setExpandedYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });

  // Persen Record = kelengkapan pelaporan bulanan (lahan×bulan melapor ÷
  // total persil × 12 — mandatory min. 1 panen/bulan per lahan).
  const pctOf = (part: number, total: number) =>
    total > 0 ? ` (${formatDecimal((part / total) * 100)}%)` : "";

  const age = ageFrom(farmer.birthDate);

  // Unduh PDF "Profil Lahan" (Farm Passport #134) via action ber-guard menu petani.
  const downloadPassport = async (parcelDbId: string) => {
    if (pdfLoadingId) return;
    setPdfLoadingId(parcelDbId);
    try {
      const res = await getFarmerParcelPassport(parcelDbId);
      if (!res.success || !res.data) {
        toast.error(res.success ? "Data tidak ditemukan" : res.error);
        return;
      }
      const { generateFarmPassportPdf } = await import("@/lib/farm-passport");
      generateFarmPassportPdf(res.data);
    } catch {
      toast.error("Gagal membuat PDF profil lahan");
    } finally {
      setPdfLoadingId(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb: tampilkan ID Petani, bukan CUID URL */}
      <BreadcrumbOverride label={farmer.farmerId} />
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/master-data/farmers">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <AvatarPlaceholder name={farmer.name} />
          <div>
            <h1 className="text-2xl font-bold">{farmer.name}</h1>
            <p className="text-muted-foreground font-mono text-sm">{farmer.farmerId}</p>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <Badge variant="secondary">{farmer.gender === "M" ? "Laki-laki" : "Perempuan"}</Badge>
              <Link href={`/admin/master-data/groups/${farmer.farmerGroup.id}`}>
                <Badge variant="default" className="hover:opacity-80">
                  {farmer.farmerGroup.name}
                </Badge>
              </Link>
              {subGroups.gapoktan.map((g) => (
                <Badge key={`g-${g}`} variant="outline">
                  {g}
                </Badge>
              ))}
              {subGroups.kelompokTani.map((kt) => (
                <Badge key={`kt-${kt}`} variant="outline">
                  {kt}
                </Badge>
              ))}
              <Badge variant={farmer.isActive ? "default" : "outline"}>
                {farmer.isActive ? "Aktif" : "Nonaktif"}
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
          icon={MapIcon}
          title="Lahan"
          value={`${formatNumber(summary.totalParcels)} persil`}
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
          icon={BookOpen}
          title="Pelatihan"
          value={`${formatNumber(summary.packagesDone)}/${formatNumber(summary.packagesTotal)} paket`}
          sub={
            summary.packagesDone === summary.packagesTotal
              ? "Semua paket diikuti"
              : "Belum semua paket"
          }
        />
        <SummaryCard
          icon={ClipboardCheck}
          title="Kelengkapan Profil"
          value={`${formatNumber(summary.profile.complete)}/${formatNumber(summary.profile.total)}`}
          sub={
            summary.profile.missing.length > 0
              ? `Belum: ${summary.profile.missing.join(", ")}`
              : "Lengkap"
          }
        />
        <SummaryCard
          icon={TrendingUp}
          title="Produktivitas Terakhir"
          value={
            summary.lastProductivity
              ? `${formatDecimal(summary.lastProductivity.tonHa)} Ton/Ha`
              : "—"
          }
          sub={
            summary.lastProductivity ? `tahun ${summary.lastProductivity.year}` : "Belum ada data"
          }
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="ringkasan" className="w-full">
        <TabsList className="grid w-full max-w-[480px] grid-cols-4 mb-4">
          <TabsTrigger value="ringkasan">Ringkasan</TabsTrigger>
          <TabsTrigger value="lahan">Lahan</TabsTrigger>
          <TabsTrigger value="pelatihan">Pelatihan</TabsTrigger>
          <TabsTrigger value="produksi">Produksi</TabsTrigger>
        </TabsList>

        {/* ── Ringkasan ── */}
        <TabsContent value="ringkasan">
          <Card className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <FieldItem label="Lembaga Petani">
                <Link
                  href={`/admin/master-data/groups/${farmer.farmerGroup.id}`}
                  className="text-primary hover:underline"
                >
                  {farmer.farmerGroup.name}
                </Link>
              </FieldItem>
              <FieldItem label="Distrik">{farmer.farmerGroup.district.name}</FieldItem>
              <FieldItem label="Jenis Kelamin">
                <Badge variant="secondary">
                  {farmer.gender === "M" ? "Laki-laki" : "Perempuan"}
                </Badge>
              </FieldItem>
              <FieldItem label="NIK">
                <span className="font-mono text-muted-foreground">{maskNik(farmer.nik)}</span>
              </FieldItem>
              <FieldItem label="Tempat, Tanggal Lahir">
                {farmer.birthPlace ?? "—"}, {maskBirthDate(farmer.birthDate)}
                {age != null && <span className="text-muted-foreground"> ({age} th)</span>}
              </FieldItem>
              <FieldItem label="Tahun Bergabung">{farmer.joinedYear ?? "—"}</FieldItem>
              <FieldItem label="Alamat">{farmer.address ?? "—"}</FieldItem>
              <FieldItem label="Dibuat">{formatDate(farmer.createdAt)}</FieldItem>
              <FieldItem label="Terakhir Diubah">{formatDate(farmer.modifiedAt)}</FieldItem>
            </div>
          </Card>
        </TabsContent>

        {/* ── Lahan: tabel persil + PDF + peta ── */}
        <TabsContent value="lahan" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Daftar Lahan ({formatNumber(parcels.length)})
            </h2>
            {parcels.length === 0 ? (
              <p className="text-sm text-muted-foreground">Petani ini belum memiliki lahan.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="py-2 pr-4">Kode Lahan</th>
                      <th className="py-2 pr-4">Kelompok Tani</th>
                      <th className="py-2 pr-4">Gapoktan/KUD</th>
                      <th className="py-2 pr-4">Blok</th>
                      <th className="py-2 pr-4 text-right">Luas (Ha)</th>
                      <th className="py-2 pr-4 text-right">Tahun Tanam</th>
                      <th className="py-2 pr-4 text-right">Revisi</th>
                      <th className="py-2 text-right">Profil Lahan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parcels.map((p) => (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-mono">{p.parcelId}</td>
                        <td className="py-2 pr-4">{p.subGroupLv2 ?? "—"}</td>
                        <td className="py-2 pr-4">{p.subGroupLv1 ?? "—"}</td>
                        <td className="py-2 pr-4">{p.blok ?? "—"}</td>
                        <td className="py-2 pr-4 text-right tabular-nums">
                          {p.area != null ? formatDecimal(p.area) : "—"}
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums">
                          {p.plantingYear ?? "—"}
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums">{p.revision}</td>
                        <td className="py-2 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1.5"
                            disabled={pdfLoadingId != null}
                            onClick={() => downloadPassport(p.id)}
                          >
                            {pdfLoadingId === p.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Printer className="h-3.5 w-3.5" />
                            )}
                            PDF
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Sebaran Lahan
            </h2>
            <ParcelsDistributionMap parcels={mapParcels} />
          </Card>
        </TabsContent>

        {/* ── Pelatihan: checklist paket + riwayat ── */}
        <TabsContent value="pelatihan" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Paket Wajib
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {pelatihan.checklist.map((c) => (
                <div
                  key={c.code}
                  className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  {c.done ? (
                    <Check className="h-4 w-4 shrink-0 text-green-600" />
                  ) : (
                    <X className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="flex-1">{c.label}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {c.done ? `${formatNumber(c.participations)}×` : "Belum"}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Riwayat Partisipasi ({formatNumber(pelatihan.history.length)})
            </h2>
            {pelatihan.history.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum pernah mengikuti pelatihan.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="py-2 pr-4">Tanggal</th>
                      <th className="py-2 pr-4">Paket</th>
                      <th className="py-2 pr-4">Lokasi</th>
                      <th className="py-2 text-right">Pre → Post Test</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pelatihan.history.map((h) => (
                      <tr key={h.id} className="border-b last:border-0">
                        <td className="py-2 pr-4 whitespace-nowrap">
                          {formatDate(h.trainingDate)}
                        </td>
                        <td className="py-2 pr-4">{h.packageName}</td>
                        <td className="py-2 pr-4">{h.location ?? "—"}</td>
                        <td className="py-2 text-right tabular-nums">
                          {h.preTestScore != null || h.postTestScore != null
                            ? `${h.preTestScore ?? "—"} → ${h.postTestScore ?? "—"}`
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
          <Card className="p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Produksi per Tahun
            </h2>
            {produksi.perYear.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Belum ada data produksi untuk petani ini.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="py-2 pr-4">Tahun</th>
                      <th className="py-2 pr-4 text-right">Produksi (kg)</th>
                      <th className="py-2 pr-4 text-right">Record</th>
                      <th className="py-2 pr-4 text-right">Lahan Melapor</th>
                      <th className="py-2 pr-4 text-right">Luas Melapor (Ha)</th>
                      <th className="py-2 text-right">Produktivitas (Ton/Ha)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {produksi.perYear.map((y) => {
                      const expanded = expandedYears.has(y.year);
                      return [
                        <tr
                          key={y.year}
                          className="border-b last:border-0 cursor-pointer hover:bg-muted/40"
                          onClick={() => toggleYear(y.year)}
                        >
                          <td className="py-2 pr-4 font-medium tabular-nums">
                            <span className="inline-flex items-center gap-1">
                              {expanded ? (
                                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                              )}
                              {y.year}
                            </span>
                          </td>
                          <td className="py-2 pr-4 text-right tabular-nums">
                            {formatDecimal(y.totalKg)}
                          </td>
                          <td className="py-2 pr-4 text-right tabular-nums">
                            {formatNumber(y.recordCount)}
                            {pctOf(y.reportedParcelMonths, summary.totalParcels * 12)}
                          </td>
                          <td className="py-2 pr-4 text-right tabular-nums">
                            {formatNumber(y.parcelsReporting)}
                            {pctOf(y.parcelsReporting, summary.totalParcels)}
                          </td>
                          <td className="py-2 pr-4 text-right tabular-nums">
                            {formatDecimal(y.areaReporting)}
                            {pctOf(y.areaReporting, summary.totalArea)}
                          </td>
                          <td className="py-2 text-right tabular-nums">
                            {formatDecimal(y.productivityTonHa)}
                          </td>
                        </tr>,
                        ...(expanded
                          ? y.months.map((m) => (
                              <tr
                                key={m.period}
                                className="border-b last:border-0 bg-muted/30 text-muted-foreground"
                              >
                                <td className="py-1.5 pr-4 pl-6 text-xs">
                                  {formatPeriod(m.period)}
                                </td>
                                <td className="py-1.5 pr-4 text-right tabular-nums text-xs">
                                  {formatDecimal(m.totalKg)}
                                </td>
                                <td className="py-1.5 pr-4 text-right tabular-nums text-xs">
                                  {formatNumber(m.recordCount)}
                                </td>
                                <td className="py-1.5 pr-4 text-right tabular-nums text-xs">
                                  {formatNumber(m.parcelsReporting)}
                                </td>
                                <td className="py-1.5 pr-4 text-right tabular-nums text-xs">
                                  {formatDecimal(m.areaReporting)}
                                </td>
                                <td className="py-1.5 text-right text-xs">—</td>
                              </tr>
                            ))
                          : []),
                      ];
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-3">
              Produktivitas = Σ produksi tahun tsb ÷ Σ luas lahan yang melapor pada tahun tsb
              (Ton/Ha). Record tanpa lahan masuk total produksi, tidak menambah luas pelapor.
              Persentase Record = kelengkapan pelaporan bulanan (pasangan lahan×bulan yang melapor ÷
              total persil × 12 bulan — pelaporan wajib min. 1 panen per bulan per lahan);
              Lahan/Luas Melapor terhadap total persil/luas milik petani.
            </p>
          </Card>

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
              </Link>{" "}
              dan{" "}
              <Link href="/admin/report/production" className="text-primary hover:underline">
                Report Produksi
              </Link>
              .
            </p>
          </Card>
        </TabsContent>
      </Tabs>

      {canEdit && (
        <FarmerFormModal
          key={farmer.id}
          open={showEdit}
          onClose={() => setShowEdit(false)}
          farmer={farmer}
          farmerGroups={farmerGroups}
        />
      )}
    </div>
  );
}
