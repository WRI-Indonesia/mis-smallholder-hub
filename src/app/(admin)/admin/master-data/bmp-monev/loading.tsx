import { Card } from "@/components/ui/card";
import { TableSkeleton } from "@/components/shared/table-skeleton";

export default function BmpMonevLoading() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Monev BMP</h1>
        <p className="text-muted-foreground">
          Skor Monitoring &amp; Evaluasi praktik BMP per petani per tahun survei — kategori
          Teladan / Praktisi / Perintis / Belum Implementasi dihitung dari skor.
        </p>
      </div>
      <Card className="p-4">
        <div className="h-10 w-full bg-muted/20 animate-pulse rounded-md mb-4" />
        <TableSkeleton columnCount={8} hasActions={true} />
      </Card>
    </div>
  );
}
