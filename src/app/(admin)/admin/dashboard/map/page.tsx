import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Map } from "lucide-react";

export const metadata = { title: "Interactive Map" };

export default function DashboardMapPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Interactive Map</h1>
        <p className="text-muted-foreground">
          Peta interaktif distribusi petani, lahan, dan kelompok tani.
        </p>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <Map className="size-5 text-muted-foreground" />
          <CardTitle className="text-base">Segera Hadir</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Halaman ini sedang dalam pengembangan. Interactive Map akan menampilkan
            visualisasi geospasial seluruh data petani dan lahan menggunakan MapLibre GL.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
