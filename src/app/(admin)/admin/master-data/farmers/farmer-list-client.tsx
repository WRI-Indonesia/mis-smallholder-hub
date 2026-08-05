"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Building, Users, User, UserCheck } from "lucide-react";
import { FarmerFormModal } from "./farmer-form-modal";
import { toggleFarmerActive } from "@/server/actions/farmer";
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
import { maskNik, maskBirthDate } from "@/lib/mask";

interface Farmer {
  id: string;
  farmerGroupId: string;
  farmerGroup: {
    name: string;
    district: {
      id: string;
      name: string;
    };
  };
  gender: "M" | "F";
  name: string;
  farmerId: string;
  // Column-key placeholder for the "Distrik" column (rendered from
  // farmerGroup.district.name); not populated on the row itself.
  district?: string;
  nik: string | null;
  address: string | null;
  birthPlace: string | null;
  birthDate: Date | string | null;
  joinedYear: number | null;
  isActive: boolean;
}

interface Props {
  initialFarmers: Farmer[];
  farmerGroups: GroupFilterOption[];
  districts: DistrictFilterOption[];
  permissions: string[];
  isSuperAdmin: boolean;
}

const formatNumber = (n: number) => new Intl.NumberFormat("id-ID").format(n);

export function FarmerListClient({
  initialFarmers,
  farmerGroups,
  districts,
  permissions,
  isSuperAdmin,
}: Props) {
  const [districtFilter, setDistrictFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [showForm, setShowForm] = useState(false);
  const [editFarmer, setEditFarmer] = useState<Farmer | null>(null);
  const router = useRouter();

  const filtered = initialFarmers.filter((f) => {
    const matchGroup = groupFilter === "all" || f.farmerGroupId === groupFilter;
    const matchDistrict = districtFilter === "all" || f.farmerGroup.district.id === districtFilter;
    // Filter Status hanya berlaku untuk SUPERADMIN; user lain hanya menerima data aktif.
    const matchStatus = !isSuperAdmin
      ? true
      : statusFilter === "all"
        ? true
        : statusFilter === "active"
          ? f.isActive
          : !f.isActive;
    return matchGroup && matchDistrict && matchStatus;
  });

  async function handleToggleActive(id: string) {
    const result = await toggleFarmerActive(id);
    if (result.success) {
      toast.success("Status berhasil diubah");
      router.refresh();
    } else {
      toast.error("Gagal mengubah status");
    }
  }

  const columns: DataTableColumn<Farmer>[] = [
    {
      key: "farmerId",
      label: "ID Petani",
      sortable: true,
      cellClassName: "text-sm font-mono text-muted-foreground",
    },
    {
      key: "name",
      label: "Nama",
      sortable: true,
      cellClassName: "text-sm font-medium",
    },
    {
      key: "gender",
      label: "L/P",
      sortable: true,
      render: (row) => (
        <Badge variant="secondary">{row.gender === "M" ? "Laki-laki" : "Perempuan"}</Badge>
      ),
    },
    {
      key: "nik",
      label: "NIK",
      sortable: true,
      cellClassName: "text-sm font-mono text-muted-foreground",
      // Sensor di layar (Excel export tetap penuh — bisa di-upload ulang).
      render: (row) => maskNik(row.nik),
    },
    {
      key: "birthPlace",
      label: "Tempat Lahir",
      sortable: true,
      cellClassName: "text-sm text-muted-foreground",
      render: (row) => row.birthPlace ?? "—",
    },
    {
      key: "birthDate",
      label: "Tanggal Lahir",
      sortable: true,
      cellClassName: "text-sm text-muted-foreground tabular-nums",
      render: (row) => maskBirthDate(row.birthDate),
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
    {
      key: "farmerGroup",
      label: "Lembaga Petani",
      sortable: true,
      cellClassName: "text-sm text-muted-foreground",
      render: (row) => row.farmerGroup.name,
    },
    {
      key: "joinedYear",
      label: "Tahun Bergabung",
      sortable: true,
      cellClassName: "text-sm text-muted-foreground tabular-nums",
      render: (row) => row.joinedYear ?? "—",
    },
    {
      key: "district",
      label: "Distrik",
      sortable: true,
      cellClassName: "text-sm text-muted-foreground",
      render: (row) => row.farmerGroup.district.name,
    },
  ];

  const getExportRow = (f: Farmer) => {
    return {
      farmerId: f.farmerId,
      name: f.name,
      gender: f.gender === "M" ? "Laki-laki" : "Perempuan",
      farmerGroup: f.farmerGroup.name,
      joinedYear: f.joinedYear ?? "—",
      district: f.farmerGroup.district.name,
      nik: f.nik ?? "—",
      address: f.address ?? "—",
      birthPlace: f.birthPlace ?? "—",
      birthDate: f.birthDate
        ? new Date(f.birthDate).toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })
        : "—",
      isActive: f.isActive ? "Aktif" : "Nonaktif",
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
        setEditFarmer(null);
        setShowForm(true);
      }}
      className="h-9"
    >
      <Plus className="h-4 w-4 mr-2" />
      Tambah Petani
    </Button>
  ) : undefined;

  const totalKelompokTani = new Set(filtered.map((f) => f.farmerGroupId)).size;
  const totalPetani = filtered.length;
  const totalLakiLaki = filtered.filter((f) => f.gender === "M").length;
  const totalPerempuan = filtered.filter((f) => f.gender === "F").length;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total Lembaga Petani
              </p>
              <h3 className="text-2xl font-bold mt-1.5 tabular-nums">
                {formatNumber(totalKelompokTani)}
              </h3>
            </div>
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <Building className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total Petani
              </p>
              <h3 className="text-2xl font-bold mt-1.5 tabular-nums">
                {formatNumber(totalPetani)} Petani
              </h3>
            </div>
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Petani Laki-laki
              </p>
              <h3 className="text-2xl font-bold mt-1.5 tabular-nums">
                {formatNumber(totalLakiLaki)} Petani
              </h3>
            </div>
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <User className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Petani Perempuan
              </p>
              <h3 className="text-2xl font-bold mt-1.5 tabular-nums">
                {formatNumber(totalPerempuan)} Petani
              </h3>
            </div>
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <UserCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="p-4">
        <DataTable
          columns={isSuperAdmin ? columns : columns.filter((c) => c.key !== "isActive")}
          data={filtered}
          rowKey={(f) => f.id}
          searchPlaceholder="Cari nama, ID petani, atau NIK..."
          searchKeys={["name", "farmerId", "nik"]}
          toolbarLeft={toolbarLeft}
          toolbarRight={toolbarRight}
          exportFilename="data-farmers"
          getExportRow={getExportRow}
          renderActions={(farmer) => (
            <TableActions
              permissions={permissions}
              actions={[
                {
                  type: "view",
                  onClick: () => router.push(`/admin/master-data/farmers/${farmer.id}`),
                },
                {
                  type: "edit",
                  onClick: () => {
                    setEditFarmer(farmer);
                    setShowForm(true);
                  },
                },
                {
                  type: "delete",
                  isActive: farmer.isActive,
                  onClick: () => handleToggleActive(farmer.id),
                },
              ]}
            />
          )}
        />
      </Card>

      <FarmerFormModal
        key={editFarmer?.id ?? "new"}
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setEditFarmer(null);
        }}
        farmer={editFarmer}
        farmerGroups={farmerGroups}
      />
    </>
  );
}
