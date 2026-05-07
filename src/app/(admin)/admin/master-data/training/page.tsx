import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap } from "lucide-react";

export const metadata = { title: "Master Data Training" };

export default function MasterDataTrainingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Training</h1>
        <p className="text-muted-foreground">
          Manajemen data aktivitas pelatihan dan peserta.
        </p>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <GraduationCap className="size-5 text-muted-foreground" />
          <CardTitle className="text-base">Segera Hadir</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Halaman ini sedang dalam pengembangan. Master Data Training akan
            mencakup manajemen paket pelatihan, aktivitas, peserta, dan bukti kehadiran.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
