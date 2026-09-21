import { Skeleton } from "@/components/ui/skeleton";

export default function DataAvailabilityDashboardLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-72" />
        <Skeleton className="h-4 w-96" />
      </div>
      {/* Hero: cincin skor · distribusi band · aksi lintas Lembaga */}
      <Skeleton className="h-[220px]" />
      {/* 5 kartu domain */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      {/* Radar per Lembaga (bawaan): header + grid kartu pentagon */}
      <div className="space-y-4 rounded-xl border p-6">
        <Skeleton className="h-8 w-80" />
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-[212px]" />
          ))}
        </div>
      </div>
      {/* Paling tertinggal per domain + panel anomali */}
      <Skeleton className="h-[300px]" />
      <Skeleton className="h-[420px]" />
    </div>
  );
}
