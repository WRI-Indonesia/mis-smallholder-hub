import { requirePermission } from "@/lib/rbac";
import { getFarmerById } from "@/server/actions/farmer";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { deriveFarmerSubGroups } from "@/lib/farmer-sub-groups";

export default async function FarmerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("master-data-farmers");
  const { id } = await params;
  const farmer = await getFarmerById(id);

  if (!farmer) notFound();

  // Read-only turunan dari lahan aktif (#152) — petani tidak punya field KT sendiri (#146).
  const { gapoktan, kelompokTani } = deriveFarmerSubGroups(farmer.landParcels);

  const formatDate = (d: Date | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/master-data/farmers">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{farmer.name}</h1>
          <p className="text-muted-foreground font-mono text-sm">{farmer.farmerId}</p>
        </div>
      </div>

      <Card className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lembaga Petani</p>
            <p className="text-sm font-medium mt-1">{farmer.farmerGroup.name}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Distrik</p>
            <p className="text-sm font-medium mt-1">{farmer.farmerGroup.district.name}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gapoktan/KUD</p>
            {gapoktan.length === 0 ? (
              <p className="text-sm font-medium mt-1">—</p>
            ) : (
              <div className="flex flex-wrap gap-1 mt-1">
                {gapoktan.map((name) => (
                  <Badge key={name} variant="outline">{name}</Badge>
                ))}
              </div>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kelompok Tani</p>
            {kelompokTani.length === 0 ? (
              <p className="text-sm font-medium mt-1">—</p>
            ) : (
              <div className="flex flex-wrap gap-1 mt-1">
                {kelompokTani.map((name) => (
                  <Badge key={name} variant="outline">{name}</Badge>
                ))}
              </div>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Jenis Kelamin</p>
            <Badge variant="secondary" className="mt-1">
              {farmer.gender === "M" ? "Laki-laki" : "Perempuan"}
            </Badge>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">NIK</p>
            <p className="text-sm font-mono text-muted-foreground mt-1">{farmer.nik ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tempat Lahir</p>
            <p className="text-sm font-medium mt-1">{farmer.birthPlace ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tanggal Lahir</p>
            <p className="text-sm font-medium mt-1">{formatDate(farmer.birthDate)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tahun Bergabung</p>
            <p className="text-sm font-medium mt-1">{farmer.joinedYear ?? "—"}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Alamat</p>
            <p className="text-sm font-medium mt-1">{farmer.address ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</p>
            <Badge variant={farmer.isActive ? "default" : "outline"} className="mt-1">
              {farmer.isActive ? "Aktif" : "Nonaktif"}
            </Badge>
          </div>
        </div>
      </Card>
    </div>
  );
}
