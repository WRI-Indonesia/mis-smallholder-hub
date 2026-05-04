"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { DataTable, DataTableColumn } from "@/components/shared/data-table";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import {
  deleteFarmerGroup,
  type FarmerGroupRow,
  type DistrictDropdownItem,
} from "@/server/actions/farmer-group";
import { GroupFormModal } from "./group-form-modal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, Edit2, Trash2, MapPin } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ─── Types ───────────────────────────────────────────────────────────────────

interface GroupListClientProps {
  initialGroups: FarmerGroupRow[];
  districts: DistrictDropdownItem[];
}

// ─── Component ───────────────────────────────────────────────────────────────

export function GroupListClient({
  initialGroups,
  districts,
}: GroupListClientProps) {
  console.log("CLIENT DEBUG - initialGroups count:", initialGroups.length);
  if (initialGroups.length > 0) {
    console.log("CLIENT DEBUG - first group:", {
      id: initialGroups[0].id,
      name: initialGroups[0].name,
      abrv3id: (initialGroups[0] as any).abrv3id,
    });
  }

  const [modalOpen, setModalOpen] = useState(false);
  const [viewGroup, setViewGroup] = useState<FarmerGroupRow | null>(null);
  const [editGroup, setEditGroup] = useState<FarmerGroupRow | null>(null);
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);
  const [filterDistrictId, setFilterDistrictId] = useState<string>("all");
  const router = useRouter();

  // ─── Group districts by province for filter dropdown ─────────────────────

  const districtsByProvince = useMemo(() => {
    const map = new Map<string, { provinceName: string; districts: DistrictDropdownItem[] }>();
    for (const d of districts) {
      const key = d.province.id;
      if (!map.has(key)) {
        map.set(key, { provinceName: d.province.name, districts: [] });
      }
      map.get(key)!.districts.push(d);
    }
    return Array.from(map.values()).sort((a, b) =>
      a.provinceName.localeCompare(b.provinceName)
    );
  }, [districts]);

  // ─── Filter data ────────────────────────────────────────────────────────

  const filteredGroups = useMemo(() => {
    if (filterDistrictId === "all") return initialGroups;
    return initialGroups.filter((g) => g.districtId === filterDistrictId);
  }, [initialGroups, filterDistrictId]);

  // ─── Table columns ──────────────────────────────────────────────────────

  const columns: DataTableColumn<FarmerGroupRow>[] = [
    {
      key: "code",
      label: "Kode",
      cellClassName: "font-mono text-primary",
      render: (row) => <span>{row.code || "—"}</span>,
    },
    {
      key: "abrv",
      label: "Singkatan",
      render: (row) => <span>{row.abrv || "—"}</span>,
    },
    {
      key: "name",
      label: "Nama Kelompok",
      cellClassName: "font-medium",
    },
    {
      key: "abrv3id",
      label: "3ID",
      render: (row) => (
        <span className={!row.abrv3id ? "text-muted-foreground italic text-xs" : ""}>
          {row.abrv3id || "n/a"}
        </span>
      ),
    },
    {
      key: "district",
      label: "Kabupaten",
      render: (row) => (
        <div className="flex flex-col">
          <span>{row.district.name}</span>
          <span className="text-xs text-muted-foreground">
            {row.district.province.name}
          </span>
        </div>
      ),
    },
    {
      key: "_count",
      label: "Petani",
      render: (row) => (
        <Badge variant="outline">{row._count.farmers} petani</Badge>
      ),
    },
    {
      key: "locationLat",
      label: "Koordinat",
      defaultVisible: false,
      render: (row) =>
        row.locationLat && row.locationLong ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-mono">
            <MapPin className="h-3 w-3" />
            {row.locationLat.toFixed(4)}, {row.locationLong.toFixed(4)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ];

  // ─── Handlers ──────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteGroupId) return;
    const result = await deleteFarmerGroup(deleteGroupId);
    if (result.success) {
      toast.success("Kelompok tani berhasil dihapus.");
      setDeleteGroupId(null);
    } else {
      toast.error(result.error);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Manajemen Kelompok Tani
          </h2>
          <p className="text-muted-foreground">
            Kelola data kelompok tani dan relasi ke kabupaten.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditGroup(null);
            setModalOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Tambah Kelompok Tani
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={filteredGroups}
        rowKey={(r) => r.id}
        searchPlaceholder="Cari kelompok, kode, atau kabupaten..."
        searchFn={(row, query) => {
          const lowerQuery = query.toLowerCase();
          if (!lowerQuery) return true;
          
          const name = row.name?.toLowerCase() || "";
          const code = row.code?.toLowerCase() || "";
          const abrv = row.abrv?.toLowerCase() || "";
          const abrv3id = row.abrv3id?.toLowerCase() || "";
          const districtName = row.district?.name?.toLowerCase() || "";
          
          return (
            name.includes(lowerQuery) ||
            code.includes(lowerQuery) ||
            abrv.includes(lowerQuery) ||
            abrv3id.includes(lowerQuery) ||
            districtName.includes(lowerQuery)
          );
        }}
        emptyMessage="Belum ada data kelompok tani."
        toolbarLeft={
          <div className="flex items-center gap-2">
            <Select value={filterDistrictId} onValueChange={(v) => setFilterDistrictId(v || "all")}>
              <SelectTrigger className="w-[200px] h-9">
                <SelectValue placeholder="Semua Kabupaten" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kabupaten</SelectItem>
                {districtsByProvince.map((group) => (
                  <SelectGroup key={group.provinceName}>
                    <SelectLabel>{group.provinceName}</SelectLabel>
                    {group.districts.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            {filterDistrictId !== "all" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilterDistrictId("all")}
                className="h-9 px-2 text-muted-foreground"
              >
                Reset
              </Button>
            )}
          </div>
        }
        renderActions={(row) => (
          <div className="inline-flex items-center gap-1">
            <button
              title="Lihat"
              className="h-8 w-8 inline-flex items-center justify-center rounded-md transition-colors hover:bg-accent hover:text-accent-foreground"
              onClick={() => router.push(`/admin/master-data/groups/${row.id}`)}
            >
              <Eye className="h-4 w-4" />
              <span className="sr-only">Lihat</span>
            </button>
            <button
              title="Edit"
              className="h-8 w-8 inline-flex items-center justify-center rounded-md transition-colors hover:bg-accent hover:text-accent-foreground"
              onClick={() => {
                setEditGroup(row);
                setModalOpen(true);
              }}
            >
              <Edit2 className="h-4 w-4" />
              <span className="sr-only">Edit</span>
            </button>
            <button
              title="Hapus"
              className="h-8 w-8 inline-flex items-center justify-center rounded-md text-red-600 transition-colors hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-950"
              onClick={() => setDeleteGroupId(row.id)}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Hapus</span>
            </button>
          </div>
        )}
      />

      {/* Form Modal */}
      {modalOpen && (
        <GroupFormModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          group={editGroup}
          districts={districts}
        />
      )}

      {/* View Dialog */}
      {viewGroup && (
        <Dialog open={!!viewGroup} onOpenChange={(open) => !open && setViewGroup(null)}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>Detail Kelompok Tani</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2 text-sm">
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="text-muted-foreground">Nama</span>
                <span className="font-medium">{viewGroup.name}</span>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="text-muted-foreground">Kode</span>
                <span>{viewGroup.code || "—"}</span>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="text-muted-foreground">Singkatan</span>
                <span>{viewGroup.abrv || "—"}</span>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="text-muted-foreground">Singkatan 3ID</span>
                <span>{viewGroup.abrv3id || "—"}</span>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="text-muted-foreground">Kabupaten</span>
                <span>{viewGroup.district.name} ({viewGroup.district.province.name})</span>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="text-muted-foreground">Jumlah Petani</span>
                <Badge variant="outline" className="w-fit">{viewGroup._count.farmers} petani</Badge>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="text-muted-foreground">Koordinat</span>
                <span>
                  {viewGroup.locationLat && viewGroup.locationLong
                    ? `${viewGroup.locationLat.toFixed(6)}, ${viewGroup.locationLong.toFixed(6)}`
                    : "—"}
                </span>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Dialog */}
      <DeleteDialog
        open={!!deleteGroupId}
        onClose={() => setDeleteGroupId(null)}
        onConfirm={handleDelete}
        title="Hapus Kelompok Tani"
        description="Apakah Anda yakin ingin menghapus kelompok tani ini? Kelompok yang masih memiliki petani tidak dapat dihapus."
      />
    </div>
  );
}
