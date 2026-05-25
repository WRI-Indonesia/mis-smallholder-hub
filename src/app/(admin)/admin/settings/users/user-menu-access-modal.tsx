"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Search, Check, X, Shield, ShieldAlert, CornerDownRight } from "lucide-react";
import { toast } from "sonner";
import {
  getUserEffectivePermissions,
  getMenuItemsForSelect,
  setUserMenuOverride,
  removeUserMenuOverride,
} from "@/server/actions/user-menu-access";
import type { PermissionLevel } from "@prisma/client";

interface Props {
  open: boolean;
  onClose: () => void;
  onDataChange?: () => void;
  userId: string;
  userName: string;
  userRole: string;
}

type MenuItem = Awaited<ReturnType<typeof getMenuItemsForSelect>>[number];
type EffectiveData = Awaited<ReturnType<typeof getUserEffectivePermissions>>;

export function UserMenuAccessModal({
  open,
  onClose,
  onDataChange,
  userId,
  userName,
  userRole,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [savingCell, setSavingCell] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [effectiveData, setEffectiveData] = useState<EffectiveData | null>(null);
  const [search, setSearch] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [items, eff] = await Promise.all([
        getMenuItemsForSelect(),
        getUserEffectivePermissions(userId),
      ]);
      setMenuItems(items);
      setEffectiveData(eff);
    } catch (error) {
      toast.error("Gagal memuat data izin menu");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (open) {
      setSearch("");
      loadData();
    }
  }, [open, loadData]);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  // Check if a menu item has children
  const hasChildren = (key: string) => menuItems.some((item) => item.parentKey === key);

  // Group menu items into structured tree list
  const getTreeItems = () => {
    const parents = menuItems.filter((item) => !item.parentKey);
    const tree: MenuItem[] = [];
    parents.forEach((parent) => {
      tree.push(parent);
      const children = menuItems.filter((child) => child.parentKey === parent.key);
      tree.push(...children);
    });
    return tree;
  };

  // Filter items based on search query, keeping parent-child structure
  const getFilteredTreeItems = () => {
    const tree = getTreeItems();
    if (!search) return tree;

    const query = search.toLowerCase();
    
    // Find all item keys that match search or whose parent/child matches
    const matchedKeys = new Set<string>();

    menuItems.forEach((item) => {
      const selfMatch = item.title.toLowerCase().includes(query);
      if (selfMatch) {
        matchedKeys.add(item.key);
        if (item.parentKey) {
          matchedKeys.add(item.parentKey);
        }
      }
    });

    // Keep items in the tree that are in matchedKeys
    return tree.filter((item) => matchedKeys.has(item.key));
  };

  const filteredTree = getFilteredTreeItems();

  const handleToggleCell = async (
    menuKey: string,
    permission: PermissionLevel,
    isRoleDefault: boolean,
    hasOverride: boolean,
    overrideGranted?: boolean
  ) => {
    const cellId = `${menuKey}-${permission}`;
    setSavingCell(cellId);

    try {
      let result;
      if (hasOverride) {
        // Klik on override: delete override (return to default)
        result = await removeUserMenuOverride(userId, menuKey, permission);
      } else {
        // Klik on default: create override with inverse value
        const nextGrantedValue = !isRoleDefault;
        result = await setUserMenuOverride(userId, menuKey, permission, nextGrantedValue);
      }

      if (result.success) {
        onDataChange?.();
        // Refresh local data
        const nextEff = await getUserEffectivePermissions(userId);
        setEffectiveData(nextEff);
      } else {
        toast.error(result.error || "Gagal mengubah akses");
      }
    } catch {
      toast.error("Gagal mengubah akses");
    } finally {
      setSavingCell(null);
    }
  };

  // ─── Render Cell Component ────────────────────────────────────────────────
  const renderCell = (item: MenuItem, permission: PermissionLevel) => {
    if (!effectiveData) return null;

    const isRoleDefault = effectiveData.rolePermissions.some(
      (rp) => rp.menuKey === item.key && rp.permission === permission
    );
    const override = effectiveData.overrides.find(
      (o) => o.menuKey === item.key && o.permission === permission
    );

    const cellId = `${item.key}-${permission}`;
    const isSaving = savingCell === cellId;

    if (isSaving) {
      return (
        <div className="flex items-center justify-center h-5 w-5 mx-auto">
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (override) {
      if (override.granted) {
        // Override granted (green check)
        return (
          <button
            type="button"
            title="Override: Diberikan (Klik untuk hapus override)"
            onClick={() => handleToggleCell(item.key, permission, isRoleDefault, true, true)}
            className="h-5 w-5 rounded flex items-center justify-center bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm border border-transparent transition-all cursor-pointer mx-auto"
          >
            <Check className="h-3.5 w-3.5 stroke-[3]" />
          </button>
        );
      } else {
        // Override revoked (red X)
        return (
          <button
            type="button"
            title="Override: Dicabut (Klik untuk hapus override)"
            onClick={() => handleToggleCell(item.key, permission, isRoleDefault, true, false)}
            className="h-5 w-5 rounded flex items-center justify-center bg-rose-500 hover:bg-rose-600 text-white shadow-sm border border-transparent transition-all cursor-pointer mx-auto"
          >
            <X className="h-3.5 w-3.5 stroke-[3]" />
          </button>
        );
      }
    }

    if (isRoleDefault) {
      // Role default granted (solid dark block with dot, border-transparent to match size)
      return (
        <button
          type="button"
          title="Default Role: Diberikan (Klik untuk cabut)"
          onClick={() => handleToggleCell(item.key, permission, true, false)}
          className="h-5 w-5 rounded flex items-center justify-center bg-primary hover:bg-primary/95 text-primary-foreground border border-transparent transition-all cursor-pointer mx-auto"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
        </button>
      );
    }

    // Role default denied (empty checkbox with border-input)
    return (
      <button
        type="button"
        title="Default Role: Ditolak (Klik untuk berikan)"
        onClick={() => handleToggleCell(item.key, permission, false, false)}
        className="h-5 w-5 rounded border border-input bg-transparent hover:bg-accent hover:text-accent-foreground transition-all cursor-pointer mx-auto"
      />
    );
  };

  const getRowStatusBadge = (item: MenuItem) => {
    if (!effectiveData) return null;

    const rowOverrides = effectiveData.overrides.filter((o) => o.menuKey === item.key);
    if (rowOverrides.length === 0) {
      return <Badge variant="outline" className="text-[10px] font-normal uppercase text-muted-foreground px-1 py-0 h-4">role</Badge>;
    }

    const hasRevoke = rowOverrides.some((o) => !o.granted);
    if (hasRevoke) {
      return <Badge variant="default" className="text-[10px] font-medium uppercase bg-rose-100 hover:bg-rose-100 text-rose-800 border-rose-200 px-1 py-0 h-4 dark:bg-rose-900/30 dark:text-rose-300">revoked</Badge>;
    }

    return <Badge variant="default" className="text-[10px] font-medium uppercase bg-emerald-100 hover:bg-emerald-100 text-emerald-800 border-emerald-200 px-1 py-0 h-4 dark:bg-emerald-900/30 dark:text-emerald-300">granted</Badge>;
  };

  const overrideCount = effectiveData?.overrides.length ?? 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[620px] max-h-[85vh] flex flex-col p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <DialogTitle className="text-lg font-bold leading-none">Hak Akses Menu — {userName}</DialogTitle>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Role: <span className="font-semibold">{userRole}</span>
          </p>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-20 flex-1">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex flex-col gap-4 overflow-hidden flex-1">
            {/* Visual Summary */}
            <div className="rounded-md border bg-muted/40 p-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Status Override
                </p>
                <p className="text-sm font-medium mt-0.5">
                  {overrideCount === 0
                    ? "Tidak ada override (mengikuti default role)"
                    : `${overrideCount} override aktif dari default role`}
                </p>
              </div>
              {overrideCount > 0 && <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0" />}
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari menu..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>

            {/* Main Access Matrix Table */}
            <div className="border rounded-md overflow-y-auto flex-1 bg-card">
              <Table>
                <TableHeader className="sticky top-0 bg-muted/90 backdrop-blur-sm z-10">
                  <TableRow className="hover:bg-transparent border-b">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground py-2.5">Menu</TableHead>
                    <TableHead className="w-[12%] text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground py-2.5">C</TableHead>
                    <TableHead className="w-[12%] text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground py-2.5">V</TableHead>
                    <TableHead className="w-[12%] text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground py-2.5">E</TableHead>
                    <TableHead className="w-[12%] text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground py-2.5">D</TableHead>
                    <TableHead className="w-[18%] text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground py-2.5">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTree.map((item) => {
                    const isParent = !item.parentKey;
                    const hasSub = hasChildren(item.key);

                    return (
                      <TableRow key={item.key} className="border-b hover:bg-muted/30">
                        <TableCell className="py-2 font-medium">
                          {isParent ? (
                            <span className="text-sm text-foreground">{item.title}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground pl-4 flex items-center gap-1.5 font-normal">
                              <CornerDownRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                              {item.title}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center py-2">
                          {!hasSub ? renderCell(item, "CREATE") : null}
                        </TableCell>
                        <TableCell className="text-center py-2">
                          {!hasSub ? renderCell(item, "VIEW") : null}
                        </TableCell>
                        <TableCell className="text-center py-2">
                          {!hasSub ? renderCell(item, "EDIT") : null}
                        </TableCell>
                        <TableCell className="text-center py-2">
                          {!hasSub ? renderCell(item, "DELETE") : null}
                        </TableCell>
                        <TableCell className="text-center py-2">
                          {!hasSub ? getRowStatusBadge(item) : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredTree.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">
                        Tidak ada menu ditemukan
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Legend / Info footer */}
            <div className="text-[11px] text-muted-foreground space-y-1.5 border-t pt-3 mt-1 px-1">
              <p className="font-semibold text-foreground uppercase tracking-wider">Keterangan:</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded flex items-center justify-center bg-primary text-primary-foreground text-[8px]">
                    <span className="h-1 w-1 rounded-full bg-current" />
                  </span>
                  <span>Role default (diberikan)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded flex items-center justify-center bg-emerald-500 text-white shadow-sm">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-medium">Override: diberikan (hijau)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded border bg-transparent" />
                  <span>Role default (ditolak)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded flex items-center justify-center bg-rose-500 text-white shadow-sm">
                    <X className="h-3 w-3 stroke-[3]" />
                  </span>
                  <span className="text-rose-700 dark:text-rose-400 font-medium">Override: dicabut (merah)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-3 border-t mt-4 gap-2">
          <Button variant="outline" onClick={onClose}>Tutup</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
