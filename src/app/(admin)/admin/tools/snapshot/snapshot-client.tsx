"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, ChevronsUpDown, Camera, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { TableActions } from "@/components/shared/table-actions";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { generateSnapshot, deleteSnapshot } from "@/server/actions/snapshot";
import type { DashboardFilterOptions, SnapshotListItem } from "@/types/dashboard";

interface Props {
  snapshots: SnapshotListItem[];
  filterOptions: DashboardFilterOptions;
  permissions: string[];
}

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()}, ${time}`;
};

const formatArea = (n: number) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export function SnapshotClient({ snapshots, filterOptions, permissions }: Props) {
  const router = useRouter();

  const [districtId, setDistrictId] = useState<string | null>(null);
  const [joinedYear, setJoinedYear] = useState<number | null>(null);
  const [districtOpen, setDistrictOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const canCreate = permissions.includes("CREATE");
  const selectedDistrict = filterOptions.districts.find((d) => d.id === districtId);

  const handleGenerate = () => {
    startTransition(async () => {
      const result = await generateSnapshot({ districtId, joinedYear });
      if (result.success) {
        toast.success("Snapshot berhasil dibuat");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleReset = () => {
    setDistrictId(null);
    setJoinedYear(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const result = await deleteSnapshot(deleteTarget);
    if (result.success) {
      toast.success("Snapshot berhasil dinonaktifkan");
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setDeleteTarget(null);
  };

  const columns: DataTableColumn<SnapshotListItem>[] = [
    {
      key: "id",
      label: "Aksi",
      sortable: false,
      toggleable: false,
      headerClassName: "w-[1%] whitespace-nowrap",
      cellClassName: "w-[1%] whitespace-nowrap",
      render: (row) => (
        <TableActions
          permissions={permissions}
          actions={[
            { type: "view", onClick: () => router.push(`/admin/tools/snapshot/${row.id}`), title: "Lihat" },
            { type: "delete", onClick: () => setDeleteTarget(row.id), title: "Nonaktifkan", isActive: true },
          ]}
        />
      ),
    },
    {
      key: "snapshotDate",
      label: "Tanggal Snapshot",
      sortable: true,
      cellClassName: "text-sm tabular-nums",
      render: (row) => formatDateTime(row.snapshotDate),
    },
    {
      key: "districtName",
      label: "Distrik",
      sortable: true,
      cellClassName: "text-sm",
      render: (row) => row.districtName ?? <span className="text-muted-foreground">Semua</span>,
    },
    {
      key: "joinedYear",
      label: "Tahun Bergabung",
      sortable: true,
      cellClassName: "text-sm tabular-nums",
      render: (row) => row.joinedYear ?? <span className="text-muted-foreground">Semua</span>,
    },
    {
      key: "totalKelompokTani",
      label: "Total KT",
      sortable: true,
      cellClassName: "text-sm tabular-nums text-right pr-4",
    },
    {
      key: "totalPetani",
      label: "Total Petani",
      sortable: true,
      cellClassName: "text-sm tabular-nums text-right pr-4",
    },
    {
      key: "totalPetaniLaki",
      label: "Petani L",
      sortable: true,
      cellClassName: "text-sm tabular-nums text-right pr-4",
    },
    {
      key: "totalPetaniPerempuan",
      label: "Petani P",
      sortable: true,
      cellClassName: "text-sm tabular-nums text-right pr-4",
    },
    {
      key: "createdByName",
      label: "Dibuat Oleh",
      sortable: true,
      cellClassName: "text-sm",
    },
  ];

  const getExportRow = (row: SnapshotListItem) => ({
    snapshotDate: formatDateTime(row.snapshotDate),
    districtName: row.districtName ?? "Semua",
    joinedYear: row.joinedYear ?? "Semua",
    totalKelompokTani: row.totalKelompokTani,
    totalPetani: row.totalPetani,
    totalPetaniLaki: row.totalPetaniLaki,
    totalPetaniPerempuan: row.totalPetaniPerempuan,
    totalPersilLahan: row.totalPersilLahan,
    totalLuasLahan: formatArea(row.totalLuasLahan),
    createdByName: row.createdByName,
  });

  return (
    <div className="space-y-6">
      {canCreate && (
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Camera className="h-4 w-4 text-primary" /> Buat Snapshot Baru
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-muted-foreground">Distrik</label>
                <Popover open={districtOpen} onOpenChange={setDistrictOpen}>
                  <PopoverTrigger
                    render={
                      <Button variant="outline" role="combobox" className="w-[220px] justify-between h-9 font-normal">
                        <span className={cn(!districtId && "text-muted-foreground")}>
                          {selectedDistrict?.name ?? "Semua Distrik"}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    }
                  />
                  <PopoverContent className="w-[220px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Cari distrik..." />
                      <CommandList>
                        <CommandEmpty>Distrik tidak ditemukan.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem value="Semua Distrik" onSelect={() => { setDistrictId(null); setDistrictOpen(false); }}>
                            <Check className={cn("mr-2 h-4 w-4", !districtId ? "opacity-100" : "opacity-0")} />
                            Semua Distrik
                          </CommandItem>
                          {filterOptions.districts.map((d) => (
                            <CommandItem key={d.id} value={d.name} onSelect={() => { setDistrictId(d.id); setDistrictOpen(false); }}>
                              <Check className={cn("mr-2 h-4 w-4", districtId === d.id ? "opacity-100" : "opacity-0")} />
                              {d.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-muted-foreground">Tahun Bergabung</label>
                <Select
                  value={joinedYear ? String(joinedYear) : "all"}
                  onValueChange={(v) => setJoinedYear(v === "all" ? null : Number(v))}
                >
                  <SelectTrigger className="w-[160px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Tahun</SelectItem>
                    {filterOptions.joinedYears.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleGenerate} disabled={isPending} className="h-9 gap-2">
                <Camera className="h-4 w-4" />
                {isPending ? "Membuat…" : "Generate Snapshot"}
              </Button>
              <Button variant="outline" onClick={handleReset} disabled={isPending} className="h-9 gap-2">
                <RotateCcw className="h-4 w-4" /> Reset
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <DataTable
        columns={columns}
        data={snapshots}
        rowKey={(row) => row.id}
        searchKeys={["districtName", "createdByName"]}
        searchPlaceholder="Cari distrik atau pembuat..."
        emptyMessage="Belum ada snapshot."
        exportFilename="dashboard-snapshots"
        getExportRow={getExportRow}
      />

      <DeleteDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Nonaktifkan Snapshot"
        description="Snapshot akan dinonaktifkan (soft delete) dan tidak lagi muncul di daftar. Lanjutkan?"
      />
    </div>
  );
}
