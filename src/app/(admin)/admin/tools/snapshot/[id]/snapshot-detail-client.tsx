"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { DashboardSummaryCards } from "../../../dashboard/summary-cards";
import type { KTDetails, SnapshotDetail } from "@/types/dashboard";

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()}, ${time}`;
};

const formatArea = (n: number) =>
  `${new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)} ha`;

const coverageCount = (kt: KTDetails) =>
  Object.values(kt.trainingCoverage).filter((c) => c > 0).length;

export function SnapshotDetailClient({ snapshot }: { snapshot: SnapshotDetail }) {
  const router = useRouter();

  const columns: DataTableColumn<KTDetails>[] = [
    { key: "name", label: "Nama Lembaga Petani", sortable: true, cellClassName: "text-sm font-medium" },
    {
      key: "totalFarmers",
      label: "Total Petani",
      sortable: true,
      cellClassName: "text-sm tabular-nums text-right pr-4",
    },
    {
      key: "totalParcels",
      label: "Total Persil",
      sortable: true,
      cellClassName: "text-sm tabular-nums text-right pr-4",
    },
    {
      key: "totalArea",
      label: "Luas Lahan",
      sortable: true,
      cellClassName: "text-sm tabular-nums text-right pr-4",
      render: (row) => formatArea(row.totalArea),
    },
    {
      key: "id",
      label: "Cakupan Pelatihan",
      sortable: false,
      cellClassName: "text-sm tabular-nums",
      render: (row) => `${coverageCount(row)}/4 paket`,
    },
  ];

  const getExportRow = (row: KTDetails) => ({
    name: row.name,
    totalFarmers: row.totalFarmers,
    totalParcels: row.totalParcels,
    totalArea: formatArea(row.totalArea),
    coverage: `${coverageCount(row)}/4 paket`,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Snapshot — {formatDateTime(snapshot.snapshotDate)}</h1>
          <p className="text-muted-foreground">Data historis dashboard yang tersimpan</p>
        </div>
        <Button variant="outline" onClick={() => router.push("/admin/tools/snapshot")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Button>
      </div>

      {/* Metadata */}
      <Card className="border border-border/60 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Informasi Snapshot
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            <Meta label="Tanggal Snapshot" value={formatDateTime(snapshot.snapshotDate)} />
            <Meta label="Filter Distrik" value={snapshot.districtName ?? "Semua Distrik"} />
            <Meta label="Filter Tahun" value={snapshot.joinedYear ? String(snapshot.joinedYear) : "Semua Tahun"} />
            <Meta label="Dibuat Oleh" value={snapshot.createdByName} />
          </div>
        </CardContent>
      </Card>

      {/* Summary cards from stored data */}
      <DashboardSummaryCards stats={snapshot.data} />

      {/* KT table */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Ringkasan per Lembaga Petani</h2>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => toast.info("Fitur download PDF akan segera tersedia")}
        >
          <Download className="h-4 w-4" /> Download PDF
        </Button>
      </div>
      <DataTable
        columns={columns}
        data={snapshot.data.kelompokTaniList}
        rowKey={(row) => row.id}
        searchKey="name"
        searchPlaceholder="Cari lembaga petani..."
        emptyMessage="Tidak ada data lembaga petani."
        exportFilename={`snapshot-${snapshot.id}-kt`}
        getExportRow={getExportRow}
      />
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
