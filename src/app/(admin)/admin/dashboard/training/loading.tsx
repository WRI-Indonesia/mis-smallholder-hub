import { Skeleton } from "@/components/ui/skeleton";

export default function TrainingDashboardLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      <Skeleton className="h-16" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-[420px]" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-[340px]" />
        <Skeleton className="h-[340px]" />
      </div>
    </div>
  );
}
