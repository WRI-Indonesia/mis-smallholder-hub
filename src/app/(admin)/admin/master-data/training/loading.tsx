import { Card } from "@/components/ui/card";
import { TableSkeleton } from "@/components/shared";

export default function TrainingLoading() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pelatihan</h1>
        <p className="text-muted-foreground">Data kegiatan pelatihan lembaga tani yang terdaftar</p>
      </div>
      <Card className="p-4">
        <div className="h-10 w-full bg-muted/20 animate-pulse rounded-md mb-4" />
        <TableSkeleton columnCount={6} hasActions={true} />
      </Card>
    </div>
  );
}
