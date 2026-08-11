import { Skeleton } from "@/components/ui/skeleton";

export default function BenchmarkComparisonLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="flex gap-4">
        <Skeleton className="h-20 w-40" />
        <Skeleton className="h-20 w-40" />
      </div>
      <Skeleton className="h-[320px]" />
      <Skeleton className="h-[320px]" />
    </div>
  );
}
