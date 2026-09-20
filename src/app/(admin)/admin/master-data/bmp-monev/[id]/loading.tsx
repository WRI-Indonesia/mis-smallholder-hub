import { Skeleton } from "@/components/ui/skeleton";

export default function BmpAssessmentDetailLoading() {
  return (
    <div className="p-6 space-y-6">
      <Skeleton className="h-16 w-2/3" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-[480px]" />
    </div>
  );
}
