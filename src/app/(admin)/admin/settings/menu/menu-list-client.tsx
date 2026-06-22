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
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { MenuFormModal } from "./menu-form-modal";
import { deleteMenuItem } from "@/server/actions/menu";
import { toast } from "sonner";
import { ICON_MAP } from "@/lib/icon-map";

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

export function MenuListClient({ initialItems }: { initialItems: MenuItemData[] }) {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<MenuItemData | null>(null);
  const router = useRouter();
 
  const parents = initialItems.filter((i) => !i.parentKey);
  const getChildren = (key: string) => initialItems.filter((i) => i.parentKey === key);
 
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
 
  async function handleDelete(id: string) {
    if (!confirm("Nonaktifkan menu item ini?")) return;
    const result = await deleteMenuItem(id);
    if (result.success) {
      toast.success("Menu item dinonaktifkan");
      router.refresh();
    }
  }
 
  function renderIcon(name: string | null) {
    if (!name) return null;
    const Icon = ICON_MAP[name];
    return Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : null;
  }
 
  const [search, setSearch] = useState("");
 
  const filteredParents = parents.filter((p) => {
    const children = getChildren(p.key);
    const matchSelf = p.title.toLowerCase().includes(search.toLowerCase()) || p.key.includes(search.toLowerCase());
    const matchChild = children.some((c) => {
      const grandchildren = getChildren(c.key);
      const matchC = c.title.toLowerCase().includes(search.toLowerCase()) || c.key.includes(search.toLowerCase());
      const matchGc = grandchildren.some((gc) => gc.title.toLowerCase().includes(search.toLowerCase()) || gc.key.includes(search.toLowerCase()));
      return matchC || matchGc;
    });
    return matchSelf || matchChild;
  });
 
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
          <Button onClick={() => { setEditItem(null); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Tambah Menu
          </Button>
        </div>
 
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/70 border-b-2 border-border">
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Menu</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Key</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">URL</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">Order</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredParents.map((parent) => (
              <React.Fragment key={parent.id}>
                <TableRow className="bg-muted/30">
                  <TableCell className="text-sm font-bold">
                    <div className="flex items-center gap-2">
                      {renderIcon(parent.icon)}
                      {parent.title}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-mono text-muted-foreground">{parent.key}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{parent.url}</TableCell>
                  <TableCell className="text-sm tabular-nums text-center">{parent.order}</TableCell>
                  <TableCell>
                    <Badge variant={parent.isActive ? "default" : "outline"}>
                      {parent.isActive ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </TableCell>
                  <TableCell className="space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => { setEditItem(parent); setShowForm(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(parent.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
                {getChildren(parent.key).map((child) => (
                  <React.Fragment key={child.id}>
                    <TableRow>
                      <TableCell className="text-sm font-normal pl-8">
                        <div className="flex items-center gap-2">
                          — {renderIcon(child.icon)}
                          {child.title}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-mono text-muted-foreground">{child.key}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{child.url}</TableCell>
                      <TableCell className="text-sm tabular-nums text-center">{child.order}</TableCell>
                      <TableCell>
                        <Badge variant={child.isActive ? "default" : "outline"}>
                          {child.isActive ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </TableCell>
                      <TableCell className="space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => { setEditItem(child); setShowForm(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(child.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    {getChildren(child.key).map((gchild) => (
                      <TableRow key={gchild.id}>
                        <TableCell className="text-sm font-normal text-muted-foreground pl-14">
                          <div className="flex items-center gap-2">
                            —— {renderIcon(gchild.icon)}
                            {gchild.title}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-mono text-muted-foreground">{gchild.key}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{gchild.url}</TableCell>
                        <TableCell className="text-sm tabular-nums text-center">{gchild.order}</TableCell>
                        <TableCell>
                          <Badge variant={gchild.isActive ? "default" : "outline"}>
                            {gchild.isActive ? "Aktif" : "Nonaktif"}
                          </Badge>
                        </TableCell>
                        <TableCell className="space-x-1">
                          <Button variant="ghost" size="icon" onClick={() => { setEditItem(gchild); setShowForm(true); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(gchild.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))}
              </React.Fragment>
            ))}
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
    </>
  );
}

