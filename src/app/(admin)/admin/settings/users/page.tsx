import { getUsers } from "@/server/actions/user";
import { HelpHint } from "@/app/(admin)/admin/help/help-hint";
import { UserListClient } from "./user-list-client";
import { requirePermission, getUserPermissionsForMenu, isSuperAdmin } from "@/lib/rbac";
import { auth } from "@/lib/auth";
import { getAccessContext } from "@/lib/access-context";
import { userAdminScopeError } from "@/lib/user-admin-guard";

export default async function UsersPage() {
  await requirePermission("settings-users");
  // Akun ber-wilayah (#386) ditolak `getUsers` — tampilkan alasannya, bukan halaman galat
  // (review pra-rilis v1.7.0: VIEW settings-users lewat matriks/override + UserDistrict).
  const scopeError = userAdminScopeError(await getAccessContext());
  if (scopeError) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">User Management</h1>
          <HelpHint menuKey="settings-users" />
        </div>
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          <p className="font-medium">{scopeError}.</p>
          <p className="mt-1 text-muted-foreground">
            Akun Anda dibatasi ke distrik atau Lembaga tertentu, sehingga tidak dapat mengelola akun pengguna lain. Minta SUPERADMIN untuk perubahan akun.
          </p>
        </div>
      </div>
    );
  }
  const [users, permissions, superAdmin, session] = await Promise.all([
    getUsers(),
    getUserPermissionsForMenu("settings-users"),
    isSuperAdmin(),
    auth(),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">User Management</h1>
          <HelpHint menuKey="settings-users" />
        </div>
        <p className="text-muted-foreground">Kelola akun pengguna sistem</p>
      </div>
      <UserListClient initialUsers={users} permissions={permissions} currentUserId={session?.user?.id ?? null} isSuperAdmin={superAdmin} />
    </div>
  );
}
