import { Card } from "@/components/ui/card";
import { TableSkeleton } from "@/components/shared";

export default function FarmerReportLoading() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Laporan Petani</h1>
        <p className="text-muted-foreground">Analisis ringkasan dan rincian data petani</p>
      </div>
      <Card className="p-4">
        <div className="h-10 w-full bg-muted/20 animate-pulse rounded-md mb-4" />
        <TableSkeleton columnCount={7} hasActions={false} />
      </Card>
    </div>
  );
}
