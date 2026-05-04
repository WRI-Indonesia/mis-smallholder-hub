"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";

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
  /** Whether this column is sortable (default: true) */
  sortable?: boolean;
  /** Whether this column is visible by default (default: true) */
  defaultVisible?: boolean;
  /** Whether this column can be toggled (default: true) */
  toggleable?: boolean;
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
  /** Which field to search/filter on (client-side) — single key */
  searchKey?: keyof T;
  /** Multiple fields to search on (client-side) — overrides searchKey */
  searchKeys?: (keyof T)[];
  /** Custom search function for complex/nested field searching */
  searchFn?: (row: T, query: string) => boolean;
  /** Optional action column renderer (e.g., edit/delete buttons) */
  renderActions?: (row: T) => React.ReactNode;
  /** Message shown when data array is empty */
  emptyMessage?: string;
  /** Default page size (default: 10) */
  defaultPageSize?: number;
  /** Available page size options */
  pageSizeOptions?: number[];
  /** Optional toolbar content to render before the search input */
  toolbarLeft?: React.ReactNode;
}

type SortDirection = "asc" | "desc" | null;

/**
 * Reusable data table component with built-in client-side search,
 * column sorting, column visibility toggle, and pagination.
 * Uses Shadcn UI Table primitives for consistent styling.
 */
export function DataTable<T>({
  columns,
  data,
  rowKey,
  searchPlaceholder = "Cari...",
  searchKey,
  searchKeys,
  searchFn,
  renderActions,
  emptyMessage = "Belum ada data.",
  defaultPageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  toolbarLeft,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  // ─── Column visibility ──────────────────────────────────────────────────

  const [visibleCols, setVisibleCols] = useState<Set<keyof T>>(() => {
    const set = new Set<keyof T>();
    for (const col of columns) {
      if (col.defaultVisible !== false) set.add(col.key);
    }
    return set;
  });

  const toggleColumn = (key: keyof T) => {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const activeColumns = useMemo(
    () => columns.filter((col) => visibleCols.has(col.key)),
    [columns, visibleCols]
  );

  const toggleableColumns = useMemo(
    () => columns.filter((col) => col.toggleable !== false),
    [columns]
  );

  // ─── Search filter ──────────────────────────────────────────────────────

  const filteredData = useMemo(() => {
    if (!search) return data;

    const lower = search.toLowerCase();

    // Custom search function takes priority
    if (searchFn) {
      return data.filter((row) => searchFn(row, lower));
    }

    // Multiple keys
    const keys = searchKeys ?? (searchKey ? [searchKey] : []);
    if (keys.length === 0) return data;

    return data.filter((row) =>
      keys.some((key) => {
        const value = row[key];
        if (value == null) return false;
        return String(value).toLowerCase().includes(lower);
      })
    );
  }, [data, search, searchKey, searchKeys, searchFn]);

  // ─── Sort ───────────────────────────────────────────────────────────────

  const sortedData = useMemo(() => {
    if (!sortKey || !sortDir) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      const aStr = typeof aVal === "object" ? JSON.stringify(aVal) : aVal;
      const bStr = typeof bVal === "object" ? JSON.stringify(bVal) : bVal;

      let cmp = 0;
      if (typeof aStr === "number" && typeof bStr === "number") {
        cmp = aStr - bStr;
      } else {
        cmp = String(aStr).localeCompare(String(bStr), "id");
      }

      return sortDir === "desc" ? -cmp : cmp;
    });
  }, [filteredData, sortKey, sortDir]);

  // ─── Pagination ─────────────────────────────────────────────────────────

  const totalItems = sortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages - 1);

  const paginatedData = useMemo(() => {
    const start = safePage * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, safePage, pageSize]);

  // Reset page when data changes
  const resetPage = useCallback(() => setPage(0), []);
  useMemo(() => {
    resetPage();
  }, [filteredData.length, resetPage]);

  // ─── Sort handler ───────────────────────────────────────────────────────

  const handleSort = (key: keyof T) => {
    if (sortKey === key) {
      if (sortDir === "asc") setSortDir("desc");
      else if (sortDir === "desc") {
        setSortKey(null);
        setSortDir(null);
      } else setSortDir("asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(0);
  };

  const hasActions = !!renderActions;
  const totalCols = activeColumns.length + (hasActions ? 1 : 0);

  const SortIcon = ({ colKey }: { colKey: keyof T }) => {
    if (sortKey !== colKey || !sortDir) {
      return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />;
    }
    return sortDir === "asc" ? (
      <ArrowUp className="ml-1 h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3" />
    );
  };

  const hasSearch = !!(searchKey || searchKeys?.length || searchFn);

  return (
    <div className="space-y-3">
      {/* Toolbar — single row */}
      <div className="flex items-center gap-3 flex-wrap">
        {toolbarLeft}

        {hasSearch && (
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="pl-8"
            />
          </div>
        )}

        {/* Column visibility toggle */}
        {toggleableColumns.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 px-3 py-2 text-sm font-medium border rounded-md bg-background hover:bg-accent hover:text-accent-foreground outline-none transition-colors ml-auto h-9">
              <SlidersHorizontal className="h-4 w-4" />
              Kolom
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Tampilkan Kolom</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {toggleableColumns.map((col) => (
                  <DropdownMenuCheckboxItem
                    key={String(col.key)}
                    checked={visibleCols.has(col.key)}
                    onCheckedChange={() => {
                      console.log("Toggling column:", String(col.key));
                      toggleColumn(col.key);
                    }}
                  >
                    {col.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/70 hover:bg-muted/70 border-b-2">
              {activeColumns.map((col) => {
                const isSortable = col.sortable !== false;
                return (
                  <TableHead
                    key={String(col.key)}
                    className={`text-xs font-semibold uppercase tracking-wider text-muted-foreground ${col.headerClassName ?? ""} ${
                      isSortable
                        ? "cursor-pointer select-none hover:text-foreground transition-colors"
                        : ""
                    }`}
                    onClick={
                      isSortable ? () => handleSort(col.key) : undefined
                    }
                  >
                    <span className="inline-flex items-center">
                      {col.label}
                      {isSortable && <SortIcon colKey={col.key} />}
                    </span>
                  </TableHead>
                );
              })}
              {hasActions && (
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Aksi
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={totalCols}
                  className="text-center h-24 text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row) => (
                <TableRow key={rowKey(row)}>
                  {activeColumns.map((col) => (
                    <TableCell
                      key={String(col.key)}
                      className={col.cellClassName}
                    >
                      {col.render
                        ? col.render(row)
                        : String(row[col.key] ?? "")}
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

      {/* Pagination */}
      {totalItems > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Tampilkan</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                setPageSize(Number(v));
                setPage(0);
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span>dari {totalItems} data</span>
          </div>

          <div className="flex items-center gap-2">
            <span>
              Halaman {safePage + 1} dari {totalPages}
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={safePage === 0}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Sebelumnya</span>
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() =>
                  setPage((p) => Math.min(totalPages - 1, p + 1))
                }
                disabled={safePage >= totalPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">Selanjutnya</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
