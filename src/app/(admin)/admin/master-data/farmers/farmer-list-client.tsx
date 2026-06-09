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
import { Plus, Check, ChevronsUpDown } from "lucide-react";
import { FarmerFormModal } from "./farmer-form-modal";
import { toggleFarmerActive } from "@/server/actions/farmer";
import { toast } from "sonner";
import { TableActions, DataTable, type DataTableColumn } from "@/components/shared";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface Farmer {
  id: string;
  farmerGroupId: string;
  farmerGroup: {
    name: string;
    district: {
      name: string;
    };
  };
  gender: "M" | "F";
  name: string;
  farmerId: string;
  nik: string | null;
  address: string | null;
  birthPlace: string | null;
  birthDate: Date | string | null;
  isActive: boolean;
}

interface FarmerGroup {
  id: string;
  name: string;
}

interface Props {
  initialFarmers: Farmer[];
  farmerGroups: FarmerGroup[];
  permissions: string[];
}

export function FarmerListClient({ initialFarmers, farmerGroups, permissions }: Props) {
  const [groupFilter, setGroupFilter] = useState("all");
  const [comboOpen, setComboOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editFarmer, setEditFarmer] = useState<Farmer | null>(null);
  const router = useRouter();

  const filtered = initialFarmers.filter((f) => {
    return groupFilter === "all" || f.farmerGroupId === groupFilter;
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
        <Badge variant="secondary">
          {row.gender === "M" ? "Laki-laki" : "Perempuan"}
        </Badge>
      ),
    },
    {
      key: "nik",
      label: "NIK",
      sortable: true,
      cellClassName: "text-sm font-mono text-muted-foreground",
      render: (row) => row.nik ?? "—",
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
      render: (row) =>
        row.birthDate
          ? new Date(row.birthDate).toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })
          : "—",
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
      label: "Kelompok Tani",
      sortable: true,
      cellClassName: "text-sm text-muted-foreground",
      render: (row) => row.farmerGroup.name,
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

  const selectedGroup = farmerGroups.find((g) => g.id === groupFilter);

  const toolbarLeft = (
    <div className="flex flex-wrap items-center gap-2">
      <Popover open={comboOpen} onOpenChange={setComboOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={comboOpen}
            className="w-[230px] justify-between h-9 font-normal text-left"
          >
            {groupFilter === "all" ? (
              <span>Semua Kelompok Tani</span>
            ) : (
              <span>{selectedGroup?.name}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Cari kelompok tani..." />
            <CommandList className="max-h-[300px]">
              <CommandEmpty>Kelompok Tani tidak ditemukan.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="all"
                  onSelect={() => {
                    setGroupFilter("all");
                    setComboOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      groupFilter === "all" ? "opacity-100" : "opacity-0"
                    )}
                  />
                  Semua Kelompok Tani
                </CommandItem>
                {farmerGroups.map((g) => (
                  <CommandItem
                    key={g.id}
                    value={`${g.name} ${g.code || ""}`}
                    onSelect={() => {
                      setGroupFilter(g.id);
                      setComboOpen(false);
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
    </div>
  );

  const toolbarRight = permissions.includes("CREATE") ? (
    <Button size="sm" onClick={() => { setEditFarmer(null); setShowForm(true); }} className="h-9">
      <Plus className="h-4 w-4 mr-2" />
      Tambah Petani
    </Button>
  ) : undefined;

  return (
    <>
      <Card className="p-4">
        <DataTable
          columns={columns}
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
        onClose={() => { setShowForm(false); setEditFarmer(null); }}
        farmer={editFarmer}
        farmerGroups={farmerGroups}
      />
    </>
  );
}
