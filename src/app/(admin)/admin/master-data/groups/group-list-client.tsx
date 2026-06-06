"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { GroupFormModal } from "./group-form-modal";
import { toggleFarmerGroupActive } from "@/server/actions/farmer-group";
import { toast } from "sonner";
import { TableActions, DataTable, type DataTableColumn } from "@/components/shared";

interface FarmerGroup {
  id: string;
  code: string | null;
  abrv: string | null;
  abrv3id: string | null;
  name: string;
  category: string;
  districtId: string;
  district: { name: string };
  joinYear: number | null;
  locationLat: number | null;
  locationLong: number | null;
  isActive: boolean;
}

interface District {
  id: string;
  name: string;
}

interface Props {
  initialGroups: FarmerGroup[];
  districts: District[];
  permissions: string[];
}

export function GroupListClient({ initialGroups, districts, permissions }: Props) {
  const [districtFilter, setDistrictFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editGroup, setEditGroup] = useState<FarmerGroup | null>(null);
  const router = useRouter();

  const filtered = initialGroups.filter((g) => {
    return districtFilter === "all" || g.districtId === districtFilter;
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
      key: "joinYear",
      label: "Tahun Bergabung",
      sortable: true,
      cellClassName: "text-sm text-muted-foreground tabular-nums",
      defaultVisible: true,
      render: (row) => row.joinYear ?? "—",
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
      category: g.category === "EX_PLASMA" ? "Ex Plasma" : "Swadaya",
      joinYear: g.joinYear ?? "—",
      locationLat: g.locationLat ?? "—",
      locationLong: g.locationLong ?? "—",
      isActive: g.isActive ? "Aktif" : "Nonaktif",
    };
  };

  const toolbarLeft = (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={districtFilter} onValueChange={(v) => setDistrictFilter(v ?? "all")}>
        <SelectTrigger className="w-[180px] h-9">
          <SelectValue placeholder="Semua Distrik" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua Distrik</SelectItem>
          {districts.map((d) => (
            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const toolbarRight = permissions.includes("CREATE") ? (
    <Button size="sm" onClick={() => { setEditGroup(null); setShowForm(true); }} className="h-9">
      <Plus className="h-4 w-4 mr-2" />
      Tambah KT
    </Button>
  ) : undefined;

  return (
    <>
      <Card className="p-4">
        <DataTable
          columns={columns}
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
