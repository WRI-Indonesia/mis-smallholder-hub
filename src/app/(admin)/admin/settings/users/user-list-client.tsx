"use client";

import { useState, useTransition } from "react";
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
import { Plus, Search, ChevronLeft, ChevronRight, Database } from "lucide-react";
import { UserFormModal } from "./user-form-modal";
import { UserDataAccessModal } from "./user-data-access-modal";
import { toggleUserActive } from "@/server/actions/user";
import { toast } from "sonner";
import { TableActions } from "@/components/shared";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
  provinces: { province: { name: string } }[];
  districts: { district: { name: string } }[];
  farmerGroups: { farmerGroup: { name: string; abrv: string | null } }[];
}

interface Props {
  initialUsers: User[];
  permissions: string[];
}
// ─── Access Summary Cell ──────────────────────────────────────────────────────

function AccessSummaryCell({ user }: { user: User }) {
  const hasAny = user.provinces.length > 0 || user.districts.length > 0 || user.farmerGroups.length > 0;

  if (!hasAny) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {user.provinces.map((p, i) => (
        <Badge key={i} variant="outline" className="text-xs font-normal py-0">
          {p.province.name}
        </Badge>
      ))}
      {user.districts.map((d, i) => (
        <Badge key={i} variant="outline" className="text-xs font-normal py-0">
          {d.district.name}
        </Badge>
      ))}
      {user.farmerGroups.map((f, i) => (
        <Badge key={i} variant="outline" className="text-xs font-normal py-0">
          {f.farmerGroup.abrv ?? f.farmerGroup.name}
        </Badge>
      ))}
    </div>
  );
}

export function UserListClient({ initialUsers, permissions }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [accessUser, setAccessUser] = useState<User | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const router = useRouter();
  const [, startTransition] = useTransition();

  const filtered = initialUsers.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && u.isActive) ||
      (statusFilter === "inactive" && !u.isActive);
    return matchSearch && matchStatus;
  });

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const paginatedData = filtered.slice(safePage * pageSize, (safePage + 1) * pageSize);

  async function handleToggleActive(id: string) {
    const result = await toggleUserActive(id);
    if (result.success) {
      toast.success("Status user diubah");
      router.refresh();
    } else {
      toast.error("Gagal mengubah status");
    }
  }

  const roleColor: Record<string, string> = {
    SUPERADMIN: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    ADMIN: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    OPERATOR: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    MANAGEMENT: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  };

  return (
    <>
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama atau email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="pl-9"
            />
          </div>
          <div className="flex gap-1">
            <Button
              variant={statusFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setStatusFilter("all");
                setPage(0);
              }}
            >
              Semua
            </Button>
            <Button
              variant={statusFilter === "active" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setStatusFilter("active");
                setPage(0);
              }}
            >
              Aktif
            </Button>
            <Button
              variant={statusFilter === "inactive" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setStatusFilter("inactive");
                setPage(0);
              }}
            >
              Nonaktif
            </Button>
          </div>
          {permissions.includes("CREATE") && (
            <Button onClick={() => { setEditUser(null); setShowForm(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah User
            </Button>
          )}
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-muted/70 border-b-2 border-border">
              <TableHead className="w-[1%] whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-muted-foreground">Aksi</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nama</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Role</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Akses Data</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="w-[1%] whitespace-nowrap">
                  <div className="flex items-center">
                    <TableActions
                      permissions={permissions}
                      actions={[
                        {
                          type: "edit",
                          onClick: () => {
                            setEditUser(user);
                            setShowForm(true);
                          },
                        },
                        {
                          type: "delete",
                          isActive: user.isActive,
                          onClick: () => handleToggleActive(user.id),
                        },
                      ]}
                    />
                    {permissions.includes("EDIT") && (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Akses Data"
                        onClick={() => setAccessUser(user)}
                      >
                        <Database className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm font-medium">{user.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className={roleColor[user.role] ?? ""}>
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <AccessSummaryCell user={user} />
                </TableCell>
                <TableCell>
                  <Badge variant={user.isActive ? "default" : "outline"}>
                    {user.isActive ? "Aktif" : "Nonaktif"}
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
          </TableBody>
        </Table>

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

      <UserFormModal
        key={editUser?.id ?? "new"}
        open={showForm}
        onClose={() => { setShowForm(false); setEditUser(null); }}
        user={editUser}
      />

      {accessUser && (
        <UserDataAccessModal
          open={!!accessUser}
          onClose={() => {
            setAccessUser(null);
            startTransition(() => router.refresh());
          }}
          onDataChange={() => startTransition(() => router.refresh())}
          userId={accessUser.id}
          userName={accessUser.name}
        />
      )}
    </>
  );
}
