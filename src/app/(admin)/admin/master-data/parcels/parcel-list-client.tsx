"use client";

import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Check,
  ChevronsUpDown,
  SlidersHorizontal,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import {
  deleteLandParcel,
  type LandParcelRow,
  type PaginatedParcels,
  type FarmerDropdownItem,
  type FarmerGroupDropdownItem,
  type CommodityDropdownItem,
} from "@/server/actions/land-parcel";
import { ParcelFormModal } from "./parcel-form-modal";
import { ParcelViewModal } from "./parcel-view-modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";

// ─── Debounce hook ────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParcelListClientProps {
  initialData: PaginatedParcels;
  farmers: FarmerDropdownItem[];
  groups: FarmerGroupDropdownItem[];
  commodities: CommodityDropdownItem[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ParcelListClient({
  initialData,
  farmers,
  groups,
  commodities,
}: ParcelListClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [modalOpen, setModalOpen] = useState(false);
  const [groupFilterOpen, setGroupFilterOpen] = useState(false);
  const [viewParcel, setViewParcel] = useState<LandParcelRow | null>(null);
  const [editParcel, setEditParcel] = useState<LandParcelRow | null>(null);
  const [deleteParcelId, setDeleteParcelId] = useState<string | null>(null);

  const [visibleCols, setVisibleCols] = useState<Set<string>>(
    new Set(["parcelCode", "farmer", "group", "commodity", "polygonSizeHa", "legalSizeHa", "status"])
  );

  const toggleColumn = (key: string) => {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const currentSearch = searchParams.get("search") || "";
  const currentGroup = searchParams.get("group") || "all";

  const [searchInput, setSearchInput] = useState(currentSearch);
  const debouncedSearch = useDebounce(searchInput, 300);

  useEffect(() => {
    if (debouncedSearch !== currentSearch) {
      const params = new URLSearchParams(searchParams);
      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      } else {
        params.delete("search");
      }
      params.set("page", "1");
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    }
  }, [debouncedSearch, currentSearch, pathname, router, searchParams]);

  const handleGroupChange = (value: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (value && value !== "all") {
      params.set("group", value);
    } else {
      params.delete("group");
    }
    params.set("page", "1");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", newPage.toString());
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleDelete = async () => {
    if (!deleteParcelId) return;
    const result = await deleteLandParcel(deleteParcelId);
    if (result.success) {
      toast.success("Persil lahan berhasil dihapus.");
      setDeleteParcelId(null);
    } else {
      toast.error(result.error);
    }
  };

  const formatHa = (val: number | null) =>
    val != null ? `${val.toLocaleString("id-ID", { maximumFractionDigits: 4 })} ha` : "—";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Data Persil Lahan</h2>
          <p className="text-muted-foreground">
            Kelola data persil lahan petani terdaftar.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditParcel(null);
            setModalOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Tambah Persil
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Filter by farmer group */}
        <Popover open={groupFilterOpen} onOpenChange={setGroupFilterOpen}>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={groupFilterOpen}
                className="w-[250px] justify-between h-9"
              />
            }
          >
            {currentGroup === "all"
              ? "Semua Kelompok Tani"
              : groups.find((g) => g.id === currentGroup)?.name ||
                "Semua Kelompok Tani"}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </PopoverTrigger>
          <PopoverContent className="w-[280px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Cari kelompok tani..." />
              <CommandList>
                <CommandEmpty>Kelompok tani tidak ditemukan.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="all"
                    onSelect={() => {
                      handleGroupChange("all");
                      setGroupFilterOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        currentGroup === "all" ? "opacity-100" : "opacity-0"
                      )}
                    />
                    Semua Kelompok Tani
                  </CommandItem>
                  {groups.map((g) => (
                    <CommandItem
                      key={g.id}
                      value={`${g.name} ${g.code ?? ""}`}
                      onSelect={() => {
                        handleGroupChange(g.id);
                        setGroupFilterOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          currentGroup === g.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span>{g.name}</span>
                      {g.code && (
                        <span className="ml-2 text-muted-foreground text-xs">
                          {g.code}
                        </span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Cari kode persil, nama, atau NIK..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-8 h-9"
          />
        </div>

        {/* Column visibility */}
        <div className="flex items-center gap-2 ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 px-3 py-2 text-sm font-medium border rounded-md bg-background hover:bg-accent hover:text-accent-foreground outline-none transition-colors h-9">
              <SlidersHorizontal className="h-4 w-4" />
              Kolom
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Tampilkan Kolom</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={visibleCols.has("parcelCode")}
                  onCheckedChange={() => toggleColumn("parcelCode")}
                >
                  Kode Persil
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleCols.has("farmer")}
                  onCheckedChange={() => toggleColumn("farmer")}
                >
                  Nama Petani
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleCols.has("group")}
                  onCheckedChange={() => toggleColumn("group")}
                >
                  Kelompok Tani
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleCols.has("commodity")}
                  onCheckedChange={() => toggleColumn("commodity")}
                >
                  Komoditas
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleCols.has("polygonSizeHa")}
                  onCheckedChange={() => toggleColumn("polygonSizeHa")}
                >
                  Luas Polygon
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleCols.has("legalSizeHa")}
                  onCheckedChange={() => toggleColumn("legalSizeHa")}
                >
                  Luas Legal
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleCols.has("legalId")}
                  onCheckedChange={() => toggleColumn("legalId")}
                >
                  ID Legal
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleCols.has("status")}
                  onCheckedChange={() => toggleColumn("status")}
                >
                  Status
                </DropdownMenuCheckboxItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border bg-card relative">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/70 border-b-2">
              {visibleCols.has("parcelCode") && (
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Kode Persil
                </TableHead>
              )}
              {visibleCols.has("farmer") && (
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Nama Petani
                </TableHead>
              )}
              {visibleCols.has("group") && (
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Kelompok Tani
                </TableHead>
              )}
              {visibleCols.has("commodity") && (
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Komoditas
                </TableHead>
              )}
              {visibleCols.has("polygonSizeHa") && (
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">
                  Luas Polygon
                </TableHead>
              )}
              {visibleCols.has("legalSizeHa") && (
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">
                  Luas Legal
                </TableHead>
              )}
              {visibleCols.has("legalId") && (
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  ID Legal
                </TableHead>
              )}
              {visibleCols.has("status") && (
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </TableHead>
              )}
              <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Aksi
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialData.data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={visibleCols.size + 1}
                  className="text-center h-24 text-muted-foreground"
                >
                  Belum ada data persil lahan.
                </TableCell>
              </TableRow>
            ) : (
              initialData.data.map((row) => (
                <TableRow key={row.id}>
                  {visibleCols.has("parcelCode") && (
                    <TableCell className="font-mono text-primary">
                      {row.parcelCode || "—"}
                    </TableCell>
                  )}
                  {visibleCols.has("farmer") && (
                    <TableCell className="font-medium">
                      {row.farmer.name}
                    </TableCell>
                  )}
                  {visibleCols.has("group") && (
                    <TableCell className="text-muted-foreground">
                      {row.farmer.farmerGroup.name}
                    </TableCell>
                  )}
                  {visibleCols.has("commodity") && (
                    <TableCell>
                      {row.commodity ? (
                        <Badge variant="outline">{row.commodity.name}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  )}
                  {visibleCols.has("polygonSizeHa") && (
                    <TableCell className="text-right tabular-nums">
                      {formatHa(row.polygonSizeHa)}
                    </TableCell>
                  )}
                  {visibleCols.has("legalSizeHa") && (
                    <TableCell className="text-right tabular-nums">
                      {formatHa(row.legalSizeHa)}
                    </TableCell>
                  )}
                  {visibleCols.has("legalId") && (
                    <TableCell className="font-mono text-muted-foreground text-xs">
                      {row.legalId || "—"}
                    </TableCell>
                  )}
                  {visibleCols.has("status") && (
                    <TableCell>
                      {row.status ? (
                        <Badge variant="secondary">{row.status}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  )}
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        title="Lihat Detail"
                        className="h-8 w-8 inline-flex items-center justify-center rounded-md transition-colors hover:bg-accent hover:text-accent-foreground"
                        onClick={() => setViewParcel(row)}
                      >
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">Lihat Detail</span>
                      </button>
                      <button
                        title="Edit"
                        className="h-8 w-8 inline-flex items-center justify-center rounded-md transition-colors hover:bg-accent hover:text-accent-foreground"
                        onClick={() => {
                          setEditParcel(row);
                          setModalOpen(true);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </button>
                      <button
                        title="Hapus"
                        className="h-8 w-8 inline-flex items-center justify-center rounded-md text-red-600 transition-colors hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-950"
                        onClick={() => setDeleteParcelId(row.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Hapus</span>
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {initialData.total > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Tampilkan {initialData.data.length} dari {initialData.total} data
          </span>
          <div className="flex items-center gap-2">
            <span>
              Halaman {initialData.page} dari {initialData.totalPages}
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handlePageChange(initialData.page - 1)}
                disabled={initialData.page <= 1 || isPending}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Sebelumnya</span>
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handlePageChange(initialData.page + 1)}
                disabled={initialData.page >= initialData.totalPages || isPending}
              >
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">Selanjutnya</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewParcel && (
        <ParcelViewModal
          parcel={viewParcel}
          onClose={() => setViewParcel(null)}
        />
      )}

      {/* Form Modal */}
      {modalOpen && (
        <ParcelFormModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          parcel={editParcel}
          farmers={farmers}
          commodities={commodities}
        />
      )}

      {/* Delete Dialog */}
      <DeleteDialog
        open={!!deleteParcelId}
        onClose={() => setDeleteParcelId(null)}
        onConfirm={handleDelete}
        title="Hapus Persil Lahan"
        description="Apakah Anda yakin ingin menghapus persil lahan ini? Tindakan ini tidak dapat dibatalkan. Persil yang memiliki data produksi atau pemeliharaan tidak dapat dihapus."
      />
    </div>
  );
}
