import { Card } from "@/components/ui/card";
import { TableSkeleton } from "@/components/shared";

export default function ProductionLoading() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Produksi</h1>
        <p className="text-muted-foreground">
          Data panen dan produksi hasil tani (yield) per petani
        </p>
      </div>
      <Card className="p-4">
        <div className="h-10 w-full bg-muted/20 animate-pulse rounded-md mb-4" />
        <TableSkeleton columnCount={7} hasActions={true} />
      </Card>
    </div>
  );
}
