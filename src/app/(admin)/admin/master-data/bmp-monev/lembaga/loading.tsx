import { Card } from "@/components/ui/card";
import { TableSkeleton } from "@/components/shared";

export default function BmpGroupAssessmentLoading() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Penilaian Lembaga — Monev BMP</h1>
        <p className="text-muted-foreground">Skor 14 indikator level Lembaga per tahun survei.</p>
      </div>
      <Card className="p-4">
        <TableSkeleton columnCount={8} hasActions={true} />
      </Card>
    </div>
  );
}
