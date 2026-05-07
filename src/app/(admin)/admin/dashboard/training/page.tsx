import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap } from "lucide-react";

export const metadata = { title: "Dashboard Training" };

export default function DashboardTrainingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Training Dashboard</h1>
        <p className="text-muted-foreground">
          Ringkasan dan analitik program pelatihan petani.
        </p>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <GraduationCap className="size-5 text-muted-foreground" />
          <CardTitle className="text-base">Segera Hadir</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Halaman ini sedang dalam pengembangan. Dashboard Training akan menampilkan
            statistik kehadiran, progres pelatihan, dan distribusi peserta per wilayah.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
