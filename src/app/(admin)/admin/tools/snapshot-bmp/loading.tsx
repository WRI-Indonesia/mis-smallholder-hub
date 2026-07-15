import { TableSkeleton } from "@/components/shared/table-skeleton";

export default function SnapshotBmpLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-52 bg-muted rounded animate-pulse" />
        <div className="h-4 w-80 bg-muted rounded animate-pulse" />
      </div>
      <TableSkeleton columnCount={6} />
    </div>
  );
}
