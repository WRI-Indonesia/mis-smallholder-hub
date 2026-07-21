"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Building, Users, Layers, Trees } from "lucide-react";
import { GroupFormModal } from "./group-form-modal";
import { toggleFarmerGroupActive } from "@/server/actions/farmer-group";
import { toast } from "sonner";
import { TableActions, DataTable, type DataTableColumn } from "@/components/shared";
import {
  GROUP_TYPE_LABELS,
  formatGroupType,
  formatRspoCert,
  formatIspoCert,
  formatSapMapAssurance,
} from "@/lib/farmer-group-labels";

interface FarmerGroup {
  id: string;
  code: string | null;
  abrv: string | null;
  abrv3id: string | null;
  name: string;
  category: string;
  groupType: string | null;
  districtId: string;
  district: { name: string };
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
  farmersCount: number;
  parcelsCount: number;
  totalArea: number;
}

interface District {
  id: string;
  name: string;
}

interface Props {
  initialGroups: FarmerGroup[];
  districts: District[];
  permissions: string[];
  isSuperAdmin: boolean;
}

// Urutan sort kolom sertifikasi/assurance: Tersertifikasi (per tahun, tanpa
// tahun terakhir) → Plan (per tahun) → kosong. Dipakai RSPO/ISPO/SAP-MAP.
const certSortValue = (year: number | null, status: string | null) =>
  status === "CERTIFIED" ? `0-${year ?? 9999}` : status === "PLANNED" ? `1-${year ?? 9999}` : null;

const formatNumber = (n: number) => new Intl.NumberFormat("id-ID").format(n);
const formatArea = (n: number) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);


