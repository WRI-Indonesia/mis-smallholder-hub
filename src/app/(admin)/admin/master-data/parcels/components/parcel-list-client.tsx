"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { ParcelFormModal } from "./parcel-form-modal";
import { toggleLandParcelActive } from "@/server/actions/land-parcel";
import { toast } from "sonner";
import {
  TableActions,
  DataTable,
  type DataTableColumn,
} from "@/components/shared";
import {
  DistrictGroupFilter,
  type DistrictFilterOption,
} from "@/components/shared/district-group-filter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { LandParcel, FarmerSelect, FarmerGroupSelect } from "@/types/land-parcel";
import { LAND_NKT_STATUSES, LAND_NKT_STATUS_LABELS, isNktAffected, landNktStatusLabel } from "@/lib/land-parcel-satellite-format";
import { formatArea } from "@/lib/format";
import { ParcelExportMenu } from "@/components/shared/parcel-export-menu";
import { getMasterDataParcelExportData } from "@/server/actions/land-parcel-export";
import { parcelExportFileBase, type ParcelExportFormat } from "@/lib/parcel-export-data";
import { downloadParcelExport } from "@/lib/parcel-spatial-download";

interface Props {
  initialParcels: unknown[];
  farmers: FarmerSelect[];
  farmerGroups: FarmerGroupSelect[];
  districts: DistrictFilterOption[];
  permissions: string[];
  isSuperAdmin: boolean;
}


