"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { BmpScoreCards } from "../../../dashboard/bmp/bmp-score-cards";
import { bmpProductivity, sumBmpGroups } from "@/lib/bmp-dashboard-aggregation";
import type { BmpGroupEntry, BmpSnapshotDetail } from "@/types/dashboard";

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()}, ${time}`;
};

const formatTon = (n: number) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const CATEGORY_LABELS: Record<BmpGroupEntry["category"], string> = {
  EX_PLASMA: "Ex-Plasma",
  SWADAYA: "Swadaya",
};

export function SnapshotBmpDetailClient({ snapshot }: { snapshot: BmpSnapshotDetail }) {
  const router = useRouter();
  const { totals, produktivitasTonHa } = sumBmpGroups(snapshot.data.groups);

  const columns: DataTableColumn<BmpGroupEntry>[] = [
    { key: "name", label: "Nama Lembaga Petani", sortable: true, cellClassName: "text-sm font-medium" },
    {
      key: "category",
      label: "Kategori",
      sortable: true,
      cellClassName: "text-sm",
      render: (row) => CATEGORY_LABELS[row.category],
    },
    {
      key: "districtName",
      label: "Distrik",
      sortable: true,
      cellClassName: "text-sm",
      render: (row) => row.districtName ?? "—",
    },
    {
      key: "totals",
      label: "Produksi (Ton)",
      sortable: false,
      cellClassName: "text-sm tabular-nums text-right pr-4",
      render: (row) => formatTon(row.totals.produksiTon),
    },
    {
      key: "id",
      label: "Produktivitas (Ton/Ha)",
      sortable: false,
      cellClassName: "text-sm tabular-nums text-right pr-4",
      render: (row) => formatTon(bmpProductivity(row)),
    },
    {
      key: "availability",
      label: "Lahan Ber-data",
      sortable: false,
      cellClassName: "text-sm tabular-nums text-right pr-4",
      render: (row) => `${row.totals.lahanBerData}/${row.totals.totalLahan}`,
    },
    {
      key: "monthly",
      label: "Petani Melapor",
      sortable: false,
      cellClassName: "text-sm tabular-nums text-right pr-4",
      render: (row) => `${row.totals.petaniMelapor}/${row.totals.totalPetani}`,
    },
  ];

  const getExportRow = (row: BmpGroupEntry) => ({
    name: row.name,
    category: CATEGORY_LABELS[row.category],
    districtName: row.districtName ?? "—",
    produksiTon: formatTon(row.totals.produksiTon),
    produktivitas: formatTon(bmpProductivity(row)),
    lahanBerData: `${row.totals.lahanBerData}/${row.totals.totalLahan}`,
    petaniMelapor: `${row.totals.petaniMelapor}/${row.totals.totalPetani}`,
    baik: row.availability.baik,
    cukup: row.availability.cukup,
    kurang: row.availability.kurang,
    tidakAda: row.availability.tidakAda,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Snapshot BMP — {formatDateTime(snapshot.snapshotDate)}</h1>
          <p className="text-muted-foreground">Data historis dashboard BMP yang tersimpan</p>
        </div>
        <Button variant="outline" onClick={() => router.push("/admin/tools/snapshot-bmp")} className="gap-2">
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-sm">
            <Meta label="Tanggal Snapshot" value={formatDateTime(snapshot.snapshotDate)} />
            <Meta label="Filter Distrik" value={snapshot.districtName ?? "Semua Distrik"} />
            <Meta label="Dibuat Oleh" value={snapshot.createdByName} />
          </div>
        </CardContent>
      </Card>

      {/* Summary cards from stored data */}
      <BmpScoreCards totals={totals} produktivitas={produktivitasTonHa} yearLabel="kumulatif semua tahun" />

      {/* Per-Lembaga table */}
      <h2 className="text-lg font-semibold">Ringkasan per Lembaga Petani</h2>
      <DataTable
        columns={columns}
        data={snapshot.data.groups}
        rowKey={(row) => row.id}
        searchKey="name"
        searchPlaceholder="Cari lembaga petani..."
        emptyMessage="Tidak ada data lembaga petani."
        exportFilename={`snapshot-bmp-${snapshot.id}`}
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