export function GroupListClient({ initialGroups, districts, permissions, isSuperAdmin }: Props) {
  const [districtFilter, setDistrictFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [showForm, setShowForm] = useState(false);
  const [editGroup, setEditGroup] = useState<FarmerGroup | null>(null);
  const router = useRouter();

  const filtered = initialGroups.filter((g) => {
    const matchDistrict = districtFilter === "all" || g.districtId === districtFilter;
    // Filter Status hanya berlaku untuk SUPERADMIN; user lain hanya menerima data aktif.
    const matchStatus =
      !isSuperAdmin ? true : statusFilter === "all" ? true : statusFilter === "active" ? g.isActive : !g.isActive;
    return matchDistrict && matchStatus;
  });

  async function handleToggleActive(id: string) {
    const result = await toggleFarmerGroupActive(id);
    if (result.success) {
      toast.success("Status berhasil diubah");
      router.refresh();
    } else {
      toast.error("Gagal mengubah status");
    }
  }

  const columns: DataTableColumn<FarmerGroup>[] = [
    {
      key: "code",
      label: "Kode",
      sortable: true,
      cellClassName: "text-sm font-mono text-muted-foreground",
      render: (row) => row.code ?? "—",
    },
    {
      key: "name",
      label: "Nama",
      sortable: true,
      cellClassName: "text-sm font-medium",
    },
    {
      key: "district",
      label: "Distrik",
      sortable: true,
      cellClassName: "text-sm text-muted-foreground",
      render: (row) => row.district.name,
    },
    {
      key: "groupType",
      label: "Tipe Grup",
      sortable: true,
      render: (row) =>
        row.groupType ? (
          <Badge variant="outline">{GROUP_TYPE_LABELS[row.groupType] ?? row.groupType}</Badge>
        ) : (
          "—"
        ),
    },
    {
      key: "category",
      label: "Kategori",
      sortable: true,
      render: (row) => (
        <Badge variant="secondary">
          {row.category === "EX_PLASMA" ? "Ex Plasma" : "Swadaya"}
        </Badge>
      ),
    },
    {
      key: "farmersCount",
      label: "Total Petani",
      sortable: true,
      cellClassName: "text-sm text-muted-foreground tabular-nums",
      render: (row) => `${formatNumber(row.farmersCount)} orang`,
    },
    {
      key: "parcelsCount",
      label: "Total Persil",
      sortable: true,
      defaultVisible: false,
      cellClassName: "text-sm text-muted-foreground tabular-nums",
      render: (row) => `${formatNumber(row.parcelsCount)} persil`,
    },
    {
      key: "totalArea",
      label: "Luas Lahan",
      sortable: true,
      cellClassName: "text-sm text-muted-foreground tabular-nums",
      render: (row) => `${formatArea(row.totalArea)} Ha`,
    },
    {
      key: "joinYear",
      label: "Tahun Bergabung Program",
      sortable: true,
      cellClassName: "text-sm text-muted-foreground tabular-nums",
      defaultVisible: true,
      render: (row) => row.joinYear ?? "—",
    },
    {
      key: "establishedYear",
      label: "Tahun Berdiri Lembaga",
      sortable: true,
      cellClassName: "text-sm text-muted-foreground tabular-nums",
      defaultVisible: true,
      render: (row) => row.establishedYear ?? "—",
    },
    {
      key: "rspoCertYear",
      label: "Sertifikasi RSPO",
      sortable: true,
      cellClassName: "text-sm text-muted-foreground tabular-nums",
      defaultVisible: true,
      render: (row) => formatRspoCert(row),
      // Urutan: Tersertifikasi (per tahun, tanpa tahun terakhir) → Plan (per tahun) → kosong.
      sortValue: (row) => certSortValue(row.rspoCertYear, row.rspoCertStatus),
    },
    {
      key: "ispoCertYear",
      label: "Sertifikasi ISPO",
      sortable: true,
      cellClassName: "text-sm text-muted-foreground tabular-nums",
      defaultVisible: true,
      render: (row) => formatIspoCert(row),
      sortValue: (row) => certSortValue(row.ispoCertYear, row.ispoCertStatus),
    },
    {
      key: "sapMapAssuranceYear",
      label: "Assurance SAP/MAP",
      sortable: true,
      cellClassName: "text-sm text-muted-foreground tabular-nums",
      defaultVisible: true,
      render: (row) => formatSapMapAssurance(row),
      sortValue: (row) => certSortValue(row.sapMapAssuranceYear, row.sapMapAssuranceStatus),
    },
    {
      key: "locationLat",
      label: "Lat",
      sortable: true,
      cellClassName: "text-sm font-mono text-muted-foreground",
      defaultVisible: false,
      render: (row) => row.locationLat ?? "—",
    },
    {
      key: "locationLong",
      label: "Long",
      sortable: true,
      cellClassName: "text-sm font-mono text-muted-foreground",
      defaultVisible: false,
      render: (row) => row.locationLong ?? "—",
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

  const getExportRow = (g: FarmerGroup) => {
    return {
      code: g.code ?? "—",
      name: g.name,
      district: g.district.name,
      groupType: formatGroupType(g.groupType),
      category: g.category === "EX_PLASMA" ? "Ex Plasma" : "Swadaya",
      farmersCount: g.farmersCount,
      parcelsCount: g.parcelsCount,
      totalArea: g.totalArea,
      joinYear: g.joinYear ?? "—",
      establishedYear: g.establishedYear ?? "—",
      rspoCertYear: formatRspoCert(g),
      ispoCertYear: formatIspoCert(g),
      sapMapAssuranceYear: formatSapMapAssurance(g),
      locationLat: g.locationLat ?? "—",
      locationLong: g.locationLong ?? "—",
      isActive: g.isActive ? "Aktif" : "Nonaktif",
    };
  };

  const selectedDistrictName = districtFilter === "all"
    ? "Semua Distrik"
    : districts.find((d) => d.id === districtFilter)?.name ?? districtFilter;

  const toolbarLeft = (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={districtFilter} onValueChange={(v) => setDistrictFilter(v ?? "all")}>
        <SelectTrigger className="w-[180px] h-9">
          <SelectValue placeholder="Semua Distrik">
            {selectedDistrictName}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua Distrik</SelectItem>
          {districts.map((d) => (
            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status filter — hanya SUPERADMIN */}
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

  const toolbarRight = permissions.includes("CREATE") ? (
    <Button size="sm" onClick={() => { setEditGroup(null); setShowForm(true); }} className="h-9">
      <Plus className="h-4 w-4 mr-2" />
      Tambah Lembaga Petani
    </Button>
  ) : undefined;

  const totalKT = filtered.length;
  const totalPetani = filtered.reduce((sum, g) => sum + g.farmersCount, 0);
  const totalPersil = filtered.reduce((sum, g) => sum + g.parcelsCount, 0);
  const totalLuas = filtered.reduce((sum, g) => sum + g.totalArea, 0);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Lembaga Petani</p>
              <h3 className="text-2xl font-bold mt-1.5 tabular-nums">{formatNumber(totalKT)}</h3>
            </div>
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <Building className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Petani</p>
              <h3 className="text-2xl font-bold mt-1.5 tabular-nums">{formatNumber(totalPetani)} orang</h3>
            </div>
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Persil Lahan</p>
              <h3 className="text-2xl font-bold mt-1.5 tabular-nums">{formatNumber(totalPersil)} persil</h3>
            </div>
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <Layers className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Luas Lahan</p>
              <h3 className="text-2xl font-bold mt-1.5 tabular-nums">{formatArea(totalLuas)} Ha</h3>
            </div>
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <Trees className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="p-4">
        <DataTable
          columns={isSuperAdmin ? columns : columns.filter((c) => c.key !== "isActive")}
          data={filtered}
          rowKey={(g) => g.id}
          searchPlaceholder="Cari nama, kode, atau singkatan..."
          searchKeys={["name", "code", "abrv"]}
          toolbarLeft={toolbarLeft}
          toolbarRight={toolbarRight}
          exportFilename="data-farmer-groups"
          getExportRow={getExportRow}
          renderActions={(group) => (
            <TableActions
              permissions={permissions}
              actions={[
                {
                  type: "view",
                  onClick: () => router.push(`/admin/master-data/groups/${group.id}`),
                },
                {
                  type: "edit",
                  onClick: () => {
                    setEditGroup(group);
                    setShowForm(true);
                  },
                },
                {
                  type: "delete",
                  isActive: group.isActive,
                  onClick: () => handleToggleActive(group.id),
                },
              ]}
            />
          )}
        />
      </Card>

      <GroupFormModal
        key={editGroup?.id ?? "new"}
        open={showForm}
        onClose={() => { setShowForm(false); setEditGroup(null); }}
        group={editGroup}
        districts={districts}
      />
    </>
  );
}
