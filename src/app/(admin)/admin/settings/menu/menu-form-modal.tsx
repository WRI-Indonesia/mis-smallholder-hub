"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { createMenuItem, updateMenuItem } from "@/server/actions/menu";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { ICON_LIST } from "@/lib/icon-map";

interface MenuItemData {
  id: string;
  key: string;
  parentKey: string | null;
  title: string;
  url: string;
  icon: string | null;
  order: number;
  isActive: boolean;
  isVisible: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  item: MenuItemData | null;
  parentOptions: { key: string; title: string }[];
}

export function MenuFormModal({ open, onClose, item, parentOptions }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const router = useRouter();
  const isEdit = !!item;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    const form = new FormData(e.currentTarget);
    const parentKey = form.get("parentKey") as string;

    const data = {
      key: isEdit ? item.key : (form.get("key") as string),
      parentKey: parentKey === "none" ? null : parentKey || null,
      title: form.get("title") as string,
      url: form.get("url") as string,
      icon: (form.get("icon") as string) || null,
      order: parseInt(form.get("order") as string, 10) || 0,
      isActive: form.get("isActive") === "on",
      isVisible: form.get("isVisible") === "on",
    };

    const result = isEdit
      ? await updateMenuItem({ id: item.id, ...data })
      : await createMenuItem(data);

    setIsLoading(false);

    if (!result.success) {
      setErrors((result.error as Record<string, string[]>) ?? {});
      return;
    }

    toast.success(isEdit ? "Menu berhasil diupdate" : "Menu berhasil dibuat");
    onClose();
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Menu" : "Tambah Menu"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="key">Key</Label>
              <Input id="key" name="key" defaultValue={item?.key ?? ""} disabled={isEdit} required />
              {errors.key && <p className="text-sm text-destructive">{errors.key[0]}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="order">Order</Label>
              <Input id="order" name="order" type="number" defaultValue={item?.order ?? 0} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" defaultValue={item?.title ?? ""} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">URL</Label>
            <Input id="url" name="url" defaultValue={item?.url ?? ""} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="parentKey">Parent</Label>
              <Select name="parentKey" defaultValue={item?.parentKey ?? "none"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Tidak ada (root) —</SelectItem>
                  {parentOptions.map((p) => (
                    <SelectItem key={p.key} value={p.key}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="icon">Icon</Label>
              <Select name="icon" defaultValue={item?.icon ?? ""}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih icon" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="">— Tanpa icon —</SelectItem>
                  {ICON_LIST.map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <Switch id="isActive" name="isActive" defaultChecked={item?.isActive ?? true} />
              <Label htmlFor="isActive">Aktif</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="isVisible" name="isVisible" defaultChecked={item?.isVisible ?? true} />
              <Label htmlFor="isVisible">Visible</Label>
            </div>
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
