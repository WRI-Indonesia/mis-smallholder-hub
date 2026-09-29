"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { TableActions } from "@/components/shared/table-actions";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { generateSnapshot, deleteSnapshot } from "@/server/actions/snapshot";
import type { SnapshotListItem } from "@/types/dashboard";
import { formatArea, MONTH_SHORT_ID } from "@/lib/format";

interface Props {
  snapshots: SnapshotListItem[];
  permissions: string[];
}

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${day} ${MONTH_SHORT_ID[d.getMonth()]} ${d.getFullYear()}, ${time}`;
};

// Snapshot selalu dibuat untuk Semua Data (Semua Distrik & Semua Tahun) —
// filter generate dimatikan sejak #148.
export function SnapshotClient({ snapshots, permissions }: Props) {
  const router = useRouter();

  const [isPending, startTransition] = useTransition();

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const canCreate = permissions.includes("CREATE");

  const handleGenerate = () => {
    startTransition(async () => {
      const result = await generateSnapshot({ districtId: null, joinedYear: null });
      if (result.success) {
        toast.success("Snapshot berhasil dibuat");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
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
      // Kolom kontrol, bukan data — tanpa ini Excel-nya berisi kolom "Aksi"
      // penuh CUID.
      exportable: false,
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
      defaultVisible: false,
      cellClassName: "text-sm",
      render: (row) => row.districtName ?? <span className="text-muted-foreground">Semua</span>,
    },
    {
      key: "joinedYear",
      label: "Tahun Bergabung",
      sortable: true,
      defaultVisible: false,
      cellClassName: "text-sm tabular-nums",
      render: (row) => row.joinedYear ?? <span className="text-muted-foreground">Semua</span>,
    },
    {
      key: "totalKelompokTani",
      label: "Total Lembaga Petani",
      sortable: true,
      cellClassName: "text-sm tabular-nums text-right pr-4",
    },
    {
      key: "totalKelompokTaniLahan",
      label: "Total Kelompok Tani",
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
    totalKelompokTaniLahan: row.totalKelompokTaniLahan,
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
              <Button onClick={handleGenerate} disabled={isPending} className="h-9 gap-2">
                <Camera className="h-4 w-4" />
                {isPending ? "Membuat…" : "Generate Snapshot"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Snapshot dibuat untuk <b>Semua Distrik</b> &amp; <b>Semua Tahun</b>.
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="p-4">
        <DataTable
          columns={columns}
          data={snapshots}
          rowKey={(row) => row.id}
          searchKeys={["districtName", "createdByName"]}
          searchPlaceholder="Cari distrik atau pembuat..."
          emptyMessage="Belum ada snapshot."
          exportFilename="dashboard-snapshots"
          canExport={permissions.includes("EXPORT")}
          getExportRow={getExportRow}
        />
      </Card>

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
