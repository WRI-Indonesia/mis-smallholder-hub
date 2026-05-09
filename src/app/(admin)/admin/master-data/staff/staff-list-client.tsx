"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, Edit2, Trash2, Plus, Check, ChevronsUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import { DataTable, DataTableColumn } from "@/components/shared/data-table";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import {
  deleteStaff,
  getStaffById,
  type StaffRow,
  type StaffDetail,
  type JobDeskDropdownItem,
  type StaffDropdownItem,
} from "@/server/actions/staff";
import type { DistrictDropdownItem } from "@/server/actions/farmer-group";
import type { FarmerGroupDropdownItem } from "@/server/actions/training";
import { StaffFormModal } from "./staff-form-modal";

// ─── Types ───────────────────────────────────────────────────────────────────

interface StaffListClientProps {
  initialStaff: StaffRow[];
  jobDesks: JobDeskDropdownItem[];
  districts: DistrictDropdownItem[];
  farmerGroups: FarmerGroupDropdownItem[];
  staffDropdown: StaffDropdownItem[];
}

// ─── Component ───────────────────────────────────────────────────────────────

export function StaffListClient({
  initialStaff,
  jobDesks,
  districts,
  farmerGroups,
  staffDropdown,
}: StaffListClientProps) {
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editStaff, setEditStaff] = useState<StaffDetail | null>(null);
  const [filterJobDeskId, setFilterJobDeskId] = useState<string>("all");
  const [jobDeskOpen, setJobDeskOpen] = useState(false);

  // ─── Open edit modal — fetch detail first ────────────────────────────────

  async function handleOpenEdit(row: StaffRow) {
    const result = await getStaffById(row.id);
    if (result.success && result.data) {
      setEditStaff(result.data);
      setModalOpen(true);
    } else {
      toast.error("Gagal memuat data staff.");
    }
  }

  // ─── Filter ─────────────────────────────────────────────────────────────

  const filteredStaff = useMemo(() => {
    if (filterJobDeskId === "all") return initialStaff;
    return initialStaff.filter((s) => s.jobDeskId === filterJobDeskId);
  }, [initialStaff, filterJobDeskId]);

  const selectedJobDeskLabel =
    filterJobDeskId === "all"
      ? "Semua Job Desk"
      : jobDesks.find((j) => j.id === filterJobDeskId)?.name ?? "Semua Job Desk";

  // ─── Columns ────────────────────────────────────────────────────────────

  const columns: DataTableColumn<StaffRow>[] = [
    {
      key: "staffCode",
      label: "Kode Staff",
      cellClassName: "text-sm font-mono text-muted-foreground",
    },
    {
      key: "name",
      label: "Nama",
      cellClassName: "text-sm font-medium",
    },
    {
      key: "jobDesk",
      label: "Job Desk",
      render: (row) => (
        <Badge variant="secondary">{row.jobDesk.name}</Badge>
      ),
    },
    {
      key: "emailWri",
      label: "Email WRI",
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.emailWri || "—"}
        </span>
      ),
    },
    {
      key: "lineManager",
      label: "Line Manager",
      render: (row) =>
        row.lineManager ? (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm">{row.lineManager.name}</span>
            <span className="text-xs font-mono text-muted-foreground">
              {row.lineManager.staffCode}
            </span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        ),
    },
    {
      key: "_count",
      label: "Penugasan",
      sortable: false,
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="tabular-nums text-xs">
            {row._count.districts === 0 ? "Semua distrik" : `${row._count.districts} distrik`}
          </Badge>
          <Badge variant="outline" className="tabular-nums text-xs">
            {row._count.farmerGroups === 0 ? "Semua KT" : `${row._count.farmerGroups} KT`}
          </Badge>
        </div>
      ),
    },
  ];

  // ─── Handlers ───────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteId) return;
    const result = await deleteStaff(deleteId);
    if (result.success) {
      toast.success("Data staff berhasil dihapus.");
      setDeleteId(null);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Staff WRI</h1>
          <p className="text-muted-foreground">
            Daftar staff WRI beserta job desk dan area penugasan.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditStaff(null);
            setModalOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Tambah Staff
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={filteredStaff}
        rowKey={(r) => r.id}
        searchPlaceholder="Cari nama, kode, atau email..."
        searchFn={(row, q) =>
          row.name.toLowerCase().includes(q) ||
          row.staffCode.toLowerCase().includes(q) ||
          (row.emailWri?.toLowerCase().includes(q) ?? false) ||
          row.jobDesk.name.toLowerCase().includes(q)
        }
        emptyMessage="Belum ada data staff WRI."
        toolbarLeft={
          <Popover open={jobDeskOpen} onOpenChange={setJobDeskOpen}>
            <PopoverTrigger
              render={
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={jobDeskOpen}
                  className="w-[200px] justify-between h-9"
                />
              }
            >
              {selectedJobDeskLabel}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </PopoverTrigger>
            <PopoverContent className="w-[220px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Cari job desk..." />
                <CommandList>
                  <CommandEmpty>Job desk tidak ditemukan.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="all"
                      onSelect={() => {
                        setFilterJobDeskId("all");
                        setJobDeskOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          filterJobDeskId === "all" ? "opacity-100" : "opacity-0"
                        )}
                      />
                      Semua Job Desk
                    </CommandItem>
                    {jobDesks.map((j) => (
                      <CommandItem
                        key={j.id}
                        value={j.name}
                        onSelect={() => {
                          setFilterJobDeskId(j.id);
                          setJobDeskOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            filterJobDeskId === j.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {j.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        }
        renderActions={(row) => (
          <div className="inline-flex items-center gap-1">
            <button
              title="Lihat Detail"
              className="h-8 w-8 inline-flex items-center justify-center rounded-md transition-colors hover:bg-accent hover:text-accent-foreground"
              onClick={() => router.push(`/admin/master-data/staff/${row.id}`)}
            >
              <Eye className="h-4 w-4" />
              <span className="sr-only">Lihat</span>
            </button>
            <button
              title="Edit"
              className="h-8 w-8 inline-flex items-center justify-center rounded-md transition-colors hover:bg-accent hover:text-accent-foreground"
              onClick={() => handleOpenEdit(row)}
            >
              <Edit2 className="h-4 w-4" />
              <span className="sr-only">Edit</span>
            </button>
            <button
              title="Hapus"
              className="h-8 w-8 inline-flex items-center justify-center rounded-md text-red-600 transition-colors hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-950"
              onClick={() => setDeleteId(row.id)}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Hapus</span>
            </button>
          </div>
        )}
      />

      <DeleteDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Hapus Staff"
        description="Apakah Anda yakin ingin menghapus data staff ini? Staff yang masih menjadi line manager tidak dapat dihapus."
      />

      {modalOpen && (
        <StaffFormModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditStaff(null);
            router.refresh();
          }}
          staff={editStaff}
          jobDesks={jobDesks}
          districts={districts}
          farmerGroups={farmerGroups}
          staffDropdown={staffDropdown}
        />
      )}    </div>
  );
}
