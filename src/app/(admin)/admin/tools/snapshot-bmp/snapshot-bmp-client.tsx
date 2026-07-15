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
import { generateBmpSnapshot, deleteBmpSnapshot } from "@/server/actions/snapshot-bmp";
import type { BmpSnapshotListItem } from "@/types/dashboard";

interface Props {
  snapshots: BmpSnapshotListItem[];
  permissions: string[];
}

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()}, ${time}`;
};

const formatTon = (n: number) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export function SnapshotBmpClient({ snapshots, permissions }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const canCreate = permissions.includes("CREATE");

  const handleGenerate = () => {
    startTransition(async () => {
      // Snapshot selalu dibuat untuk Semua Data; filter dilakukan client-side di dashboard.
      const result = await generateBmpSnapshot({ districtId: null });
      if (result.success) {
        toast.success("Snapshot BMP berhasil dibuat");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const result = await deleteBmpSnapshot(deleteTarget);
    if (result.success) {
      toast.success("Snapshot berhasil dinonaktifkan");
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setDeleteTarget(null);
  };

  const columns: DataTableColumn<BmpSnapshotListItem>[] = [
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
            { type: "view", onClick: () => router.push(`/admin/tools/snapshot-bmp/${row.id}`), title: "Lihat" },
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
      key: "totalProduksiTon",
      label: "Total Produksi (Ton)",
      sortable: true,
      cellClassName: "text-sm tabular-nums text-right pr-4",
      render: (row) => formatTon(row.totalProduksiTon),
    },
    {
      key: "lahanBerData",
      label: "Lahan Ber-data",
      sortable: true,
      cellClassName: "text-sm tabular-nums text-right pr-4",
      render: (row) => `${row.lahanBerData}/${row.totalLahan}`,
    },
    {
      key: "petaniMelapor",
      label: "Petani Melapor",
      sortable: true,
      cellClassName: "text-sm tabular-nums text-right pr-4",
      render: (row) => `${row.petaniMelapor}/${row.totalPetani}`,
    },
    {
      key: "createdByName",
      label: "Dibuat Oleh",
      sortable: true,
      cellClassName: "text-sm",
    },
  ];

  const getExportRow = (row: BmpSnapshotListItem) => ({
    snapshotDate: formatDateTime(row.snapshotDate),
    districtName: row.districtName ?? "Semua",
    totalProduksiTon: formatTon(row.totalProduksiTon),
    lahanBerData: `${row.lahanBerData}/${row.totalLahan}`,
    petaniMelapor: `${row.petaniMelapor}/${row.totalPetani}`,
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
            <Button onClick={handleGenerate} disabled={isPending} className="h-9 gap-2">
              <Camera className="h-4 w-4" />
              {isPending ? "Membuat…" : "Generate Snapshot"}
            </Button>
            <p className="text-xs text-muted-foreground mt-3">
              Snapshot dibuat untuk <b>Semua Data</b> — filter Distrik/Lembaga/Kategori/Tahun
              dilakukan langsung di BMP Dashboard.
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
          exportFilename="bmp-dashboard-snapshots"
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
