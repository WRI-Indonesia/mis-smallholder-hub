"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ClipboardCheck,
  ExternalLink,
  LandPlot,
  Loader2,
  Pencil,
  Printer,
  Ruler,
  ShieldCheck,
  Sprout,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BreadcrumbOverride } from "@/components/layout/admin/breadcrumb-override";
import { deleteLandParcel, getLandParcelPassport } from "@/server/actions/land-parcel";
import { ParcelFormModal } from "../components/parcel-form-modal";
import { ParcelMapView } from "../components/parcel-map-view";
import { ParcelProductionChart } from "../components/parcel-production-chart";
import { ParcelProductionMonthModal } from "../components/parcel-production-month-modal";
import { ParcelLegalSection } from "../components/parcel-legal-section";

import type { Geometry, Position } from "geojson";
import type { LandParcel, FarmerSelect, LandParcelSatellites } from "@/types/land-parcel";
import type { ProductionSummary, ProductionYear } from "@/types/map";
import type { ParcelTreeData } from "@/server/actions/tree";
import { formatNumber } from "@/lib/format";

/** Lahan aktif lain milik petani yang sama (tabel navigasi + overlay peta). */
export interface SiblingParcel {
  id: string;
  parcelId: string;
  geometry?: Geometry | string | null;
  area: number | null;
  plantingYear: number | null;
  treeCount: number;
}

interface Props {
  parcel: LandParcel;
  production: ProductionSummary | null;
  trees: ParcelTreeData | null;
  farmers: FarmerSelect[];
  permissions: string[];
  /** Permission user pada menu Data Produksi — gate edit sel tabel produksi. */
  productionPermissions: string[];
  siblingParcels: SiblingParcel[];
  /** Satelit lahan (#296) — null bila lahan di luar scope (tak seharusnya terjadi: page sudah 404). */
  satellites: LandParcelSatellites | null;
}

const formatDecimal = (n: number) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const formatDate = (d: Date | undefined) =>
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

// Geometry dari Prisma bisa berupa objek GeoJSON atau string JSON (legacy).
function parseGeometry(geometry: LandParcel["geometry"]): Geometry | null {
  if (!geometry) return null;
  if (typeof geometry === "string") {
    try {
      return JSON.parse(geometry);
    } catch {
      return null;
    }
  }
  return geometry;
}

// Titik pusat sederhana (rata-rata ring terluar) untuk info koordinat + link
// Google Maps; cukup akurat untuk navigasi lapangan, tanpa menarik turf.
function centroidOf(geometry: Geometry | null): { lat: number; lng: number } | null {
  if (!geometry || !("coordinates" in geometry)) return null;
  let coords: unknown = geometry.coordinates;
  if (geometry.type === "Polygon") coords = geometry.coordinates[0];
  else if (geometry.type === "MultiPolygon") coords = geometry.coordinates[0]?.[0];
  if (!Array.isArray(coords)) return null;

  let sumLng = 0;
  let sumLat = 0;
  let count = 0;
  for (const c of coords as Position[]) {
    if (Array.isArray(c) && c.length >= 2 && c[0] !== null && c[1] !== null) {
      sumLng += c[0];
      sumLat += c[1];
      count++;
    }
  }
  return count > 0 ? { lat: sumLat / count, lng: sumLng / count } : null;
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

// Label kecil sentence-case (redesign #298): satu tingkat label di bawah judul tab,
// tanpa uppercase/tracking agar hierarki tidak bertumpuk.
function FieldItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="text-sm font-medium mt-0.5">{children}</div>
    </div>
  );
}

// Nilai atribut: tampilkan "Belum diisi" (bukan "—") agar jelas datanya kosong.
function Val({ value, mono = false }: { value: string | number | null | undefined; mono?: boolean }) {
  if (value === null || value === undefined || value === "") {
    return <span className="italic font-normal text-muted-foreground">Belum diisi</span>;
  }
  // break-all: ID mono panjang boleh wrap, jangan overflow dari kolom sempit.
  return <span className={mono ? "font-mono break-all" : undefined}>{value}</span>;
}

