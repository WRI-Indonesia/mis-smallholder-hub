import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Leaf } from "lucide-react";

export const metadata = { title: "Dashboard Regenerative Agriculture" };

export default function DashboardRegAgPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Regenerative Agriculture Dashboard
        </h1>
        <p className="text-muted-foreground">
          Ringkasan indikator dan progres program pertanian regeneratif.
        </p>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <Leaf className="size-5 text-muted-foreground" />
          <CardTitle className="text-base">Segera Hadir</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Halaman ini sedang dalam pengembangan. Dashboard Regenerative Agriculture
            akan menampilkan indikator kesehatan tanah, keanekaragaman hayati, dan
            serapan karbon per lahan.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
