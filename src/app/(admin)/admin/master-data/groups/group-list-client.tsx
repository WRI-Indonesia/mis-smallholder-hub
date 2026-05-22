"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { GroupFormModal } from "./group-form-modal";
import { toggleFarmerGroupActive } from "@/server/actions/farmer-group";
import { toast } from "sonner";
import { TableActions } from "@/components/shared";

interface FarmerGroup {
  id: string;
  code: string | null;
  abrv: string | null;
  abrv3id: string | null;
  name: string;
  category: string;
  districtId: string;
  district: { name: string };
  joinYear: number | null;
  locationLat: number | null;
  locationLong: number | null;
  isActive: boolean;
}

interface District {
  id: string;
  name: string;
}

interface Props {
  initialGroups: FarmerGroup[];
  districts: District[];
  permissions: string[];
}

export function GroupListClient({ initialGroups, districts, permissions }: Props) {
  const [search, setSearch] = useState("");
  const [districtFilter, setDistrictFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [showForm, setShowForm] = useState(false);
  const [editGroup, setEditGroup] = useState<FarmerGroup | null>(null);
  const router = useRouter();

  const filtered = initialGroups.filter((g) => {
    const matchSearch =
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      (g.code ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (g.abrv ?? "").toLowerCase().includes(search.toLowerCase());
    const matchDistrict = districtFilter === "all" || g.districtId === districtFilter;
    return matchSearch && matchDistrict;
  });

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const paginatedData = filtered.slice(safePage * pageSize, (safePage + 1) * pageSize);

  async function handleToggleActive(id: string) {
    const result = await toggleFarmerGroupActive(id);
    if (result.success) {
      toast.success("Status berhasil diubah");
      router.refresh();
    } else {
      toast.error("Gagal mengubah status");
    }
  }

  return (
    <>
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama, kode, atau singkatan..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="pl-9"
            />
          </div>
          <Select value={districtFilter} onValueChange={(v) => { setDistrictFilter(v ?? "all"); setPage(0); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Semua Distrik" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Distrik</SelectItem>
              {districts.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {permissions.includes("CREATE") && (
            <Button onClick={() => { setEditGroup(null); setShowForm(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah KT
            </Button>
          )}
        </div>

        <div>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/70 border-b-2 border-border">
                <TableHead className="w-[1%] whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-muted-foreground">Aksi</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kode</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nama</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Distrik</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kategori</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((group) => (
                <TableRow key={group.id}>
                  <TableCell className="w-[1%] whitespace-nowrap">
                    <TableActions
                      permissions={permissions}
                      actions={[
                        {
                          type: "view",
                          onClick: () => router.push(`/admin/master-data/groups/${group.id}`),
                        },
                        {
                          type: "edit",
                          onClick: () => {
                            setEditGroup(group);
                            setShowForm(true);
                          },
                        },
                        {
                          type: "delete",
                          isActive: group.isActive,
                          onClick: () => handleToggleActive(group.id),
                        },
                      ]}
                    />
                  </TableCell>
                  <TableCell className="text-sm font-mono text-muted-foreground">{group.code ?? "—"}</TableCell>
                  <TableCell className="text-sm font-medium">{group.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{group.district.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {group.category === "EX_PLASMA" ? "Ex Plasma" : "Swadaya"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={group.isActive ? "default" : "outline"}>
                      {group.isActive ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Tidak ada data
                  </TableCell>
                </TableRow>
              )}
              {paginatedData.length > 0 && paginatedData.length < pageSize &&
                Array.from({ length: pageSize - paginatedData.length }).map((_, i) => (
                  <TableRow key={`empty-${i}`}>
                    <TableCell colSpan={6} className="h-[49px]">&nbsp;</TableCell>
                  </TableRow>
                ))
              }
            </TableBody>
          </Table>
        </div>

        {totalItems > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground mt-4 border-t pt-4">
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
                  {[10, 25, 50, 100].map((size) => (
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
      </Card>

      <GroupFormModal
        key={editGroup?.id ?? "new"}
        open={showForm}
        onClose={() => { setShowForm(false); setEditGroup(null); }}
        group={editGroup}
        districts={districts}
      />
    </>
  );
}
