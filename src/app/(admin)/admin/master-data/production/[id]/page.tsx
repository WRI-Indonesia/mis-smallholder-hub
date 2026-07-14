import { notFound } from "next/navigation";
import Link from "next/link";
import { requirePermission, getUserPermissionsForMenu } from "@/lib/rbac";
import { getProductionRecordById, getAuditUserNames } from "@/server/actions/production";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pencil } from "lucide-react";

export default async function ProductionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("master-data-production");

  const { id } = await params;
  const record = await getProductionRecordById(id);

  if (!record) {
    notFound();
  }

  const [permissions, auditNames] = await Promise.all([
    getUserPermissionsForMenu("master-data-production"),
    getAuditUserNames(record.createdBy, record.modifiedBy),
  ]);

  const { createdByName, modifiedByName } = auditNames;

  // Format month and year
  const [year, month] = record.period.split("-");
  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  const formattedPeriod = `${months[parseInt(month, 10) - 1]} ${year}`;

  const formattedHarvestDate = new Date(record.harvestDate).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Link href="/admin/master-data/production">
            <Button variant="ghost" size="icon" title="Kembali ke Daftar">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Detail Produksi</h1>
            <p className="text-muted-foreground">Detail catatan panen dan hasil tani</p>
          </div>
        </div>

        {permissions.includes("EDIT") && record.isActive && (
          <Link href={`/admin/master-data/production/${record.id}/edit`}>
            <Button size="sm">
              <Pencil className="h-4 w-4 mr-2" />
              Edit Data
            </Button>
          </Link>
        )}
      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Informasi Petani & Lahan */}
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">Informasi Petani & Lahan</h2>
          <div className="space-y-3">
            <div>
              <div className="text-xs text-muted-foreground uppercase font-semibold">Nama Petani</div>
              <div className="text-sm font-medium">
                <Link
                  href={`/admin/master-data/farmers/${record.farmer.id}`}
                  className="text-primary hover:underline"
                >
                  {record.farmer.name}
                </Link>
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase font-semibold">ID Petani</div>
              <div className="text-sm font-mono text-muted-foreground">{record.farmer.farmerId}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase font-semibold">Lembaga Tani</div>
              <div className="text-sm">
                <Link
                  href={`/admin/master-data/groups/${record.farmer.farmerGroupId}`}
                  className="text-primary hover:underline"
                >
                  {record.farmer.farmerGroup.name}
                </Link>
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase font-semibold">Lahan</div>
              <div className="text-sm mt-1">
                {record.parcel ? (
                  <Link
                    href={`/admin/master-data/parcels/${record.parcel.id}`}
                    className="text-primary hover:underline font-mono"
                  >
                    {record.parcel.parcelId}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">Tidak Terpetakan</span>
                )}
              </div>
            </div>
            {record.parcel && (
              <div>
                <div className="text-xs text-muted-foreground uppercase font-semibold">Luas Lahan</div>
                <div className="text-sm">
                  {record.parcel.area !== null ? `${record.parcel.area.toFixed(2)} ha` : "—"}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Card 2: Data Produksi */}
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">Data Produksi</h2>
          <div className="space-y-3">
            <div>
              <div className="text-xs text-muted-foreground uppercase font-semibold">Periode</div>
              <div className="text-sm font-medium">{formattedPeriod}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase font-semibold">Tanggal Panen</div>
              <div className="text-sm">{formattedHarvestDate}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase font-semibold">Panen Ke-</div>
              <div className="text-sm mt-1">
                <Badge variant="secondary">Ke-{record.harvestNumber}</Badge>
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase font-semibold">Hasil Panen</div>
              <div className="text-base font-bold text-primary mt-1">
                {record.yieldKg.toLocaleString("id-ID", { minimumFractionDigits: 1 })} kg
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase font-semibold">Catatan</div>
              <div className="text-sm bg-muted/40 p-3 rounded-md min-h-[60px] whitespace-pre-wrap">
                {record.notes || <span className="text-muted-foreground italic">Tidak ada catatan</span>}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase font-semibold">Status</div>
              <div className="text-sm mt-1">
                <Badge variant={record.isActive ? "default" : "destructive"}>
                  {record.isActive ? "Aktif" : "Nonaktif"}
                </Badge>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Audit Trail */}
      <Card className="p-4 bg-muted/20 text-xs text-muted-foreground space-y-1">
        <div>
          Dibuat oleh: <span className="font-semibold">{createdByName}</span> pada{" "}
          {new Date(record.createdAt).toLocaleString("id-ID")}
        </div>
        <div>
          Terakhir diubah: <span className="font-semibold">{modifiedByName}</span> pada{" "}
          {new Date(record.modifiedAt).toLocaleString("id-ID")}
        </div>
      </Card>
    </div>
  );
}
