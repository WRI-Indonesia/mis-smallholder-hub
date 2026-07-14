"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Plus, Check, ChevronsUpDown } from "lucide-react";
import { ParcelFormModal } from "./parcel-form-modal";
import { toggleLandParcelActive } from "@/server/actions/land-parcel";
import { toast } from "sonner";
import { TableActions, DataTable, type DataTableColumn } from "@/components/shared";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

import type { LandParcel, FarmerSelect, FarmerGroupSelect } from "@/types/land-parcel";

interface Props {
  initialParcels: unknown[];
  farmers: FarmerSelect[];
  farmerGroups: FarmerGroupSelect[];
  permissions: string[];
  isSuperAdmin: boolean;
}

export function ParcelListClient({ initialParcels, farmers, farmerGroups, permissions, isSuperAdmin }: Props) {
  const [groupFilter, setGroupFilter] = useState("all");
  const [groupComboOpen, setGroupComboOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("active");
  const [showForm, setShowForm] = useState(false);
  const [editParcel, setEditParcel] = useState<LandParcel | null>(null);
  const router = useRouter();

  const filtered = (initialParcels as LandParcel[]).filter((p) => {
    const matchGroup = groupFilter === "all" || p.farmer.farmerGroup.id === groupFilter;
    // Filter Status hanya berlaku untuk SUPERADMIN; user lain hanya menerima data aktif.
    const matchStatus =
      !isSuperAdmin ? true : statusFilter === "all" ? true : statusFilter === "active" ? p.isActive : !p.isActive;
    return matchGroup && matchStatus;
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
      key: "subGroupLv1",
      label: "Gapoktan",
      sortable: true,
      defaultVisible: false,
      cellClassName: "text-sm text-muted-foreground",
      render: (row) => row.subGroupLv1 ?? "—",
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
      render: (row) => row.area !== null ? row.area.toFixed(2) : "—",
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
      subGroupLv1: p.subGroupLv1 ?? "—",
      subGroupLv2: p.subGroupLv2 ?? "—",
      area: p.area !== null ? p.area : "—",
      landStatus: p.landStatus ?? "—",
      cropType: p.cropType ?? "—",
      plantingYear: p.plantingYear ?? "—",
      revision: p.revision,
      districtName: p.farmer.farmerGroup.district.name,
    };
  };

  const selectedGroup = farmerGroups.find((g) => g.id === groupFilter);

  const toolbarLeft = (
    <div className="flex flex-wrap items-center gap-2">
      <Popover open={groupComboOpen} onOpenChange={setGroupComboOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={groupComboOpen}
              className="w-[330px] justify-between h-9 font-normal text-left"
            >
              {groupFilter === "all" ? (
                <span>Semua Lembaga Petani</span>
              ) : (
                <span>{selectedGroup?.name}</span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          }
        />
        <PopoverContent className="w-[330px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Cari lembaga petani..." />
            <CommandList className="max-h-[300px]">
              <CommandEmpty>Lembaga Petani tidak ditemukan.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="all"
                  onSelect={() => {
                    setGroupFilter("all");
                    setGroupComboOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      groupFilter === "all" ? "opacity-100" : "opacity-0"
                    )}
                  />
                  Semua Lembaga Petani
                </CommandItem>
                {farmerGroups.map((g) => (
                  <CommandItem
                    key={g.id}
                    value={`${g.name} ${g.code || ""}`}
                    onSelect={() => {
                      setGroupFilter(g.id);
                      setGroupComboOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        groupFilter === g.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {g.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

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
    <Button size="sm" onClick={() => { setEditParcel(null); setShowForm(true); }} className="h-9">
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
        onClose={() => { setShowForm(false); setEditParcel(null); }}
        parcel={editParcel}
        farmers={farmers}
      />
    </>
  );
}
