"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Plus, Check, ChevronsUpDown } from "lucide-react";
import { deleteProductionRecord } from "@/server/actions/production";
import { toast } from "sonner";
import { TableActions, DataTable, type DataTableColumn } from "@/components/shared";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Props {
  initialRecords: any[];
  farmerGroups: { id: string; name: string }[];
  permissions: string[];
}

export function ProductionListClient({ initialRecords, farmerGroups, permissions }: Props) {
  const [farmerGroupFilter, setFarmerGroupFilter] = useState("all");
  const [farmerGroupComboOpen, setFarmerGroupComboOpen] = useState(false);
  const [periodFilter, setPeriodFilter] = useState("");
  const [hasParcelFilter, setHasParcelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const router = useRouter();

  const filtered = initialRecords.filter((r) => {
    const matchGroup = farmerGroupFilter === "all" || r.farmer.farmerGroupId === farmerGroupFilter;
    const matchPeriod = !periodFilter || r.period === periodFilter;
    const matchParcel =
      hasParcelFilter === "all"
        ? true
        : hasParcelFilter === "true"
        ? r.parcelId !== null
        : r.parcelId === null;
    const matchStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "active"
        ? r.isActive === true
        : r.isActive === false;

    return matchGroup && matchPeriod && matchParcel && matchStatus;
  });

  async function handleDelete(id: string) {
    const result = await deleteProductionRecord(id);
    if (result.success) {
      toast.success("Data produksi berhasil dinonaktifkan");
      router.refresh();
    } else {
      toast.error(typeof result.error === "string" ? result.error : "Gagal menonaktifkan data produksi");
    }
  }

  const columns: DataTableColumn<any>[] = [
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
      label: "Kelompok Tani",
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
        const months = [
          "Januari", "Februari", "Maret", "April", "Mei", "Juni",
          "Juli", "Agustus", "September", "Oktober", "November", "Desember"
        ];
        return `${months[parseInt(month, 10) - 1]} ${year}`;
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
      render: (row) => (
        <Badge variant="secondary">Ke-{row.harvestNumber}</Badge>
      ),
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

  const getExportRow = (r: any) => {
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

  const selectedGroup = farmerGroups.find((g) => g.id === farmerGroupFilter);

  const toolbarLeft = (
    <div className="flex flex-wrap items-center gap-2">
      {/* Kelompok Tani filter (Combobox) */}
      <Popover open={farmerGroupComboOpen} onOpenChange={setFarmerGroupComboOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={farmerGroupComboOpen}
              className="w-[240px] justify-between h-9 font-normal text-left"
            >
              {farmerGroupFilter === "all" ? (
                <span>Semua Kelompok Tani</span>
              ) : (
                <span>{selectedGroup?.name}</span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          }
        />
        <PopoverContent className="w-[240px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Cari kelompok tani..." />
            <CommandList className="max-h-[300px]">
              <CommandEmpty>Kelompok Tani tidak ditemukan.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="all"
                  onSelect={() => {
                    setFarmerGroupFilter("all");
                    setFarmerGroupComboOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      farmerGroupFilter === "all" ? "opacity-100" : "opacity-0"
                    )}
                  />
                  Semua Kelompok Tani
                </CommandItem>
                {farmerGroups.map((g) => (
                  <CommandItem
                    key={g.id}
                    value={g.name}
                    onSelect={() => {
                      setFarmerGroupFilter(g.id);
                      setFarmerGroupComboOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        farmerGroupFilter === g.id ? "opacity-100" : "opacity-0"
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

      {/* Status filter */}
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
    </div>
  );

  const toolbarRight = permissions.includes("CREATE") ? (
    <Button size="sm" onClick={() => router.push("/admin/master-data/production/new")} className="h-9">
      <Plus className="h-4 w-4 mr-2" />
      Tambah Data
    </Button>
  ) : undefined;

  return (
    <Card className="p-4">
      <DataTable
        columns={columns}
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
                onClick: () => handleDelete(row.id),
              },
            ]}
          />
        )}
      />
    </Card>
  );
}
