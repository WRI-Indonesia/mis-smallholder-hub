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
  DistrictGroupFilter,
  type DataTableColumn,
} from "@/components/shared";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { LandParcel, FarmerSelect, FarmerGroupSelect } from "@/types/land-parcel";

interface District {
  id: string;
  name: string;
}

interface Props {
  initialParcels: unknown[];
  farmers: FarmerSelect[];
  farmerGroups: FarmerGroupSelect[];
  districts: District[];
  permissions: string[];
  isSuperAdmin: boolean;
}

const formatArea = (n: number) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

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
  const [showForm, setShowForm] = useState(false);
  const [editParcel, setEditParcel] = useState<LandParcel | null>(null);
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
    return matchGroup && matchDistrict && matchStatus;
  });

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
      districtName: p.farmer.farmerGroup.district.name,
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

      {/* Status filter — hanya SUPERADMIN */}
      {isSuperAdmin && (
        <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val ?? "active")}>
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

  const toolbarRight = permissions.includes("CREATE") ? (
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
