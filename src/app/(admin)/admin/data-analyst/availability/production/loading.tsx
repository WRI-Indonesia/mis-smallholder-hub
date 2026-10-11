import { Skeleton } from "@/components/ui/skeleton";

export default function ProductionAvailabilityLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-80" />
        <Skeleton className="h-4 w-[520px]" />
      </div>
      {/* Toolbar: tahun · kategori · distrik · lembaga · cari · Excel */}
      <Skeleton className="h-9 w-full max-w-[900px]" />
      {/* Kalender Lembaga × bulan */}
      <div className="space-y-2 rounded-xl border p-6">
        <Skeleton className="h-6 w-72" />
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-8" />
        ))}
      </div>
    </div>
  );
}
