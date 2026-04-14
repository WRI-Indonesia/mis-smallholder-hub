import { getUsers } from "@/server/actions/user";
import { UserListClient } from "./user-list-client";

export const metadata = {
  title: "Manajemen Pengguna",
};

export default async function UsersPage() {
  const result = await getUsers();
  const users = result.success ? result.data : [];

  return (
    <div className="p-6">
      <UserListClient initialUsers={users || []} />
    </div>
  );
}
