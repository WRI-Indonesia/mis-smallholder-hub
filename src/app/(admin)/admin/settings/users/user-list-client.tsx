"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Plus, Database, Shield } from "lucide-react";
import { UserFormModal } from "./user-form-modal";
import { UserDataAccessModal } from "./user-data-access-modal";
import { UserMenuAccessModal } from "./user-menu-access-modal";
import { toggleUserActive } from "@/server/actions/user";
import { toast } from "sonner";
import { TableActions, DataTable, type DataTableColumn } from "@/components/shared";
import { ROLE_BADGE_CLASS } from "@/lib/roles";

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
  permissionOverrides: { id: string; granted: boolean }[];
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
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [accessUser, setAccessUser] = useState<User | null>(null);
  const [menuAccessUser, setMenuAccessUser] = useState<User | null>(null);
  const router = useRouter();
  const [, startTransition] = useTransition();

  const filtered = initialUsers.filter((u) => {
    if (statusFilter === "active") return u.isActive;
    if (statusFilter === "inactive") return !u.isActive;
    return true;
  });

  async function handleToggleActive(id: string) {
    const result = await toggleUserActive(id);
    if (result.success) {
      toast.success("Status user diubah");
      router.refresh();
    } else {
      toast.error("Gagal mengubah status");
    }
  }

  const roleColor: Record<string, string> = ROLE_BADGE_CLASS;

  const columns: DataTableColumn<User>[] = [
    {
      key: "name",
      label: "Nama",
      sortable: true,
      cellClassName: "text-sm font-medium",
    },
    {
      key: "email",
      label: "Email",
      sortable: true,
      cellClassName: "text-sm text-muted-foreground",
    },
    {
      key: "role",
      label: "Role",
      sortable: true,
      render: (row) => (
        <Badge variant="secondary" className={roleColor[row.role] ?? ""}>
          {row.role}
        </Badge>
      ),
    },
    {
      key: "provinces",
      label: "Akses Data",
      sortable: false,
      render: (row) => <AccessSummaryCell user={row} />,
    },
    {
      key: "permissionOverrides",
      label: "Akses Menu",
      sortable: false,
      render: (row) =>
        row.permissionOverrides.length > 0 ? (
          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800 dark:bg-amber-950/20 dark:text-amber-300 font-normal">
            {row.permissionOverrides.length} Override
          </Badge>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        ),
    },
    {
      key: "isActive",
      label: "Status",
      sortable: true,
      render: (row) => (
        <Badge variant={row.isActive ? "default" : "outline"}>
          {row.isActive ? "Aktif" : "Nonaktif"}
        </Badge>
      ),
    },
  ];

  const getExportRow = (user: User) => {
    const provs = user.provinces.map((p) => p.province.name).join(", ");
    const dists = user.districts.map((d) => d.district.name).join(", ");
    const grps = user.farmerGroups.map((f) => f.farmerGroup.abrv ?? f.farmerGroup.name).join(", ");
    const accessSummary = [provs, dists, grps].filter(Boolean).join("; ") || "—";

    return {
      name: user.name,
      email: user.email,
      role: user.role,
      provinces: accessSummary,
      permissionOverrides: user.permissionOverrides.length > 0 ? `${user.permissionOverrides.length} Override` : "—",
      isActive: user.isActive ? "Aktif" : "Nonaktif",
    };
  };

  const toolbarLeft = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex gap-1">
        <Button
          variant={statusFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("all")}
        >
          Semua
        </Button>
        <Button
          variant={statusFilter === "active" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("active")}
        >
          Aktif
        </Button>
        <Button
          variant={statusFilter === "inactive" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("inactive")}
        >
          Nonaktif
        </Button>
      </div>
    </div>
  );

  const toolbarRight = permissions.includes("CREATE") ? (
    <Button size="sm" onClick={() => { setEditUser(null); setShowForm(true); }} className="h-9">
      <Plus className="h-4 w-4 mr-2" />
      Tambah User
    </Button>
  ) : undefined;

  return (
    <>
      <Card className="p-4">
        <DataTable
          columns={columns}
          data={filtered}
          rowKey={(u) => u.id}
          searchPlaceholder="Cari nama atau email..."
          searchKeys={["name", "email"]}
          toolbarLeft={toolbarLeft}
          toolbarRight={toolbarRight}
          exportFilename="data-users"
          getExportRow={getExportRow}
          renderActions={(user) => (
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
              {permissions.includes("EDIT") && user.role !== "SUPERADMIN" && (
                <Button
                  variant="ghost"
                  size="icon"
                  title="Hak Akses Menu"
                  onClick={() => setMenuAccessUser(user)}
                >
                  <Shield className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        />
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

      {menuAccessUser && (
        <UserMenuAccessModal
          open={!!menuAccessUser}
          onClose={() => {
            setMenuAccessUser(null);
            startTransition(() => router.refresh());
          }}
          onDataChange={() => startTransition(() => router.refresh())}
          userId={menuAccessUser.id}
          userName={menuAccessUser.name}
          userRole={menuAccessUser.role}
        />
      )}
    </>
  );
}
