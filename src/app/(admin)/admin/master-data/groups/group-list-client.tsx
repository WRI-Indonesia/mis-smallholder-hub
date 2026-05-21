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
import { Plus, Search, Eye, Pencil, Trash2, RotateCcw } from "lucide-react";
import { GroupFormModal } from "./group-form-modal";
import { toggleFarmerGroupActive } from "@/server/actions/farmer-group";
import { toast } from "sonner";

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
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editGroup, setEditGroup] = useState<FarmerGroup | null>(null);
  const router = useRouter();
  const perPage = 10;

  const filtered = initialGroups.filter((g) => {
    const matchSearch =
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      (g.code ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (g.abrv ?? "").toLowerCase().includes(search.toLowerCase());
    const matchDistrict = districtFilter === "all" || g.districtId === districtFilter;
    return matchSearch && matchDistrict;
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

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
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>
          <Select value={districtFilter} onValueChange={(v) => { setDistrictFilter(v ?? "all"); setPage(1); }}>
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
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Aksi</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kode</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nama</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Distrik</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kategori</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((group) => (
                <TableRow key={group.id}>
                  <TableCell className="space-x-1">
                    <Button variant="ghost" size="icon" title="Lihat" onClick={() => router.push(`/admin/master-data/groups/${group.id}`)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {permissions.includes("EDIT") && (
                      <Button variant="ghost" size="icon" title="Edit" onClick={() => { setEditGroup(group); setShowForm(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {permissions.includes("DELETE") && (
                      group.isActive ? (
                        <Button variant="ghost" size="icon" title="Nonaktifkan" onClick={() => handleToggleActive(group.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="icon" title="Aktifkan kembali" onClick={() => handleToggleActive(group.id)}>
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )
                    )}
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
              {paginated.length > 0 && paginated.length < perPage &&
                Array.from({ length: perPage - paginated.length }).map((_, i) => (
                  <TableRow key={`empty-${i}`}>
                    <TableCell colSpan={6} className="h-[49px]">&nbsp;</TableCell>
                  </TableRow>
                ))
              }
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between pt-4 border-t mt-4">
          <p className="text-sm text-muted-foreground">
            {filtered.length === 0 ? "0 data" : `Menampilkan ${(page - 1) * perPage + 1}–${Math.min(page * perPage, filtered.length)} dari ${filtered.length}`}
          </p>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
              Prev
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              Next
            </Button>
          </div>
        </div>
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
