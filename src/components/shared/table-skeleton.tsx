"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface TableSkeletonProps {
  columnCount: number;
  rowCount?: number;
  hasActions?: boolean;
}

export function TableSkeleton({ columnCount, rowCount = 5, hasActions = true }: TableSkeletonProps) {
  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/70 hover:bg-muted/70 border-b-2 border-border">
            {hasActions && (
              <TableHead className="w-[100px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Aksi
              </TableHead>
            )}
            {Array.from({ length: columnCount }).map((_, i) => (
              <TableHead key={i} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Skeleton className="h-3 w-16" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rowCount }).map((_, rowIndex) => (
            <TableRow key={rowIndex}>
              {hasActions && (
                <TableCell>
                  <div className="flex items-center space-x-1">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                  </div>
                </TableCell>
              )}
              {Array.from({ length: columnCount }).map((_, colIndex) => (
                <TableCell key={colIndex}>
                  <Skeleton className="h-4 w-[75%]" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
