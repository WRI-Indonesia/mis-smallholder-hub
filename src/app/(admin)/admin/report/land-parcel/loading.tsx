import { TableSkeleton } from "@/components/shared";

export default function Loading() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-64 animate-pulse rounded bg-muted" />
        <div className="h-4 w-96 animate-pulse rounded bg-muted" />
      </div>
      <TableSkeleton columnCount={6} hasActions={false} />
    </div>
  );
}
