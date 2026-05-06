"use client";

import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit2, Trash2, ChevronLeft, ChevronRight, Check, ChevronsUpDown, SlidersHorizontal, Eye } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { deleteFarmer, type FarmerRow, type PaginatedFarmers, type BatchDropdownItem } from "@/server/actions/farmer";
import { type FarmerGroupRow } from "@/server/actions/farmer-group";
import { FarmerFormModal } from "./farmer-form-modal";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

interface FarmerListClientProps {
  initialData: PaginatedFarmers;
  groups: FarmerGroupRow[];
  batches: BatchDropdownItem[];
}

export function FarmerListClient({
  initialData,
  groups,
  batches,
}: FarmerListClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [modalOpen, setModalOpen] = useState(false);
  const [groupFilterOpen, setGroupFilterOpen] = useState(false);
  const [editFarmer, setEditFarmer] = useState<FarmerRow | null>(null);
  const [deleteFarmerId, setDeleteFarmerId] = useState<string | null>(null);

  const [visibleCols, setVisibleCols] = useState<Set<string>>(
    new Set(["wriFarmerId", "name", "gender", "group", "district", "batch"])
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
    if (!deleteFarmerId) return;
    const result = await deleteFarmer(deleteFarmerId);
    if (result.success) {
      toast.success("Data petani berhasil dihapus.");
      setDeleteFarmerId(null);
    } else {
      toast.error(result.error);
    }
  };

  const maskNik = (nik: string) => {
    if (nik.length === 16) {
      return `${nik.slice(0, 4)}********${nik.slice(-4)}`;
    }
    return nik;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Data Petani</h2>
          <p className="text-muted-foreground">
            Kelola direktori profil petani terdaftar.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditFarmer(null);
            setModalOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Tambah Petani
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
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
                : groups.find((g) => g.id === currentGroup)?.name || "Semua Kelompok Tani"}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </PopoverTrigger>
            <PopoverContent className="w-[250px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Cari kelompok..." />
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
                        value={g.name}
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
                        {g.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Cari nama atau NIK..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-8 h-9"
          />
        </div>

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
                <DropdownMenuCheckboxItem checked={visibleCols.has("wriFarmerId")} onCheckedChange={() => toggleColumn("wriFarmerId")}>ID Petani</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={visibleCols.has("name")} onCheckedChange={() => toggleColumn("name")}>Nama</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={visibleCols.has("nik")} onCheckedChange={() => toggleColumn("nik")}>NIK</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={visibleCols.has("gender")} onCheckedChange={() => toggleColumn("gender")}>Gender</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={visibleCols.has("group")} onCheckedChange={() => toggleColumn("group")}>Kelompok</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={visibleCols.has("district")} onCheckedChange={() => toggleColumn("district")}>Kabupaten</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={visibleCols.has("batch")} onCheckedChange={() => toggleColumn("batch")}>Batch</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={visibleCols.has("status")} onCheckedChange={() => toggleColumn("status")}>Status</DropdownMenuCheckboxItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="rounded-md border bg-card relative">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/70 border-b-2">
              {visibleCols.has("wriFarmerId") && <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">ID Petani</TableHead>}
              {visibleCols.has("name") && <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nama</TableHead>}
              {visibleCols.has("nik") && <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">NIK</TableHead>}
              {visibleCols.has("gender") && <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gender</TableHead>}
              {visibleCols.has("group") && <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kelompok</TableHead>}
              {visibleCols.has("district") && <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kabupaten</TableHead>}
              {visibleCols.has("batch") && <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Batch</TableHead>}
              {visibleCols.has("status") && <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>}
              <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialData.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                  Belum ada data petani.
                </TableCell>
              </TableRow>
            ) : (
              initialData.data.map((row) => (
                <TableRow key={row.id}>
                  {visibleCols.has("wriFarmerId") && <TableCell className="font-mono text-muted-foreground">{row.wriFarmerId || "—"}</TableCell>}
                  {visibleCols.has("name") && <TableCell className="font-medium">{row.name}</TableCell>}
                  {visibleCols.has("nik") && <TableCell className="font-mono text-muted-foreground">{maskNik(row.nik)}</TableCell>}
                  {visibleCols.has("gender") && <TableCell>{row.gender === "L" ? "Laki-laki" : row.gender === "P" ? "Perempuan" : row.gender}</TableCell>}
                  {visibleCols.has("group") && <TableCell>{row.farmerGroup?.name}</TableCell>}
                  {visibleCols.has("district") && <TableCell>{row.farmerGroup?.district?.name}</TableCell>}
                  {visibleCols.has("batch") && (
                    <TableCell>
                      {row.batch?.name ? (
                        <Badge variant="outline">{row.batch.name}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  )}
                  {visibleCols.has("status") && <TableCell>{row.status ? <Badge variant="secondary">{row.status}</Badge> : <span className="text-muted-foreground">—</span>}</TableCell>}
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-1">
                      <Link
                        href={`/admin/master-data/farmers/${row.id}`}
                        className="h-8 w-8 inline-flex items-center justify-center rounded-md transition-colors hover:bg-accent hover:text-accent-foreground"
                        title="Detail"
                      >
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">Detail</span>
                      </Link>
                      <button
                        title="Edit"
                        className="h-8 w-8 inline-flex items-center justify-center rounded-md transition-colors hover:bg-accent hover:text-accent-foreground"
                        onClick={() => {
                          setEditFarmer(row);
                          setModalOpen(true);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </button>
                      <button
                        title="Hapus"
                        className="h-8 w-8 inline-flex items-center justify-center rounded-md text-red-600 transition-colors hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-950"
                        onClick={() => setDeleteFarmerId(row.id)}
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

      {initialData.total > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Tampilkan {initialData.data.length} dari {initialData.total} data</span>
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

      {modalOpen && (
        <FarmerFormModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          farmer={editFarmer}
          groups={groups}
          batches={batches}
        />
      )}

      <DeleteDialog
        open={!!deleteFarmerId}
        onClose={() => setDeleteFarmerId(null)}
        onConfirm={handleDelete}
        title="Hapus Petani"
        description="Apakah Anda yakin ingin menghapus data petani ini? Tindakan ini tidak dapat dibatalkan. Petani yang memiliki land parcel tidak dapat dihapus."
      />
    </div>
  );
}
