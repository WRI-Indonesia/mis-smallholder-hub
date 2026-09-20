"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardCheck, FileSpreadsheet, Plus, Users, Building, Gauge } from "lucide-react";
import { toast } from "sonner";
import { TableActions, DataTable, type DataTableColumn } from "@/components/shared";
import { BmpCategoryBadge } from "@/components/shared/bmp-category-badge";
import {
  DistrictGroupFilter,
  type DistrictFilterOption,
  type GroupFilterOption,
} from "@/components/shared/district-group-filter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toggleBmpAssessmentActive, type BmpAssessmentListItem } from "@/server/actions/bmp-assessment";
import {
  BMP_ASSESSMENT_CATEGORIES,
  bmpAssessmentCategory,
  formatScore,
  type BmpAssessmentCategoryKey,
} from "@/lib/bmp-assessment";
import { formatNumber } from "@/lib/format";
import { BmpAssessmentFormModal } from "./bmp-assessment-form-modal";
import { BmpMonevImportDialog } from "./bmp-monev-import-dialog";

interface Props {
  initialRows: BmpAssessmentListItem[];
  farmerGroups: GroupFilterOption[];
  districts: DistrictFilterOption[];
  permissions: string[];
  isSuperAdmin: boolean;
}

const formatDate = (d: Date | string | null) => {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "—";
  // Tanggal survei disimpan UTC tengah malam — baca komponen UTC agar tidak
  // mundur sehari di zona WIB.
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
};

