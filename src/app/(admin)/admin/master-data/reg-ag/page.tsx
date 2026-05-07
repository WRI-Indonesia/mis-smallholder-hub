import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Leaf } from "lucide-react";

export const metadata = { title: "Master Data Regenerative Agriculture" };

export default function MasterDataRegAgPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Regenerative Agriculture
        </h1>
        <p className="text-muted-foreground">
          Manajemen data program dan indikator pertanian regeneratif.
        </p>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <Leaf className="size-5 text-muted-foreground" />
          <CardTitle className="text-base">Segera Hadir</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Halaman ini sedang dalam pengembangan. Master Data Regenerative Agriculture
            akan mencakup manajemen indikator, pengukuran, dan laporan program Reg. Ag.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
