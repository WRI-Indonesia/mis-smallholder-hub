import { requirePermission } from "@/lib/rbac";
import { getFarmerGroupById } from "@/server/actions/farmer-group";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("master-data-groups");
  const { id } = await params;
  const group = await getFarmerGroupById(id);

  if (!group) notFound();

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/master-data/groups">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{group.name}</h1>
          <p className="text-muted-foreground">{group.code ?? "—"}</p>
        </div>
      </div>

      <Card className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Distrik</p>
            <p className="text-sm font-medium mt-1">{group.district.name}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kategori</p>
            <Badge variant="secondary" className="mt-1">
              {group.category === "EX_PLASMA" ? "Ex Plasma" : "Swadaya"}
            </Badge>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Singkatan</p>
            <p className="text-sm font-medium mt-1">{group.abrv ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tahun Join Program</p>
            <p className="text-sm font-medium mt-1">{group.joinYear ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Koordinat</p>
            <p className="text-xs font-mono text-muted-foreground mt-1">
              {group.locationLat && group.locationLong
                ? `${group.locationLat}, ${group.locationLong}`
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</p>
            <Badge variant={group.isActive ? "default" : "outline"} className="mt-1">
              {group.isActive ? "Aktif" : "Nonaktif"}
            </Badge>
          </div>
        </div>
      </Card>
    </div>
  );
}
