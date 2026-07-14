import { Card } from "@/components/ui/card";
import { TableSkeleton } from "@/components/shared";

export default function FarmerSummaryLoading() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ringkasan Petani</h1>
        <p className="text-muted-foreground">
          Analisis data petani berdasarkan district dan Lembaga Petani
        </p>
      </div>
      <Card className="p-4 space-y-4">
        <div className="flex gap-4 flex-wrap">
          <div className="h-10 w-[200px] bg-muted/20 animate-pulse rounded-md" />
          <div className="h-10 w-[200px] bg-muted/20 animate-pulse rounded-md" />
          <div className="h-10 w-[120px] bg-muted/20 animate-pulse rounded-md" />
        </div>
        <TableSkeleton columnCount={4} hasActions={false} />
      </Card>
    </div>
  );
}
