import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ChangePasswordForm } from "./change-password-form";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-muted-foreground">Informasi akun Anda</p>
      </div>

      <div className="rounded-lg border p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nama</p>
            <p className="text-sm font-medium mt-1">{session.user.name}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</p>
            <p className="text-sm font-medium mt-1">{session.user.email}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Role</p>
            <p className="text-sm font-medium mt-1">{session.user.role}</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">Ganti Password</h2>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
