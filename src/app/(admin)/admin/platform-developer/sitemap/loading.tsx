import { Skeleton } from "@/components/ui/skeleton";

export default function SitemapLoading() {
  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-[32rem] max-w-full" />
      </div>
      <Skeleton className="h-9 w-full max-w-3xl" />
      <Skeleton className="h-10 w-64" />
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-72" />
      ))}
    </div>
  );
}
