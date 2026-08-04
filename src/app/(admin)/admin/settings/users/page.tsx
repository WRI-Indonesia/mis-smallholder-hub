import { getUsers } from "@/server/actions/user";
import { HelpHint } from "@/app/(admin)/admin/help/help-hint";
import { UserListClient } from "./user-list-client";
import { requirePermission, getUserPermissionsForMenu } from "@/lib/rbac";

export default async function UsersPage() {
  await requirePermission("settings-users");
  const [users, permissions] = await Promise.all([
    getUsers(),
    getUserPermissionsForMenu("settings-users"),
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
      <UserListClient initialUsers={users} permissions={permissions} />
    </div>
  );
}
