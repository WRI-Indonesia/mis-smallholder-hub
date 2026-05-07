import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export const metadata = { title: "Palm Impact Assessment" };

export default function DashboardPalmImpactPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Palm Impact Assessment
        </h1>
        <p className="text-muted-foreground">
          Penilaian dampak program pada komoditas kelapa sawit.
        </p>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <BarChart3 className="size-5 text-muted-foreground" />
          <CardTitle className="text-base">Segera Hadir</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Halaman ini sedang dalam pengembangan. Palm Impact Assessment akan
            menampilkan analisis dampak lingkungan, sosial, dan ekonomi dari
            program kelapa sawit berkelanjutan.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