export function BmpMonevListClient({ initialRows, farmerGroups, districts, permissions, isSuperAdmin }: Props) {
  const router = useRouter();
  const [districtFilter, setDistrictFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editRow, setEditRow] = useState<BmpAssessmentListItem | null>(null);

  const years = useMemo(
    () => [...new Set(initialRows.map((r) => r.surveyYear))].sort((a, b) => b - a),
    [initialRows],
  );

  const filtered = initialRows.filter((r) => {
    const matchGroup = groupFilter === "all" || r.farmerGroupId === groupFilter;
    const matchDistrict = districtFilter === "all" || r.districtId === districtFilter;
    const matchYear = yearFilter === "all" || r.surveyYear === Number(yearFilter);
    const matchCategory =
      categoryFilter === "all" || bmpAssessmentCategory(r.score).key === (categoryFilter as BmpAssessmentCategoryKey);
    // Filter Status hanya berlaku untuk SUPERADMIN; user lain hanya menerima data aktif.
    const matchStatus = !isSuperAdmin
      ? true
      : statusFilter === "all"
        ? true
        : statusFilter === "active"
          ? r.isActive
          : !r.isActive;
    return matchGroup && matchDistrict && matchYear && matchCategory && matchStatus;
  });

  async function handleToggleActive(id: string) {
    const result = await toggleBmpAssessmentActive(id);
    if (result.success) {
      toast.success("Status berhasil diubah");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  const columns: DataTableColumn<BmpAssessmentListItem>[] = [
    {
      key: "farmerName",
      label: "Petani",
      sortable: true,
      cellClassName: "text-sm",
      render: (r) => (
        <div className="flex flex-col">
          <Link href={`/admin/master-data/farmers/${r.farmerId}`} className="font-medium text-primary hover:underline">
            {r.farmerName}
          </Link>
          <span className="font-mono text-[11px] text-muted-foreground">{r.farmerCode}</span>
        </div>
      ),
    },
    {
      key: "farmerGroupName",
      label: "Lembaga Petani",
      sortable: true,
      cellClassName: "text-sm text-muted-foreground",
    },
    {
      key: "surveyYear",
      label: "Tahun",
      sortable: true,
      cellClassName: "text-sm tabular-nums",
    },
    {
      key: "surveyDate",
      label: "Tgl Survei",
      sortable: true,
      cellClassName: "text-sm text-muted-foreground tabular-nums whitespace-nowrap",
      sortValue: (r) => (r.surveyDate ? new Date(r.surveyDate).getTime() : null),
      render: (r) => formatDate(r.surveyDate),
    },
    {
      key: "score",
      label: "Skor",
      sortable: true,
      headerClassName: "text-right",
      cellClassName: "text-sm tabular-nums text-right font-medium",
      render: (r) => formatScore(r.score),
    },
    {
      key: "id",
      label: "Kategori",
      sortable: true,
      sortValue: (r) => r.score,
      render: (r) => <BmpCategoryBadge score={r.score} />,
    },
    {
      key: "parcelId",
      label: "Lahan Dikunjungi",
      sortable: true,
      cellClassName: "font-mono text-xs text-muted-foreground",
      render: (r) => r.parcelId ?? <span className="font-sans text-sm">—</span>,
    },
    {
      key: "assessor",
      label: "Penilai",
      sortable: true,
      defaultVisible: false,
      cellClassName: "text-sm text-muted-foreground",
      render: (r) => r.assessor ?? "—",
    },
    {
      key: "notes",
      label: "Catatan",
      sortable: false,
      defaultVisible: false,
      cellClassName: "text-sm text-muted-foreground",
      render: (r) => r.notes ?? "—",
    },
    {
      key: "isActive",
      label: "Status",
      sortable: true,
      render: (r) => <Badge variant={r.isActive ? "default" : "outline"}>{r.isActive ? "Aktif" : "Nonaktif"}</Badge>,
    },
  ];

  const getExportRow = (r: BmpAssessmentListItem) => ({
    farmerName: r.farmerName,
    farmerCode: r.farmerCode,
    farmerGroupName: r.farmerGroupName,
    districtName: r.districtName,
    surveyYear: r.surveyYear,
    surveyDate: formatDate(r.surveyDate),
    score: r.score,
    id: bmpAssessmentCategory(r.score).label,
    parcelId: r.parcelId ?? "",
    assessor: r.assessor ?? "",
    notes: r.notes ?? "",
    isActive: r.isActive ? "Aktif" : "Nonaktif",
  });

  const toolbarLeft = (
    <div className="flex flex-wrap items-center gap-2">
      <DistrictGroupFilter
        districts={districts}
        farmerGroups={farmerGroups}
        districtFilter={districtFilter}
        groupFilter={groupFilter}
        onDistrictFilterChange={setDistrictFilter}
        onGroupFilterChange={setGroupFilter}
      />
      <Select value={yearFilter} onValueChange={(v) => setYearFilter(v ?? "all")}>
        <SelectTrigger className="w-[140px] h-9">
          <SelectValue>{(v: string) => (v === "all" ? "Semua Tahun" : v)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua Tahun</SelectItem>
          {years.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? "all")}>
        <SelectTrigger className="w-[190px] h-9">
          <SelectValue>
            {(v: string) =>
              v === "all" ? "Semua Kategori" : (BMP_ASSESSMENT_CATEGORIES.find((c) => c.key === v)?.label ?? v)
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua Kategori</SelectItem>
          {BMP_ASSESSMENT_CATEGORIES.map((c) => (
            <SelectItem key={c.key} value={c.key}>
              {c.label} ({c.range})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isSuperAdmin && (
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "active")}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="active">Aktif</SelectItem>
            <SelectItem value="inactive">Nonaktif</SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  );

  const canCreate = permissions.includes("CREATE");
  const toolbarRight = canCreate ? (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" className="h-9" onClick={() => setShowImport(true)}>
        <FileSpreadsheet className="h-4 w-4 mr-2" />
        Import Excel
      </Button>
      <Button
        size="sm"
        className="h-9"
        onClick={() => {
          setEditRow(null);
          setShowForm(true);
        }}
      >
        <Plus className="h-4 w-4 mr-2" />
        Tambah Penilaian
      </Button>
    </div>
  ) : undefined;

  // KPI ringkas mengikuti filter — sinkron dengan tabel di bawahnya.
  const active = filtered.filter((r) => r.isActive);
  const farmerCount = new Set(active.map((r) => r.farmerId)).size;
  const groupCount = new Set(active.map((r) => r.farmerGroupId)).size;
  const avg = active.length > 0 ? active.reduce((s, r) => s + r.score, 0) / active.length : null;
  const adopters = active.filter((r) => {
    const k = bmpAssessmentCategory(r.score).key;
    return k === "TELADAN" || k === "PRAKTISI";
  }).length;

  const kpis = [
    { title: "Penilaian", value: formatNumber(active.length), icon: ClipboardCheck },
    { title: "Petani Dinilai", value: formatNumber(farmerCount), icon: Users },
    { title: "Lembaga Petani", value: formatNumber(groupCount), icon: Building },
    {
      title: "Rerata Skor",
      value: avg == null ? "—" : formatScore(avg),
      sub: active.length > 0 ? `${formatNumber(adopters)} Teladan + Praktisi` : undefined,
      icon: Gauge,
    },
  ];

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.title}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{k.title}</p>
                  <h3 className="text-2xl font-bold mt-1.5 tabular-nums">{k.value}</h3>
                  {k.sub && <p className="text-xs text-muted-foreground mt-0.5">{k.sub}</p>}
                </div>
                <div className="p-3 bg-primary/10 text-primary rounded-xl">
                  <Icon className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="p-4">
        <DataTable
          columns={isSuperAdmin ? columns : columns.filter((c) => c.key !== "isActive")}
          data={filtered}
          rowKey={(r) => r.id}
          searchPlaceholder="Cari nama / ID petani, lembaga, lahan..."
          searchFn={(row, q) =>
            row.farmerName.toLowerCase().includes(q) ||
            row.farmerCode.toLowerCase().includes(q) ||
            row.farmerGroupName.toLowerCase().includes(q) ||
            (row.parcelId ?? "").toLowerCase().includes(q) ||
            (row.assessor ?? "").toLowerCase().includes(q)
          }
          toolbarLeft={toolbarLeft}
          toolbarRight={toolbarRight}
          exportFilename="data-monev-bmp"
          canExport={permissions.includes("EXPORT")}
          getExportRow={getExportRow}
          emptyMessage="Belum ada penilaian Monev BMP pada filter ini."
          renderActions={(r) => (
            <TableActions
              permissions={permissions}
              actions={[
                {
                  type: "edit",
                  onClick: () => {
                    setEditRow(r);
                    setShowForm(true);
                  },
                },
                {
                  type: "delete",
                  isActive: r.isActive,
                  onClick: () => handleToggleActive(r.id),
                },
              ]}
            />
          )}
        />
      </Card>

      <BmpAssessmentFormModal
        key={editRow?.id ?? "new"}
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setEditRow(null);
        }}
        assessment={editRow}
        farmerGroups={farmerGroups}
      />

      <BmpMonevImportDialog open={showImport} onClose={() => setShowImport(false)} farmerGroups={farmerGroups} />
    </>
  );
}
