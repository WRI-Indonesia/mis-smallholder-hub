"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { DataTable, DataTableColumn } from "@/components/shared/data-table";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import {
  deleteProvince,
  deleteDistrict,
  type ProvinceRow,
  type DistrictRow,
} from "@/server/actions/region";
import { ProvinceFormModal } from "./province-form-modal";
import { DistrictFormModal } from "./district-form-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit2, Trash2 } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface RegionListClientProps {
  initialProvinces: ProvinceRow[];
  initialDistricts: DistrictRow[];
}

// ─── Component ───────────────────────────────────────────────────────────────

export function RegionListClient({
  initialProvinces,
  initialDistricts,
}: RegionListClientProps) {
  const [activeTab, setActiveTab] = useState<"province" | "district">("province");

  // Province state
  const [provinceModalOpen, setProvinceModalOpen] = useState(false);
  const [editProvince, setEditProvince] = useState<ProvinceRow | null>(null);
  const [deleteProvinceId, setDeleteProvinceId] = useState<string | null>(null);

  // District state
  const [districtModalOpen, setDistrictModalOpen] = useState(false);
  const [editDistrict, setEditDistrict] = useState<DistrictRow | null>(null);
  const [deleteDistrictId, setDeleteDistrictId] = useState<string | null>(null);

  // ─── Province columns ──────────────────────────────────────────────────────

  const provinceColumns: DataTableColumn<ProvinceRow>[] = [
    { key: "code", label: "Kode", cellClassName: "font-mono font-medium text-primary" },
    { key: "name", label: "Nama Provinsi" },
    {
      key: "_count",
      label: "Kabupaten",
      render: (row) => (
        <Badge variant="outline">{row._count.districts} kabupaten</Badge>
      ),
    },
  ];

  // ─── District columns ──────────────────────────────────────────────────────

  const districtColumns: DataTableColumn<DistrictRow>[] = [
    { key: "code", label: "Kode", cellClassName: "font-mono font-medium text-primary" },
    { key: "name", label: "Nama Kabupaten" },
    {
      key: "province",
      label: "Provinsi",
      render: (row) => <span>{row.province.name}</span>,
    },
    {
      key: "_count",
      label: "Kelompok Tani",
      render: (row) => (
        <Badge variant="outline">{row._count.farmerGroups} kelompok</Badge>
      ),
    },
  ];

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleDeleteProvince = async () => {
    if (!deleteProvinceId) return;
    const result = await deleteProvince(deleteProvinceId);
    if (result.success) {
      toast.success("Provinsi berhasil dihapus.");
      setDeleteProvinceId(null);
    } else {
      toast.error(result.error);
    }
  };

  const handleDeleteDistrict = async () => {
    if (!deleteDistrictId) return;
    const result = await deleteDistrict(deleteDistrictId);
    if (result.success) {
      toast.success("Kabupaten berhasil dihapus.");
      setDeleteDistrictId(null);
    } else {
      toast.error(result.error);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Manajemen Wilayah</h2>
          <p className="text-muted-foreground">
            Kelola data provinsi dan kabupaten.
          </p>
        </div>
        <Button
          onClick={() => {
            if (activeTab === "province") {
              setEditProvince(null);
              setProvinceModalOpen(true);
            } else {
              setEditDistrict(null);
              setDistrictModalOpen(true);
            }
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Tambah {activeTab === "province" ? "Provinsi" : "Kabupaten"}
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b">
        <button
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === "province"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("province")}
        >
          Provinsi ({initialProvinces.length})
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === "district"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("district")}
        >
          Kabupaten ({initialDistricts.length})
        </button>
      </div>

      {/* Province Tab */}
      {activeTab === "province" && (
        <DataTable
          columns={provinceColumns}
          data={initialProvinces}
          rowKey={(r) => r.id}
          searchKey="name"
          searchPlaceholder="Cari nama provinsi..."
          emptyMessage="Belum ada data provinsi."
          renderActions={(row) => (
            <DropdownMenu>
              <DropdownMenuTrigger className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground">
                <span className="sr-only">Buka menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    setEditProvince(row);
                    setProvinceModalOpen(true);
                  }}
                >
                  <Edit2 className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600"
                  onClick={() => setDeleteProvinceId(row.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Hapus
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        />
      )}

      {/* District Tab */}
      {activeTab === "district" && (
        <DataTable
          columns={districtColumns}
          data={initialDistricts}
          rowKey={(r) => r.id}
          searchKey="name"
          searchPlaceholder="Cari nama kabupaten..."
          emptyMessage="Belum ada data kabupaten."
          renderActions={(row) => (
            <DropdownMenu>
              <DropdownMenuTrigger className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground">
                <span className="sr-only">Buka menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    setEditDistrict(row);
                    setDistrictModalOpen(true);
                  }}
                >
                  <Edit2 className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600"
                  onClick={() => setDeleteDistrictId(row.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Hapus
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        />
      )}

      {/* Modals */}
      {provinceModalOpen && (
        <ProvinceFormModal
          isOpen={provinceModalOpen}
          onClose={() => setProvinceModalOpen(false)}
          province={editProvince}
        />
      )}

      {districtModalOpen && (
        <DistrictFormModal
          isOpen={districtModalOpen}
          onClose={() => setDistrictModalOpen(false)}
          district={editDistrict}
          provinces={initialProvinces}
        />
      )}

      {/* Delete Dialogs */}
      <DeleteDialog
        open={!!deleteProvinceId}
        onClose={() => setDeleteProvinceId(null)}
        onConfirm={handleDeleteProvince}
        title="Hapus Provinsi"
        description="Apakah Anda yakin ingin menghapus provinsi ini? Provinsi yang masih memiliki kabupaten tidak dapat dihapus."
      />

      <DeleteDialog
        open={!!deleteDistrictId}
        onClose={() => setDeleteDistrictId(null)}
        onConfirm={handleDeleteDistrict}
        title="Hapus Kabupaten"
        description="Apakah Anda yakin ingin menghapus kabupaten ini? Kabupaten yang masih memiliki kelompok tani tidak dapat dihapus."
      />
    </div>
  );
}
