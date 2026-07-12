"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Check, ChevronsUpDown } from "lucide-react";
import { ParcelFormModal } from "./parcel-form-modal";
import { deleteLandParcel } from "@/server/actions/land-parcel";
import { toast } from "sonner";
import { TableActions, DataTable, type DataTableColumn } from "@/components/shared";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

import type { LandParcel, FarmerSelect } from "@/types/land-parcel.types";

interface Props {
  initialParcels: unknown[];
  farmers: FarmerSelect[];
  permissions: string[];
}

export function ParcelListClient({ initialParcels, farmers, permissions }: Props) {
  const [farmerFilter, setFarmerFilter] = useState("all");
  const [farmerComboOpen, setFarmerComboOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editParcel, setEditParcel] = useState<LandParcel | null>(null);
  const router = useRouter();

  const filtered = (initialParcels as LandParcel[]).filter((p) => {
    return farmerFilter === "all" || p.farmerId === farmerFilter;
  });

  async function handleDelete(id: string) {
    const result = await deleteLandParcel(id);
    if (result.success) {
      toast.success("Lahan berhasil dinonaktifkan");
      router.refresh();
    } else {
      toast.error(typeof result.error === "string" ? result.error : "Gagal menonaktifkan lahan");
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
  ];

  const getExportRow = (p: LandParcel) => {
    return {
      parcelId: p.parcelId,
      farmer: p.farmer.name,
      farmerId: p.farmer.farmerId,
      area: p.area !== null ? p.area : "—",
      landStatus: p.landStatus ?? "—",
      cropType: p.cropType ?? "—",
      plantingYear: p.plantingYear ?? "—",
      revision: p.revision,
      groupName: p.farmer.farmerGroup.name,
      districtName: p.farmer.farmerGroup.district.name,
    };
  };

  const selectedFarmer = farmers.find((f) => f.id === farmerFilter);

  const toolbarLeft = (
    <div className="flex flex-wrap items-center gap-2">
      <Popover open={farmerComboOpen} onOpenChange={setFarmerComboOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={farmerComboOpen}
              className="w-[280px] justify-between h-9 font-normal text-left"
            >
              {farmerFilter === "all" ? (
                <span>Semua Petani</span>
              ) : (
                <span>{selectedFarmer?.name} ({selectedFarmer?.farmerId})</span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          }
        />
        <PopoverContent className="w-[280px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Cari petani..." />
            <CommandList className="max-h-[300px]">
              <CommandEmpty>Petani tidak ditemukan.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="all"
                  onSelect={() => {
                    setFarmerFilter("all");
                    setFarmerComboOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      farmerFilter === "all" ? "opacity-100" : "opacity-0"
                    )}
                  />
                  Semua Petani
                </CommandItem>
                {farmers.map((f) => (
                  <CommandItem
                    key={f.id}
                    value={`${f.name} ${f.farmerId}`}
                    onSelect={() => {
                      setFarmerFilter(f.id);
                      setFarmerComboOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        farmerFilter === f.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {f.name} ({f.farmerId})
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
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
          columns={columns}
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
                  onClick: () => handleDelete(parcel.id),
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
