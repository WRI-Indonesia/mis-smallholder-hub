import { Skeleton } from "@/components/ui/skeleton";

export default function SprintViewLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Skeleton className="h-[360px]" />
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-16" />
      ))}
    </div>
  );
}
