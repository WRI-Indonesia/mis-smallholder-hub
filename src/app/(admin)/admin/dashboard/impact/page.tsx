import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

export const metadata = { title: "Impact Indicator" };

export default function DashboardImpactPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Impact Indicator</h1>
        <p className="text-muted-foreground">
          Pengukuran dan pemantauan indikator dampak program.
        </p>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <TrendingUp className="size-5 text-muted-foreground" />
          <CardTitle className="text-base">Segera Hadir</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Halaman ini sedang dalam pengembangan. Impact Indicator akan menampilkan
            KPI program, tren capaian, dan perbandingan target vs realisasi.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
