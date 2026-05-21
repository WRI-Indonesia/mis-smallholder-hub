"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createUser, updateUser } from "@/server/actions/user";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  user: User | null;
}

const ROLES = ["SUPERADMIN", "ADMIN", "OPERATOR", "MANAGEMENT"] as const;

export function UserFormModal({ open, onClose, user }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const router = useRouter();
  const isEdit = !!user;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    const form = new FormData(e.currentTarget);

    if (isEdit) {
      const result = await updateUser({
        id: user.id,
        name: form.get("name") as string,
        email: form.get("email") as string,
        role: form.get("role") as "SUPERADMIN" | "ADMIN" | "OPERATOR" | "MANAGEMENT",
        password: (form.get("password") as string) || "",
      });

      setIsLoading(false);
      if (!result.success) {
        setErrors(result.error as Record<string, string[]>);
        return;
      }
      toast.success("User berhasil diupdate");
    } else {
      const result = await createUser({
        name: form.get("name") as string,
        email: form.get("email") as string,
        role: form.get("role") as "SUPERADMIN" | "ADMIN" | "OPERATOR" | "MANAGEMENT",
        password: form.get("password") as string,
      });

      setIsLoading(false);
      if (!result.success) {
        setErrors(result.error as Record<string, string[]>);
        return;
      }
      toast.success("User berhasil dibuat");
    }

    onClose();
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit User" : "Tambah User"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nama</Label>
            <Input id="name" name="name" defaultValue={user?.name ?? ""} required />
            {errors.name && <p className="text-sm text-destructive">{errors.name[0]}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={user?.email ?? ""} required />
            {errors.email && <p className="text-sm text-destructive">{errors.email[0]}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select name="role" defaultValue={user?.role ?? "OPERATOR"}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((role) => (
                  <SelectItem key={role} value={role}>{role}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              Password {isEdit && <span className="text-muted-foreground text-xs">(kosongkan jika tidak diubah)</span>}
            </Label>
            <Input id="password" name="password" type="password" required={!isEdit} />
            {errors.password && <p className="text-sm text-destructive">{errors.password[0]}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Simpan" : "Buat"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
