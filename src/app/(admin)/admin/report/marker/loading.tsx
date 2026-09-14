import { TableSkeleton } from "@/components/shared/table-skeleton";

export default function Loading() {
  return (
    <div className="p-6 space-y-6">
      <div className="h-8 w-56 rounded bg-muted animate-pulse" />
      <TableSkeleton columnCount={8} hasActions={false} />
    </div>
  );
}
