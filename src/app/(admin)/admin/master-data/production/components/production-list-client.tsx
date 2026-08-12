"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { toggleProductionRecordActive } from "@/server/actions/production";
import { MONTH_NAMES_ID } from "@/lib/format";
import { toast } from "sonner";
import {
  TableActions,
  DataTable,
  type DataTableColumn,
} from "@/components/shared";
import {
  DistrictGroupFilter,
  type DistrictFilterOption,
  type GroupFilterOption,
} from "@/components/shared/district-group-filter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface ProductionRecord {
  id: string;
  isActive: boolean;
  period: string;
  parcelId: string | null;
  harvestDate: Date | string;
  harvestNumber: number;
  yieldKg: number;
  // Column-key placeholder for the "Lembaga Petani" column (rendered from
  // farmer.farmerGroup.name); not populated on the row itself.
  farmerGroupId?: string;
  farmer: {
    name: string;
    farmerId: string;
    farmerGroupId: string;
    farmerGroup: { name: string; districtId: string };
  };
  parcel: { parcelId: string } | null;
}

interface Props {
  initialRecords: ProductionRecord[];
  farmerGroups: GroupFilterOption[];
  districts: DistrictFilterOption[];
  permissions: string[];
  isSuperAdmin: boolean;
}

export function ProductionListClient({
  initialRecords,
  farmerGroups,
  districts,
  permissions,
  isSuperAdmin,
}: Props) {
  const [districtFilter, setDistrictFilter] = useState("all");
  const [farmerGroupFilter, setFarmerGroupFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("");
  const [hasParcelFilter, setHasParcelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const router = useRouter();

  const filtered = initialRecords.filter((r) => {
    const matchGroup = farmerGroupFilter === "all" || r.farmer.farmerGroupId === farmerGroupFilter;
    const matchDistrict =
      districtFilter === "all" || r.farmer.farmerGroup.districtId === districtFilter;
    const matchPeriod = !periodFilter || r.period === periodFilter;
    const matchParcel =
      hasParcelFilter === "all"
        ? true
        : hasParcelFilter === "true"
          ? r.parcelId !== null
          : r.parcelId === null;
    // Filter Status hanya berlaku untuk SUPERADMIN; user lain hanya menerima data aktif.
    const matchStatus = !isSuperAdmin
      ? true
      : statusFilter === "all"
        ? true
        : statusFilter === "active"
          ? r.isActive === true
          : r.isActive === false;

    return matchGroup && matchDistrict && matchPeriod && matchParcel && matchStatus;
  });

  async function handleToggleActive(id: string) {
    const result = await toggleProductionRecordActive(id);
    if (result.success) {
      toast.success("Status berhasil diubah");
      router.refresh();
    } else {
      toast.error(typeof result.error === "string" ? result.error : "Gagal mengubah status");
    }
  }

  const columns: DataTableColumn<ProductionRecord>[] = [
    {
      key: "farmer",
      label: "Petani",
      sortable: true,
      cellClassName: "text-sm font-medium",
      render: (row) => (
        <div>
          <div>{row.farmer.name}</div>
          <div className="text-xs text-muted-foreground font-mono">{row.farmer.farmerId}</div>
        </div>
      ),
    },
    {
      key: "farmerGroupId",
      label: "Lembaga Petani",
      sortable: true,
      cellClassName: "text-sm text-muted-foreground",
      render: (row) => row.farmer.farmerGroup.name,
    },
    {
      key: "parcel",
      label: "Lahan",
      sortable: true,
      cellClassName: "text-sm text-muted-foreground",
      render: (row) =>
        row.parcel ? (
          <Badge variant="outline" className="font-mono">
            {row.parcel.parcelId}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "period",
      label: "Periode",
      sortable: true,
      cellClassName: "text-sm text-muted-foreground",
      render: (row) => {
        const [year, month] = row.period.split("-");
        return `${MONTH_NAMES_ID[parseInt(month, 10) - 1]} ${year}`;
      },
    },
    {
      key: "harvestDate",
      label: "Tanggal Panen",
      sortable: true,
      cellClassName: "text-sm text-muted-foreground",
      render: (row) => {
        const d = new Date(row.harvestDate);
        return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
      },
    },
    {
      key: "harvestNumber",
      label: "Panen Ke-",
      sortable: true,
      cellClassName: "text-sm",
      render: (row) => <Badge variant="secondary">Ke-{row.harvestNumber}</Badge>,
    },
    {
      key: "yieldKg",
      label: "Hasil (kg)",
      sortable: true,
      cellClassName: "text-sm tabular-nums text-right font-semibold",
      render: (row) => row.yieldKg.toLocaleString("id-ID", { minimumFractionDigits: 1 }),
    },
    {
      key: "isActive",
      label: "Status",
      sortable: true,
      cellClassName: "text-sm",
      render: (row) => (
        <Badge variant={row.isActive ? "default" : "destructive"}>
          {row.isActive ? "Aktif" : "Nonaktif"}
        </Badge>
      ),
    },
  ];

  const getExportRow = (r: ProductionRecord) => {
    return {
      farmer: r.farmer.name,
      farmerGroupId: r.farmer.farmerGroup.name,
      parcel: r.parcel?.parcelId ?? "—",
      period: r.period,
      harvestDate: new Date(r.harvestDate).toLocaleDateString("id-ID"),
      harvestNumber: r.harvestNumber,
      yieldKg: r.yieldKg,
      isActive: r.isActive ? "Aktif" : "Nonaktif",
    };
  };

  const toolbarLeft = (
    <div className="flex flex-wrap items-center gap-2">
      {/* Distrik + Lembaga Petani filter (cascade) */}
      <DistrictGroupFilter
        districts={districts}
        farmerGroups={farmerGroups}
        districtFilter={districtFilter}
        groupFilter={farmerGroupFilter}
        onDistrictFilterChange={setDistrictFilter}
        onGroupFilterChange={setFarmerGroupFilter}
      />

      {/* Period filter (Month Picker / Input) */}
      <Input
        type="month"
        value={periodFilter}
        onChange={(e) => setPeriodFilter(e.target.value)}
        className="w-[160px] h-9"
      />

      {/* Lahan filter */}
      <Select value={hasParcelFilter} onValueChange={(val) => setHasParcelFilter(val ?? "all")}>
        <SelectTrigger className="w-[160px] h-9">
          <SelectValue placeholder="Lahan" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua Lahan</SelectItem>
          <SelectItem value="true">Terpetakan</SelectItem>
          <SelectItem value="false">Belum Terpetakan</SelectItem>
        </SelectContent>
      </Select>

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
      onClick={() => router.push("/admin/master-data/production/new")}
      className="h-9"
    >
      <Plus className="h-4 w-4 mr-2" />
      Tambah Data
    </Button>
  ) : undefined;

  return (
    <Card className="p-4">
      <DataTable
        columns={isSuperAdmin ? columns : columns.filter((c) => c.key !== "isActive")}
        data={filtered}
        rowKey={(r) => r.id}
        searchPlaceholder="Cari nama petani atau ID petani..."
        searchFn={(row, query) => {
          return (
            row.farmer.name.toLowerCase().includes(query) ||
            row.farmer.farmerId.toLowerCase().includes(query)
          );
        }}
        toolbarLeft={toolbarLeft}
        toolbarRight={toolbarRight}
        exportFilename="data-produksi"
        canExport={permissions.includes("EXPORT")}
        getExportRow={getExportRow}
        renderActions={(row) => (
          <TableActions
            permissions={permissions}
            actions={[
              {
                type: "view",
                onClick: () => router.push(`/admin/master-data/production/${row.id}`),
              },
              {
                type: "edit",
                onClick: () => router.push(`/admin/master-data/production/${row.id}/edit`),
              },
              {
                type: "delete",
                isActive: row.isActive,
                onClick: () => handleToggleActive(row.id),
              },
            ]}
          />
        )}
      />
    </Card>
  );
}
