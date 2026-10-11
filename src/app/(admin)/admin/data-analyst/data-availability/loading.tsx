import { Skeleton } from "@/components/ui/skeleton";

/** Kerangka #417: judul + sub-nav · filter · hero satu baris · 5 kartu domain · matriks Ringkas 10 · Daftar Kerja. */
export default function DataAvailabilityDashboardLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-8 w-80" />
        <Skeleton className="h-4 w-[420px]" />
      </div>
      {/* Hero satu baris: cincin · kalimat ringkas · bar sebaran tingkat skor */}
      <Skeleton className="h-[120px]" />
      {/* 5 kartu domain */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-36" />
        ))}
      </div>
      {/* Matriks: toolbar + grid radar Ringkas 10 */}
      <div className="space-y-4 rounded-xl border p-4">
        <Skeleton className="h-9 w-full" />
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[230px]" />
          ))}
        </div>
      </div>
      {/* Daftar Kerja bertab */}
      <Skeleton className="h-[320px]" />
    </div>
  );
}