export function ParcelDetailClient({
  parcel,
  production,
  trees,
  farmers,
  permissions,
  productionPermissions,
  siblingParcels,
  satellites,
}: Props) {
  const [showForm, setShowForm] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [monthModal, setMonthModal] = useState<{ period: string; title: string } | null>(null);
  const router = useRouter();

  const canEdit = permissions.includes("EDIT");
  const canDelete = permissions.includes("DELETE");
  const canPrint = permissions.includes("PRINT");
  const canEditProduction =
    productionPermissions.includes("CREATE") || productionPermissions.includes("EDIT");

  const geometry = parseGeometry(parcel.geometry);
  const center = centroidOf(geometry);

  const now = new Date();
  const currentYear = now.getFullYear();
  const nowMonthIdx = now.getMonth();
  const plantAge = parcel.plantingYear != null ? currentYear - parcel.plantingYear : null;

  // Kelengkapan atribut lahan — sub kartu menyebut yang belum diisi.
  const attributes: { label: string; filled: boolean }[] = [
    { label: "Blok", filled: parcel.blok != null && parcel.blok !== "" },
    { label: "Luas", filled: parcel.area != null },
    { label: "Status Kepemilikan", filled: parcel.landStatus != null && parcel.landStatus !== "" },
    { label: "Komoditas", filled: parcel.cropType != null && parcel.cropType !== "" },
    { label: "Species", filled: parcel.species != null && parcel.species !== "" },
    { label: "Tahun Tanam", filled: parcel.plantingYear != null },
    { label: "Kelompok Tani", filled: parcel.subGroupLv2 != null && parcel.subGroupLv2 !== "" },
    { label: "Geometri (peta)", filled: geometry != null },
    // Legalitas ikut dihitung (#298): lahan tanpa surat sama "belum lengkap"-nya dengan tanpa luas.
    { label: "Surat kepemilikan", filled: (satellites?.documents.length ?? 0) > 0 },
  ];
  const docCount = satellites?.documents.length ?? 0;
  const stdbCount = satellites?.stdbs.length ?? 0;
  const vendorCount = satellites?.externalIds.length ?? 0;
  const programCount = satellites?.programs.length ?? 0;
  const legalCount = docCount + stdbCount + vendorCount + programCount;
  // Jenis surat unik (akronim) untuk nilai kartu, mis. "SHM · SKT".
  const docTypes = [...new Set((satellites?.documents ?? []).map((d) => (d.type === "OTHER" && !d.typeRaw ? "?" : d.type)))];
  const legalValue =
    docCount === 0 && stdbCount === 0
      ? "—"
      : [docTypes.length ? docTypes.map((t) => (t === "?" ? "Lainnya" : t)).join(" · ") : null, stdbCount > 0 ? "STDB" : null]
          .filter(Boolean)
          .join(" + ");
  const legalSub =
    legalCount === 0
      ? "Belum ada surat / STDB"
      : [
          `${formatNumber(docCount)} surat`,
          `${formatNumber(stdbCount)} STDB`,
          vendorCount > 0 ? `${formatNumber(vendorCount)} kode vendor` : null,
          programCount > 0 ? `${formatNumber(programCount)} program` : null,
        ]
          .filter(Boolean)
          .join(" · ");
  const treeCount = trees != null && trees.summary.count > 0 ? trees.summary.count : 0;
  const filledCount = attributes.filter((a) => a.filled).length;
  const missingLabels = attributes.filter((a) => !a.filled).map((a) => a.label);

  const hasProdData = production != null && production.byYear.length > 0;
  const prodYears = production?.byYear.map((y) => y.year) ?? [];
  const prodYearRange =
    prodYears.length > 1
      ? `${prodYears[prodYears.length - 1]}–${prodYears[0]}`
      : (prodYears[0]?.toString() ?? "");

  // Baris tahun kontinu dari tahun ber-data pertama s.d. tahun berjalan (tahun
  // kosong tetap tampil agar bisa diisi lewat klik sel), urut terbaru dulu.
  const paddedYears = useMemo<ProductionYear[]>(() => {
    const byYearMap = new Map((production?.byYear ?? []).map((y) => [y.year, y]));
    const dataYears = [...byYearMap.keys()];
    const minYear = dataYears.length > 0 ? Math.min(...dataYears) : currentYear;
    const maxYear = Math.max(currentYear, ...dataYears);
    const rows: ProductionYear[] = [];
    for (let y = maxYear; y >= minYear; y--) {
      rows.push(byYearMap.get(y) ?? { year: y, monthly: new Array(12).fill(0), total: 0 });
    }
    return rows;
  }, [production, currentYear]);

  async function handleDelete() {
    if (!confirm("Apakah Anda yakin ingin menonaktifkan lahan ini?")) return;

    const result = await deleteLandParcel(parcel.id);
    if (result.success) {
      toast.success("Lahan berhasil dinonaktifkan");
      router.push("/admin/master-data/parcels");
      router.refresh();
    } else {
      toast.error(typeof result.error === "string" ? result.error : "Gagal menonaktifkan lahan");
    }
  }

  // Unduh PDF "Profil Lahan" (Farm Passport) via action ber-guard menu Lahan.
  async function downloadPassport() {
    if (pdfLoading) return;
    setPdfLoading(true);
    try {
      const res = await getLandParcelPassport(parcel.id);
      if (!res.success || !res.data) {
        toast.error(res.success ? "Data tidak ditemukan" : res.error);
        return;
      }
      const { generateFarmPassportPdf } = await import("@/lib/farm-passport");
      generateFarmPassportPdf(res.data);
    } catch {
      toast.error("Gagal membuat PDF profil lahan");
    } finally {
      setPdfLoading(false);
    }
  }

  function openMonth(year: number, monthIdx: number) {
    setMonthModal({
      period: `${year}-${String(monthIdx + 1).padStart(2, "0")}`,
      title: `Produksi ${MONTH_LABELS[monthIdx]} ${year}`,
    });
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb: tampilkan ID Lahan, bukan CUID URL */}
      <BreadcrumbOverride label={parcel.parcelId} />

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/master-data/parcels">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="h-14 w-14 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <LandPlot className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-mono">{parcel.parcelId}</h1>
            <p className="text-muted-foreground text-sm">
              Milik{" "}
              <Link
                href={`/admin/master-data/farmers/${parcel.farmer.id}`}
                className="text-primary hover:underline font-medium"
              >
                {parcel.farmer.name}
              </Link>{" "}
              · {parcel.farmer.farmerGroup.name} · {parcel.farmer.farmerGroup.district.name}
            </p>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <Badge variant={parcel.isActive ? "default" : "outline"}>
                {parcel.isActive ? "Aktif" : "Nonaktif"}
              </Badge>
              <Badge variant={parcel.isPsr ? "secondary" : "outline"}>
                {parcel.isPsr ? "PSR (Replanting)" : "Non-PSR"}
              </Badge>
              {parcel.cropType && <Badge variant="secondary">{parcel.cropType}</Badge>}
              {parcel.subGroupLv2 && <Badge variant="outline">{parcel.subGroupLv2}</Badge>}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {canPrint && (
            <Button
              size="sm"
              variant="outline"
              onClick={downloadPassport}
              disabled={pdfLoading || geometry == null}
              title={geometry == null ? "Perlu data geometri untuk membuat PDF" : undefined}
            >
              {pdfLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Printer className="h-4 w-4 mr-2" />
              )}
              Profil Lahan (PDF)
            </Button>
          )}
          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          {canDelete && (
            <Button size="sm" variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Nonaktifkan
            </Button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <SummaryCard
          icon={Ruler}
          title="Luas"
          value={parcel.area != null ? `${formatDecimal(parcel.area)} Ha` : "—"}
          sub={[
            parcel.blok ? `Blok ${parcel.blok}` : null,
            treeCount > 0
              ? `${formatNumber(treeCount)} pohon${trees?.summary.density != null ? ` (${formatDecimal(trees.summary.density)}/ha)` : ""}`
              : "Belum ada titik pohon",
          ]
            .filter(Boolean)
            .join(" · ")}
        />
        <SummaryCard icon={ShieldCheck} title="Legalitas" value={legalValue} sub={legalSub} />
        <SummaryCard
          icon={Sprout}
          title="Umur Tanaman"
          value={plantAge != null ? `${formatNumber(plantAge)} tahun` : "—"}
          sub={
            parcel.plantingYear != null
              ? `Tanam ${parcel.plantingYear}`
              : "Tahun tanam belum diisi"
          }
        />
        <SummaryCard
          icon={TrendingUp}
          title="Produksi"
          value={
            production && production.totalKg > 0
              ? `${formatDecimal(production.totalKg / 1000)} Ton`
              : "—"
          }
          sub={
            production && production.recordCount > 0
              ? `${formatNumber(production.recordCount)} record · ${prodYearRange}`
              : parcel.isPsr
                ? "Belum ada data (wajar untuk PSR)"
                : "Belum ada data produksi"
          }
        />
        <SummaryCard
          icon={ClipboardCheck}
          title="Kelengkapan Data"
          value={`${formatNumber(filledCount)}/${formatNumber(attributes.length)} atribut`}
          sub={missingLabels.length > 0 ? `Belum: ${missingLabels.join(", ")}` : "Lengkap"}
        />
      </div>

      {/* Tabs (#298): konsisten dengan Detail Petani; tiap tab satu kartu */}
      <Tabs defaultValue="informasi" className="w-full">
        <TabsList className="grid w-full max-w-[420px] grid-cols-3 mb-4">
          <TabsTrigger value="informasi">Informasi</TabsTrigger>
          <TabsTrigger value="legalitas">
            Legalitas{legalCount > 0 && <span className="ml-1.5 text-xs text-muted-foreground tabular-nums">{formatNumber(legalCount)}</span>}
          </TabsTrigger>
          <TabsTrigger value="produksi">Produksi</TabsTrigger>
        </TabsList>

        {/* ── Informasi: peta 60% kiri, atribut + pemilik di kanan ── */}
        <TabsContent value="informasi">
        <Card className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          <div className="lg:col-span-3">
            <ParcelMapView
              geometry={parcel.geometry}
              heightClassName="h-[560px]"
              siblingGeometries={siblingParcels.map((s) => s.geometry)}
              treePoints={trees?.points}
            />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground mt-2">
              <span className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 shrink-0 rounded-sm bg-[#22c55e]/60 border border-[#16a34a]" />
                Poligon hijau = batas lahan ini
              </span>
              {trees != null && trees.summary.count > 0 && (
                <span className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-[#facc15] border border-[#854d0e]" />
                  Titik kuning = pohon sawit ({formatNumber(trees.summary.count)})
                </span>
              )}
              {siblingParcels.some((s) => s.geometry) && (
                <span className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 shrink-0 rounded-sm bg-[#0ea5e9]/40 border border-[#0284c7]" />
                  Biru = lahan lain milik petani ini
                </span>
              )}
              {center && (
                <a
                  href={`https://www.google.com/maps?q=${center.lat.toFixed(6)},${center.lng.toFixed(6)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-primary hover:underline font-mono ml-auto"
                  title="Buka titik pusat lahan di Google Maps"
                >
                  {center.lat.toFixed(5)}, {center.lng.toFixed(5)}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>

          <div className="space-y-4 lg:col-span-2">
            {/* Atribut: hanya yang terisi (#298) — yang kosong dirangkum satu baris + tombol Lengkapi,
                bukan "Belum diisi" berulang di tiap field. */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div className="col-span-2">
                <FieldItem label="ID Lahan">
                  <Val value={parcel.parcelId} mono />
                </FieldItem>
              </div>
              {parcel.blok && <FieldItem label="Blok">{parcel.blok}</FieldItem>}
              {parcel.subGroupLv2 && <FieldItem label="Kelompok Tani">{parcel.subGroupLv2}</FieldItem>}
              {parcel.landStatus && <FieldItem label="Status Kepemilikan">{parcel.landStatus}</FieldItem>}
              {parcel.plantingYear != null && (
                <FieldItem label="Tahun Tanam">
                  {parcel.plantingYear}
                  {plantAge != null && <span className="text-muted-foreground font-normal"> ({plantAge} th)</span>}
                </FieldItem>
              )}
              {parcel.cropType && <FieldItem label="Komoditas">{parcel.cropType}</FieldItem>}
              {parcel.species && <FieldItem label="Species"><span className="italic">{parcel.species}</span></FieldItem>}
              {parcel.notes && (
                <div className="col-span-2">
                  <FieldItem label="Catatan">
                    <span className="whitespace-pre-wrap font-normal">{parcel.notes}</span>
                  </FieldItem>
                </div>
              )}
            </div>
            {missingLabels.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
                <span>
                  Belum diisi: <span className="text-foreground">{missingLabels.join(", ")}</span>
                </span>
                {canEdit && (
                  <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => setShowForm(true)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Lengkapi
                  </Button>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Revisi ke-{parcel.revision} · Dibuat {formatDate(parcel.createdAt)} · Diubah{" "}
              {formatDate(parcel.modifiedAt)}
            </p>

            <div className="rounded-lg border p-4 space-y-3">
              <h3 className="text-sm font-semibold">Pemilik</h3>
              <div className="grid grid-cols-2 gap-3">
                <FieldItem label="Nama Petani">
                  <Link
                    href={`/admin/master-data/farmers/${parcel.farmer.id}`}
                    className="text-primary hover:underline"
                  >
                    {parcel.farmer.name}
                  </Link>
                </FieldItem>
                <FieldItem label="ID Petani">
                  <Val value={parcel.farmer.farmerId} mono />
                </FieldItem>
                <FieldItem label="Lembaga Petani">
                  <Link
                    href={`/admin/master-data/groups/${parcel.farmer.farmerGroup.id}`}
                    className="text-primary hover:underline"
                  >
                    {parcel.farmer.farmerGroup.name}
                  </Link>
                </FieldItem>
                <FieldItem label="Distrik">{parcel.farmer.farmerGroup.district.name}</FieldItem>
              </div>
              {siblingParcels.length > 0 && (
                <div className="pt-1">
                  <FieldItem label={`Lahan lain milik petani (${siblingParcels.length})`}>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-xs text-muted-foreground">
                            <th className="py-1.5 pr-3 font-medium">Kode</th>
                            <th className="py-1.5 pr-3 font-semibold text-right">Luas (Ha)</th>
                            <th className="py-1.5 pr-3 font-semibold text-right">Tahun Tanam</th>
                            <th className="py-1.5 font-semibold text-right">Jumlah Pohon</th>
                          </tr>
                        </thead>
                        <tbody>
                          {siblingParcels.map((s) => (
                            <tr key={s.id} className="border-b last:border-0">
                              <td className="py-1.5 pr-3 font-mono">
                                <Link
                                  href={`/admin/master-data/parcels/${s.id}`}
                                  className="text-primary hover:underline"
                                >
                                  {s.parcelId}
                                </Link>
                              </td>
                              <td className="py-1.5 pr-3 text-right tabular-nums">
                                {s.area != null ? formatDecimal(s.area) : "—"}
                              </td>
                              <td className="py-1.5 pr-3 text-right tabular-nums">
                                {s.plantingYear ?? "—"}
                              </td>
                              <td className="py-1.5 text-right tabular-nums">
                                {s.treeCount > 0 ? formatNumber(s.treeCount) : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </FieldItem>
                </div>
              )}
            </div>
          </div>
        </div>
        </Card>
        </TabsContent>

        {/* ── Legalitas (#296): dokumen, STDB, kode vendor, program via parcelUid ── */}
        <TabsContent value="legalitas">
        <Card className="p-6">
          {satellites ? (
            <ParcelLegalSection data={satellites} parcelArea={parcel.area} landParcelId={parcel.id} permissions={permissions} />
          ) : (
            <Val value={null} />
          )}
        </Card>
        </TabsContent>

        {/* ── Produksi: grafik bulanan kontinu + tabel pivot per tahun ── */}
        <TabsContent value="produksi">
        <Card className="p-6">
        {/* Konteks agronomi singkat — pembanding saat membaca produktivitas */}
        <div className="flex flex-wrap gap-x-10 gap-y-3 mb-4">
          <FieldItem label="Luas">
            {parcel.area != null ? `${formatDecimal(parcel.area)} Ha` : <Val value={null} />}
          </FieldItem>
          <FieldItem label="Tahun Tanam">
            {parcel.plantingYear != null ? (
              <>
                {parcel.plantingYear}
                {plantAge != null && (
                  <span className="text-muted-foreground font-normal"> ({plantAge} th)</span>
                )}
              </>
            ) : (
              <Val value={null} />
            )}
          </FieldItem>
          <FieldItem label="Species">
            <Val value={parcel.species} />
          </FieldItem>
        </div>

        {!hasProdData && (
          <p className="text-sm text-muted-foreground mb-4">
            Belum ada data produksi untuk lahan ini.
            {parcel.isPsr && " Lahan PSR (replanting) — belum berproduksi adalah wajar."}
            {canEditProduction && " Klik sel bulan pada tabel di bawah untuk mulai input."}
          </p>
        )}

        {hasProdData && <ParcelProductionChart byYear={paddedYears} />}

        {(hasProdData || canEditProduction) && (
          <>
            <div className={`overflow-x-auto ${hasProdData ? "mt-6" : ""}`}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="py-2 pr-4 text-left font-medium">Tahun</th>
                    {MONTH_LABELS.map((m) => (
                      <th key={m} className="py-2 px-2 text-right">
                        {m}
                      </th>
                    ))}
                    <th className="py-2 pl-2 pr-4 text-right">Total (kg)</th>
                    <th className="py-2 text-right">Ton/Ha</th>
                  </tr>
                </thead>
                <tbody>
                  {paddedYears.map((y) => (
                    <tr key={y.year} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="py-2 pr-4 font-medium tabular-nums">{y.year}</td>
                      {y.monthly.map((kg, monthIdx) => {
                        const isFuture =
                          y.year > currentYear ||
                          (y.year === currentYear && monthIdx > nowMonthIdx);
                        const clickable = canEditProduction && (kg > 0 || !isFuture);
                        return (
                          <td
                            key={monthIdx}
                            className={`py-2 px-2 text-right tabular-nums ${
                              clickable ? "cursor-pointer hover:bg-primary/10" : ""
                            }`}
                            title={
                              clickable
                                ? `Input/edit produksi ${MONTH_LABELS[monthIdx]} ${y.year}`
                                : undefined
                            }
                            onClick={clickable ? () => openMonth(y.year, monthIdx) : undefined}
                          >
                            {kg > 0 ? (
                              formatNumber(Math.round(kg))
                            ) : isFuture ? (
                              ""
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="py-2 pl-2 pr-4 text-right tabular-nums font-medium">
                        {y.total > 0 ? (
                          formatNumber(Math.round(y.total))
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2 text-right tabular-nums font-medium">
                        {y.total > 0 && parcel.area ? (
                          formatDecimal(y.total / 1000 / parcel.area)
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Angka bulanan dalam kg. Produktivitas (Ton/Ha) = produksi tahun tsb ÷ luas lahan (
              {parcel.area != null ? `${formatDecimal(parcel.area)} Ha` : "luas belum diisi"}).
              {canEditProduction &&
                " Klik sel bulan untuk menambah/mengubah data panen bulan tsb."}
            </p>
          </>
        )}
        </Card>
        </TabsContent>
      </Tabs>

      <ParcelFormModal
        open={showForm}
        onClose={() => setShowForm(false)}
        parcel={parcel}
        farmers={farmers}
      />

      {canEditProduction && monthModal && (
        <ParcelProductionMonthModal
          open
          onClose={() => setMonthModal(null)}
          parcelDbId={parcel.id}
          farmerId={parcel.farmerId}
          period={monthModal.period}
          title={monthModal.title}
        />
      )}
    </div>
  );
}
