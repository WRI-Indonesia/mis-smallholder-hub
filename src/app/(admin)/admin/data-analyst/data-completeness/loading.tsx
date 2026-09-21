import { Card } from "@/components/ui/card";

export default function DataCompletenessLoading() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ketersediaan Data — Per Lembaga</h1>
        <p className="text-muted-foreground">
          Rincian kelengkapan &amp; daftar kerja anomali satu Lembaga Petani (Profil, Petani, Lahan, Pelatihan, Produksi).
        </p>
      </div>
      <Card className="p-4">
        <div className="flex gap-4 flex-wrap">
          <div className="h-10 w-full sm:w-[200px] bg-muted/20 animate-pulse rounded-md" />
          <div className="h-10 w-full sm:w-[260px] bg-muted/20 animate-pulse rounded-md" />
          <div className="h-10 w-[120px] bg-muted/20 animate-pulse rounded-md" />
        </div>
      </Card>
      <Card className="h-40 bg-muted/10 animate-pulse" />
    </div>
  );
}
