"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";import { Eye, Edit2, Trash2, FileDown, Check, ChevronsUpDown, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";import {
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
import { cn } from "@/lib/utils";
import { DataTable, DataTableColumn } from "@/components/shared/data-table";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import {
  deleteTrainingActivity,
  type TrainingActivityRow,
  type FarmerGroupDropdownItem,
  type TrainingPackageDropdownItem,
} from "@/server/actions/training";
import { TrainingFormModal } from "./training-form-modal";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TrainingListClientProps {
  initialActivities: TrainingActivityRow[];
  farmerGroups: FarmerGroupDropdownItem[];
  trainingPackages: TrainingPackageDropdownItem[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TrainingListClient({ initialActivities, farmerGroups, trainingPackages }: TrainingListClientProps) {
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterGroupId, setFilterGroupId] = useState<string>("all");
  const [groupFilterOpen, setGroupFilterOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editActivity, setEditActivity] = useState<TrainingActivityRow | null>(null);

  // ─── Filter data ────────────────────────────────────────────────────────

  const filteredActivities = useMemo(() => {
    if (filterGroupId === "all") return initialActivities;
    return initialActivities.filter((a) => a.farmerGroup?.id === filterGroupId);
  }, [initialActivities, filterGroupId]);

  const selectedGroupName =
    filterGroupId === "all"
      ? "Semua Kelompok Tani"
      : farmerGroups.find((g) => g.id === filterGroupId)?.name ?? "Semua Kelompok Tani";

  // ─── Table columns ──────────────────────────────────────────────────────

  const columns: DataTableColumn<TrainingActivityRow>[] = [
    {
      key: "farmerGroup",
      label: "Kelompok Tani",
      render: (row) =>
        row.farmerGroup ? (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">{row.farmerGroup.name}</span>
            <span className="text-sm text-muted-foreground">
              {row.farmerGroup.district.name}
            </span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        ),
    },
    {
      key: "package",
      label: "Paket Training",
      render: (row) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">{row.package.name}</span>
          <span className="text-sm font-mono text-muted-foreground">
            {row.package.code}
          </span>
        </div>
      ),
    },
    {
      key: "trainingDate",
      label: "Tanggal Training",
      render: (row) => (
        <span className="text-sm">{formatDate(row.trainingDate)}</span>
      ),
    },
    {
      key: "location",
      label: "Lokasi",
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.location || "—"}
        </span>
      ),
    },
    {
      key: "_count",
      label: "Peserta",
      render: (row) => (
        <Badge variant="outline" className="tabular-nums">
          {row._count.participants} peserta
        </Badge>
      ),
    },
  ];

  // ─── Handlers ──────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteId) return;
    const result = await deleteTrainingActivity(deleteId);
    if (result.success) {
      toast.success("Data training berhasil dihapus.");
      setDeleteId(null);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Training</h1>
          <p className="text-muted-foreground">
            Daftar kegiatan pelatihan kelompok tani dan peserta yang mengikuti.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditActivity(null);
            setModalOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Tambah Kegiatan
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={filteredActivities}
        rowKey={(r) => r.id}
        searchPlaceholder="Cari kelompok, paket, atau lokasi..."
        searchFn={(row, query) => {
          const q = query.toLowerCase();
          return (
            (row.farmerGroup?.name?.toLowerCase().includes(q) ?? false) ||
            row.package.name.toLowerCase().includes(q) ||
            row.package.code.toLowerCase().includes(q) ||
            (row.location?.toLowerCase().includes(q) ?? false)
          );
        }}
        emptyMessage="Belum ada data kegiatan training."
        toolbarLeft={
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
              {selectedGroupName}
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
                        setFilterGroupId("all");
                        setGroupFilterOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          filterGroupId === "all" ? "opacity-100" : "opacity-0"
                        )}
                      />
                      Semua Kelompok Tani
                    </CommandItem>
                    {farmerGroups.map((g) => (
                      <CommandItem
                        key={g.id}
                        value={`${g.name} ${g.code ?? ""}`}
                        onSelect={() => {
                          setFilterGroupId(g.id);
                          setGroupFilterOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            filterGroupId === g.id ? "opacity-100" : "opacity-0"
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
        }
        renderActions={(row) => {
          const evidence = row.evidences[0] ?? null;
          return (
            <div className="inline-flex items-center gap-1">
              {/* PDF Evidence */}
              {evidence ? (
                <a
                  href={evidence.presignedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Lihat Evidence PDF"
                  className="h-8 w-8 inline-flex items-center justify-center rounded-md text-primary transition-colors hover:bg-accent"
                >
                  <FileDown className="h-4 w-4" />
                  <span className="sr-only">Evidence PDF</span>
                </a>
              ) : (
                <span
                  title="Tidak ada evidence"
                  className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground/40 cursor-not-allowed"
                >
                  <FileDown className="h-4 w-4" />
                </span>
              )}

              {/* View */}
              <button
                title="Lihat Detail"
                className="h-8 w-8 inline-flex items-center justify-center rounded-md transition-colors hover:bg-accent hover:text-accent-foreground"
                onClick={() => router.push(`/admin/master-data/training/${row.id}`)}
              >
                <Eye className="h-4 w-4" />
                <span className="sr-only">Lihat</span>
              </button>

              {/* Edit */}
              <button
                title="Edit"
                className="h-8 w-8 inline-flex items-center justify-center rounded-md transition-colors hover:bg-accent hover:text-accent-foreground"
                onClick={() => {
                  setEditActivity(row);
                  setModalOpen(true);
                }}
              >
                <Edit2 className="h-4 w-4" />
                <span className="sr-only">Edit</span>
              </button>

              {/* Delete */}
              <button
                title="Hapus"
                className="h-8 w-8 inline-flex items-center justify-center rounded-md text-red-600 transition-colors hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-950"
                onClick={() => setDeleteId(row.id)}
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Hapus</span>
              </button>
            </div>
          );
        }}
      />

      {/* Delete Dialog */}
      <DeleteDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Hapus Data Training"
        description="Apakah Anda yakin ingin menghapus kegiatan training ini? Semua data peserta terkait juga akan dihapus. Tindakan ini tidak dapat dibatalkan."
      />

      {/* Form Modal */}
      {modalOpen && (
        <TrainingFormModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditActivity(null);
            router.refresh();
          }}
          activity={editActivity}
          farmerGroups={farmerGroups}
          trainingPackages={trainingPackages}
        />
      )}
    </div>
  );
}
