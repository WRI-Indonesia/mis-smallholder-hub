import { Card } from "@/components/ui/card";

export default function ParcelOverlapLoading() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tumpang Tindih Lahan</h1>
        <p className="text-muted-foreground">Menghitung irisan poligon lahan…</p>
      </div>
      <Card className="h-20 bg-muted/10 animate-pulse" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="h-[480px] bg-muted/10 animate-pulse" />
        <Card className="h-[480px] bg-muted/10 animate-pulse" />
      </div>
    </div>
  );
}
