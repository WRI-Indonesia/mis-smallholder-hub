"use client";

import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

/** Column definition for DataTable */
export interface DataTableColumn<T> {
  /** Property key from the data object */
  key: keyof T;
  /** Display label for the column header */
  label: string;
  /** Optional custom renderer for the cell content */
  render?: (row: T) => React.ReactNode;
  /** Optional CSS class for the header cell */
  headerClassName?: string;
  /** Optional CSS class for the body cell */
  cellClassName?: string;
}

/** Props for the DataTable component */
export interface DataTableProps<T> {
  /** Column definitions */
  columns: DataTableColumn<T>[];
  /** Data array to display */
  data: T[];
  /** Unique key extractor for each row */
  rowKey: (row: T) => string;
  /** Placeholder text for the search input */
  searchPlaceholder?: string;
  /** Which field to search/filter on (client-side) */
  searchKey?: keyof T;
  /** Optional action column renderer (e.g., edit/delete buttons) */
  renderActions?: (row: T) => React.ReactNode;
  /** Message shown when data array is empty */
  emptyMessage?: string;
}

/**
 * Reusable data table component with built-in client-side search.
 * Uses Shadcn UI Table primitives for consistent styling.
 */
export function DataTable<T>({
  columns,
  data,
  rowKey,
  searchPlaceholder = "Cari...",
  searchKey,
  renderActions,
  emptyMessage = "Belum ada data.",
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");

  const filteredData = useMemo(() => {
    if (!search || !searchKey) return data;
    const lower = search.toLowerCase();
    return data.filter((row) => {
      const value = row[searchKey];
      if (value == null) return false;
      return String(value).toLowerCase().includes(lower);
    });
  }, [data, search, searchKey]);

  const hasActions = !!renderActions;
  const totalCols = columns.length + (hasActions ? 1 : 0);

  return (
    <div className="space-y-4">
      {/* Search bar */}
      {searchKey && (
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead
                  key={String(col.key)}
                  className={col.headerClassName}
                >
                  {col.label}
                </TableHead>
              ))}
              {hasActions && (
                <TableHead className="text-right">Aksi</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={totalCols}
                  className="text-center h-24 text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((row) => (
                <TableRow key={rowKey(row)}>
                  {columns.map((col) => (
                    <TableCell
                      key={String(col.key)}
                      className={col.cellClassName}
                    >
                      {col.render ? col.render(row) : String(row[col.key] ?? "")}
                    </TableCell>
                  ))}
                  {hasActions && (
                    <TableCell className="text-right">
                      {renderActions(row)}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
