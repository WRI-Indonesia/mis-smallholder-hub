"use client";

import React, { useState } from "react";
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
import { Plus, Search, ChevronRight, ChevronDown } from "lucide-react";
import { MenuFormModal } from "./menu-form-modal";
import { deleteMenuItem } from "@/server/actions/menu";
import { toast } from "sonner";
import { ICON_MAP } from "@/lib/icon-map";
import { TableActions, DeleteDialog } from "@/components/shared";
import { buildMenuTree, collapsibleKeys, flattenTree } from "@/lib/menu-tree";
import { useCollapseState } from "@/lib/use-collapse-state";

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

export function MenuListClient({
  initialItems,
  permissions,
}: {
  initialItems: MenuItemData[];
  permissions: string[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<MenuItemData | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MenuItemData | null>(null);
  const [search, setSearch] = useState("");
  const router = useRouter();

  const tree = React.useMemo(() => buildMenuTree(initialItems), [initialItems]);
  const allCollapsible = React.useMemo(() => collapsibleKeys(tree), [tree]);
  const { isCollapsed, toggle, openAll, closeAll } = useCollapseState("menu-list:open");

  const getAllowedParentOptions = () => {
    const descendants = new Set<string>();
    if (editItem) {
      descendants.add(editItem.key);
      const addDescendants = (parentKey: string) => {
        initialItems.forEach((item) => {
          if (item.parentKey === parentKey) {
            descendants.add(item.key);
            addDescendants(item.key);
          }
        });
      };
      addDescendants(editItem.key);
    }

    const options: { key: string; title: string }[] = [];
    const lvl1 = initialItems.filter((i) => !i.parentKey && !descendants.has(i.key));
    lvl1.forEach((p) => {
      options.push({ key: p.key, title: p.title });
      const lvl2 = initialItems.filter((i) => i.parentKey === p.key && !descendants.has(i.key));
      lvl2.forEach((c) => {
        options.push({ key: c.key, title: `— ${c.title}` });
      });
    });
    return options;
  };

  async function handleDelete() {
    if (!deleteTarget) return;
    const result = await deleteMenuItem(deleteTarget.id);
    if (result.success) {
      toast.success("Menu item dinonaktifkan");
      setDeleteTarget(null);
      router.refresh();
    } else {
      toast.error(typeof result.error === "string" ? result.error : "Gagal menonaktifkan menu item");
    }
  }

  function renderIcon(name: string | null) {
    if (!name) return null;
    const Icon = ICON_MAP[name];
    return Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : null;
  }

  function rowActions(item: MenuItemData) {
    return (
      <TableActions
        permissions={permissions}
        actions={[
          {
            type: "edit",
            onClick: () => {
              setEditItem(item);
              setShowForm(true);
            },
          },
          {
            type: "delete",
            isActive: item.isActive,
            onClick: () => setDeleteTarget(item),
          },
        ]}
      />
    );
  }

  const term = search.trim().toLowerCase();
  const rows = flattenTree(tree, {
    isCollapsed,
    matches: term
      ? (m) => m.title.toLowerCase().includes(term) || m.key.toLowerCase().includes(term)
      : undefined,
  });
  const allOpen = allCollapsible.length > 0 && allCollapsible.every((k) => !isCollapsed(k));

  return (
    <>
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari menu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => (allOpen ? closeAll() : openAll(allCollapsible))}
            disabled={!!term}
            title={term ? "Nonaktif saat mencari" : undefined}
          >
            {allOpen ? "Tutup semua" : "Buka semua"}
          </Button>
          {permissions.includes("CREATE") && (
            <Button onClick={() => { setEditItem(null); setShowForm(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Menu
            </Button>
          )}
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-muted/70 border-b-2 border-border">
              <TableHead className="w-[1%] whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-muted-foreground">Aksi</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Menu</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Key</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">URL</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">Order</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ item, depth, hasChildren }) => (
              <TableRow key={item.id} className={depth === 0 ? "bg-muted/30" : undefined}>
                <TableCell className="w-[1%] whitespace-nowrap">{rowActions(item)}</TableCell>
                <TableCell className={depth === 0 ? "text-sm font-bold" : "text-sm font-normal"}>
                  <div className="flex items-center gap-2" style={{ paddingLeft: depth * 20 }}>
                    {hasChildren ? (
                      <button
                        onClick={() => toggle(item.key)}
                        disabled={!!term}
                        className="p-0.5 rounded hover:bg-muted disabled:opacity-40"
                        title={isCollapsed(item.key) ? "Buka" : "Tutup"}
                      >
                        {isCollapsed(item.key) && !term ? (
                          <ChevronRight className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    ) : (
                      <span className="w-5 shrink-0" />
                    )}
                    {renderIcon(item.icon)}
                    <span className={depth >= 1 ? "text-muted-foreground" : undefined}>{item.title}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm font-mono text-muted-foreground">{item.key}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{item.url}</TableCell>
                <TableCell className="text-sm tabular-nums text-center">{item.order}</TableCell>
                <TableCell>
                  <Badge variant={item.isActive ? "default" : "outline"}>
                    {item.isActive ? "Aktif" : "Nonaktif"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">
                  Tidak ada menu yang cocok dengan pencarian.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <MenuFormModal
        key={editItem?.id ?? "new"}
        open={showForm}
        onClose={() => { setShowForm(false); setEditItem(null); }}
        item={editItem}
        parentOptions={getAllowedParentOptions()}
      />

      <DeleteDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Nonaktifkan Menu"
        description="Menu item akan dinonaktifkan (soft delete) dan tidak lagi muncul di navigasi. Lanjutkan?"
      />
    </>
  );
}