export function ParcelListClient({
  initialParcels,
  farmers,
  farmerGroups,
  districts,
  permissions,
  isSuperAdmin,
}: Props) {
  const [districtFilter, setDistrictFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  // NKT (#328): all · affected (termasuk+terdampak) · INCLUDED/AFFECTED/NOT_AFFECTED · none (belum dinilai).
  const [nktFilter, setNktFilter] = useState("all");
  // Patok (#329): all · with · without.
  const [markerFilter, setMarkerFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editParcel, setEditParcel] = useState<LandParcel | null>(null);
  const [spatialExporting, setSpatialExporting] = useState(false);
  const router = useRouter();

  const filtered = (initialParcels as LandParcel[]).filter((p) => {
    const matchGroup = groupFilter === "all" || p.farmer.farmerGroup.id === groupFilter;
    const matchDistrict =
      districtFilter === "all" || p.farmer.farmerGroup.district.id === districtFilter;
    // Filter Status hanya berlaku untuk SUPERADMIN; user lain hanya menerima data aktif.
    const matchStatus = !isSuperAdmin
      ? true
      : statusFilter === "all"
        ? true
        : statusFilter === "active"
          ? p.isActive
          : !p.isActive;
    const matchNkt =
      nktFilter === "all"
        ? true
        : nktFilter === "affected"
          ? isNktAffected(p.nktStatus)
          : nktFilter === "none"
            ? p.nktStatus == null
            : p.nktStatus === nktFilter;
    const matchMarker =
      markerFilter === "all" ? true : markerFilter === "with" ? (p.markerCount ?? 0) > 0 : (p.markerCount ?? 0) === 0;
    return matchGroup && matchDistrict && matchStatus && matchNkt && matchMarker;
  });

  // Unduh data spasial (SHP/GeoJSON/KML) sesuai filter Distrik/Lembaga (#313).
  // Tanpa mode "all": tombol nonaktif selama kedua filter masih "Semua".
  const spatialFilterEmpty = districtFilter === "all" && groupFilter === "all";
  async function handleSpatialExport(format: ParcelExportFormat) {
    if (spatialFilterEmpty || spatialExporting) return;
    setSpatialExporting(true);
    try {
      const res = await getMasterDataParcelExportData({
        districtId: districtFilter !== "all" ? districtFilter : null,
        farmerGroupId: groupFilter !== "all" ? groupFilter : null,
      });
      if (!res.success || !res.data) {
        toast.error(res.success ? "Gagal menyiapkan data lahan" : res.error);
        return;
      }
      if (res.data.count === 0) {
        toast.info("Tidak ada lahan ber-poligon pada filter ini");
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
      setSpatialExporting(false);
    }
  }

  async function handleToggleActive(id: string) {
    const result = await toggleLandParcelActive(id);
    if (result.success) {
      toast.success("Status berhasil diubah");
      router.refresh();
    } else {
      toast.error(typeof result.error === "string" ? result.error : "Gagal mengubah status");
    }
  }

  const columns: DataTableColumn<LandParcel>[] = [
    {
      key: "parcelId",
      label: "ID Lahan",
      sortable: true,
      cellClassName: "text-sm font-mono text-muted-foreground",
      // Badge NKT (#328) menempel di ID supaya terlihat tanpa mengaktifkan kolom NKT.
      render: (row) => (
        <span className="inline-flex items-center gap-1.5">
          {row.parcelId}
          {isNktAffected(row.nktStatus) && (
            <Badge className={row.nktStatus === "INCLUDED" ? "bg-red-600 hover:bg-red-600 font-sans" : "bg-amber-500 hover:bg-amber-500 font-sans"}>NKT</Badge>
          )}
        </span>
      ),
    },
    {
      key: "nktStatus",
      label: "NKT",
      sortable: true,
      defaultVisible: false,
      cellClassName: "text-sm text-muted-foreground",
      render: (row) => (row.nktStatus ? landNktStatusLabel(row.nktStatus, true) : "Belum dinilai"),
    },
    {
      key: "markerCount",
      label: "Patok",
      sortable: true,
      defaultVisible: false,
      cellClassName: "text-sm tabular-nums text-right text-muted-foreground",
      render: (row) => (row.markerCount ? row.markerCount : "—"),
    },
    {
      key: "blok",
      label: "Blok",
      sortable: true,
      defaultVisible: false,
      cellClassName: "text-sm text-muted-foreground",
      render: (row) => row.blok ?? "—",
    },
    {
      key: "farmer",
      label: "Nama Petani",
      sortable: true,
      cellClassName: "text-sm font-medium",
      render: (row) => row.farmer.name,
    },
    {
      key: "farmerId",
      label: "ID Petani",
      sortable: true,
      cellClassName: "text-sm font-mono text-muted-foreground",
      render: (row) => row.farmer.farmerId,
    },
    {
      key: "farmerGroupName",
      label: "Lembaga Petani",
      sortable: true,
      cellClassName: "text-sm text-muted-foreground",
      render: (row) => row.farmer.farmerGroup.name,
    },
    {
      key: "subGroupLv2",
      label: "Kelompok Tani",
      sortable: true,
      defaultVisible: false,
      cellClassName: "text-sm text-muted-foreground",
      render: (row) => row.subGroupLv2 ?? "—",
    },
    {
      key: "area",
      label: "Luas (ha)",
      sortable: true,
      cellClassName: "text-sm tabular-nums text-right",
      render: (row) => (row.area !== null ? formatArea(row.area) : "—"),
    },
    {
      key: "landStatus",
      label: "Status Kepemilikan",
      sortable: true,
      cellClassName: "text-sm text-muted-foreground",
      render: (row) => row.landStatus ?? "—",
    },
    {
      key: "cropType",
      label: "Komoditas",
      sortable: true,
      cellClassName: "text-sm text-muted-foreground",
      render: (row) => row.cropType ?? "—",
    },
    {
      key: "species",
      label: "Species",
      sortable: true,
      cellClassName: "text-sm text-muted-foreground",
      render: (row) => row.species ?? "—",
    },
    {
      key: "isPsr",
      label: "PSR",
      sortable: true,
      render: (row) =>
        row.isPsr ? (
          <Badge className="bg-amber-100 text-amber-800 border-amber-200">PSR</Badge>
        ) : (
          <span className="text-sm text-muted-foreground">Non-PSR</span>
        ),
    },
    {
      key: "plantingYear",
      label: "Tahun Tanam",
      sortable: true,
      cellClassName: "text-sm tabular-nums text-muted-foreground",
      render: (row) => row.plantingYear ?? "—",
    },
    {
      key: "revision",
      label: "Revisi",
      sortable: true,
      cellClassName: "text-sm tabular-nums text-muted-foreground",
      render: (row) => row.revision,
    },
    {
      key: "isActive",
      label: "Status",
      sortable: true,
      render: (row) => (
        <Badge variant={row.isActive ? "default" : "outline"}>
          {row.isActive ? "Aktif" : "Nonaktif"}
        </Badge>
      ),
    },
  ];

  const getExportRow = (p: LandParcel) => {
    return {
      parcelId: p.parcelId,
      blok: p.blok ?? "—",
      farmer: p.farmer.name,
      farmerId: p.farmer.farmerId,
      farmerGroupName: p.farmer.farmerGroup.name,
      subGroupLv2: p.subGroupLv2 ?? "—",
      area: p.area !== null ? p.area : "—",
      landStatus: p.landStatus ?? "—",
      cropType: p.cropType ?? "—",
      species: p.species ?? "—",
      isPsr: p.isPsr ? "PSR" : "Non-PSR",
      plantingYear: p.plantingYear ?? "—",
      revision: p.revision,
      nktStatus: p.nktStatus ? landNktStatusLabel(p.nktStatus, true) : "Belum dinilai",
      markerCount: p.markerCount ?? 0,
      districtName: p.farmer.farmerGroup.district.name,
      // Kolom Status hanya tampil untuk SUPERADMIN, tapi saat tampil ia wajib
      // punya padanan di sini — kalau tidak, kolomnya terbit kosong.
      isActive: p.isActive ? "Aktif" : "Nonaktif",
    };
  };

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

      {/* NKT (#328) & Patok (#329) — filter klien atas payload list yang sudah membawa status/hitungan. */}
      <Select value={nktFilter} onValueChange={(val) => setNktFilter(val ?? "all")}>
        <SelectTrigger className="w-[170px] h-9">
          <SelectValue>
            {(v: string) =>
              v === "all" ? "NKT: Semua" : v === "affected" ? "NKT: Termasuk/terdampak" : v === "none" ? "NKT: Belum dinilai" : LAND_NKT_STATUS_LABELS[v as (typeof LAND_NKT_STATUSES)[number]] ?? v
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">NKT: Semua</SelectItem>
          <SelectItem value="affected">Termasuk/terdampak NKT</SelectItem>
          {LAND_NKT_STATUSES.map((st) => (
            <SelectItem key={st} value={st}>{LAND_NKT_STATUS_LABELS[st]}</SelectItem>
          ))}
          <SelectItem value="none">Belum dinilai</SelectItem>
        </SelectContent>
      </Select>
      <Select value={markerFilter} onValueChange={(val) => setMarkerFilter(val ?? "all")}>
        <SelectTrigger className="w-[150px] h-9">
          <SelectValue>{(v: string) => (v === "with" ? "Patok: Ada" : v === "without" ? "Patok: Belum ada" : "Patok: Semua")}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Patok: Semua</SelectItem>
          <SelectItem value="with">Sudah ada patok</SelectItem>
          <SelectItem value="without">Belum ada patok</SelectItem>
        </SelectContent>
      </Select>

      {/* Status filter — hanya SUPERADMIN */}
      {isSuperAdmin && (
        <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val ?? "active")}>
          <SelectTrigger className="w-[140px] h-9">
            {/* Label, bukan nilai mentah "active" (base-ui menampilkan value bila tanpa function-child). */}
            <SelectValue>{(v: string) => (v === "all" ? "Semua Status" : v === "inactive" ? "Nonaktif" : "Aktif")}</SelectValue>
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

  const canSpatialExport = permissions.includes("EXPORT");
  const canCreate = permissions.includes("CREATE");
  const toolbarRight =
    canSpatialExport || canCreate ? (
      <div className="flex items-center gap-2">
        {canSpatialExport && (
          <ParcelExportMenu
            disabled={spatialFilterEmpty}
            disabledReason="Pilih Distrik atau Lembaga Petani terlebih dahulu"
            exporting={spatialExporting}
            onExport={handleSpatialExport}
          />
        )}
        {canCreate && (
          <Button
            size="sm"
            onClick={() => {
              setEditParcel(null);
              setShowForm(true);
            }}
            className="h-9"
          >
            <Plus className="h-4 w-4 mr-2" />
            Tambah Lahan
          </Button>
        )}
      </div>
    ) : undefined;

  return (
    <>
      <Card className="p-4">
        <DataTable
          columns={isSuperAdmin ? columns : columns.filter((c) => c.key !== "isActive")}
          data={filtered}
          rowKey={(p) => p.id}
          searchPlaceholder="Cari ID Lahan atau nama petani..."
          searchFn={(row, query) => {
            return (
              row.parcelId.toLowerCase().includes(query) ||
              row.farmer.name.toLowerCase().includes(query) ||
              row.farmer.farmerId.toLowerCase().includes(query)
            );
          }}
          toolbarLeft={toolbarLeft}
          toolbarRight={toolbarRight}
          exportFilename="data-lahan"
          canExport={permissions.includes("EXPORT")}
          getExportRow={getExportRow}
          renderActions={(parcel) => (
            <TableActions
              permissions={permissions}
              actions={[
                {
                  type: "view",
                  onClick: () => router.push(`/admin/master-data/parcels/${parcel.id}`),
                },
                {
                  type: "edit",
                  onClick: () => {
                    setEditParcel(parcel);
                    setShowForm(true);
                  },
                },
                {
                  type: "delete",
                  isActive: parcel.isActive,
                  onClick: () => handleToggleActive(parcel.id),
                },
              ]}
            />
          )}
        />
      </Card>

      <ParcelFormModal
        key={editParcel?.id ?? "new"}
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setEditParcel(null);
        }}
        parcel={editParcel}
        farmers={farmers}
      />
    </>
  );
}
