import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sprout } from "lucide-react";

export const metadata = { title: "Master Data BMP" };

export default function MasterDataBmpPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Best Management Practices
        </h1>
        <p className="text-muted-foreground">
          Manajemen data aktivitas dan pemeliharaan agronomi.
        </p>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <Sprout className="size-5 text-muted-foreground" />
          <CardTitle className="text-base">Segera Hadir</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Halaman ini sedang dalam pengembangan. Master Data BMP akan mencakup
            manajemen jenis pemeliharaan, aktivitas agronomi, dan produksi per lahan.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
