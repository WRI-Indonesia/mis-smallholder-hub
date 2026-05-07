import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sprout } from "lucide-react";

export const metadata = { title: "Dashboard BMP" };

export default function DashboardBmpPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">BMP Dashboard</h1>
        <p className="text-muted-foreground">
          Ringkasan implementasi Best Management Practices di lapangan.
        </p>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <Sprout className="size-5 text-muted-foreground" />
          <CardTitle className="text-base">Segera Hadir</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Halaman ini sedang dalam pengembangan. Dashboard BMP akan menampilkan
            tingkat adopsi praktik terbaik, tren pemeliharaan, dan perbandingan antar kelompok tani.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
