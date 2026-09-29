"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateMenuItem } from "@/server/actions/menu";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { renderIcon } from "@/lib/icon-map";

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
  /** Judul menu induk (bila ada) — ditampilkan, bukan dipilih. */
  parentTitle: string | null;
}

/**
 * Edit menu = hanya Aktif & Visible (#364). Struktur (judul, urutan, induk, URL,
 * ikon) ditampilkan baca-saja: sumbernya `menu.csv`, dan seed rilis menimpanya.
 */
export function MenuFormModal({ open, onClose, item, parentTitle }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  if (!item) return null;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!item) return; // penyempit tipe untuk closure; runtime sudah dijamin return di atas
    setIsLoading(true);

    const form = new FormData(e.currentTarget);
    let result: Awaited<ReturnType<typeof updateMenuItem>>;
    try {
      result = await updateMenuItem({
        id: item.id,
        isActive: form.get("isActive") === "on",
        isVisible: form.get("isVisible") === "on",
      });
    } catch {
      result = { success: false, error: "Gagal menyimpan menu" };
    } finally {
      setIsLoading(false);
    }

    if (!result.success) {
      toast.error(typeof result.error === "string" ? result.error : "Gagal menyimpan menu");
      return;
    }

    toast.success("Menu berhasil diupdate");
    onClose();
    router.refresh();
  }

  const details: [string, React.ReactNode][] = [
    ["Key", <span key="k" className="font-mono">{item.key}</span>],
    ["Title", item.title],
    ["URL", <span key="u" className="font-mono">{item.url}</span>],
    ["Parent", parentTitle ?? "— Tidak ada (root) —"],
    ["Order", item.order],
    ["Icon", item.icon ? <span key="i" className="inline-flex items-center gap-1.5">{renderIcon(item.icon, "h-4 w-4")} {item.icon}</span> : "—"],
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Edit Menu</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <dl className="grid grid-cols-[6rem_1fr] gap-x-3 gap-y-1.5 text-sm">
            {details.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="min-w-0 break-words">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-muted-foreground">
            Judul, urutan, induk, URL, dan ikon hanya bisa diubah lewat <code>menu.csv</code> + seed, agar menu di
            produksi selalu sama dengan repo.
          </p>

          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <Switch id="isActive" name="isActive" defaultChecked={item.isActive} />
              <Label htmlFor="isActive">Aktif</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="isVisible" name="isVisible" defaultChecked={item.isVisible} />
              <Label htmlFor="isVisible">Visible</Label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
