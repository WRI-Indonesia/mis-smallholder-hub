"use client";

import React, { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  setRolePermissions,
  type RolePermissionUpdate,
} from "@/server/actions/role-permission";
import { toast } from "sonner";
import { ChevronRight, ChevronDown, Search, ListChecks } from "lucide-react";
import type { Role, PermissionLevel } from "@prisma/client";
import { ROLES } from "@/lib/roles";
import { buildMenuTree, collapsibleKeys, descendantKeys, flattenTree } from "@/lib/menu-tree";
import { useCollapseState } from "@/lib/use-collapse-state";

const PERMISSIONS: PermissionLevel[] = ["CREATE", "VIEW", "EDIT", "DELETE"];
const EDITABLE_ROLES = ROLES.filter((r) => r !== "SUPERADMIN");

interface Props {
  permissions: { id: string; role: string; menuKey: string; permission: string }[];
  menuItems: { key: string; title: string; parentKey: string | null }[];
}

const cellKey = (role: string, menuKey: string, perm: string) => `${role}|${menuKey}|${perm}`;

interface CascadeState {
  menuKey: string;
  title: string;
  target: boolean;
  baseUpdates: RolePermissionUpdate[];
  descendantUpdates: RolePermissionUpdate[];
  descendantCount: number;
}

export function RoleMatrixClient({ permissions, menuItems }: Props) {
  const [granted, setGranted] = useState<Set<string>>(
    () => new Set(permissions.map((p) => cellKey(p.role, p.menuKey, p.permission)))
  );
  // SUPERADMIN dikecualikan dari matriks — selalu akses penuh & tak dapat diubah.
  const [visibleRoles, setVisibleRoles] = useState<Set<Role>>(() => new Set(EDITABLE_ROLES));
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [cascade, setCascade] = useState<CascadeState | null>(null);

  const tree = useMemo(() => buildMenuTree(menuItems), [menuItems]);
  const allCollapsible = useMemo(() => collapsibleKeys(tree), [tree]);
  const { isCollapsed, toggle, openAll, closeAll } = useCollapseState("role-matrix:open");

  const term = search.trim().toLowerCase();
  const rows = useMemo(
    () =>
      flattenTree(tree, {
        isCollapsed,
        matches: term
          ? (m) => m.title.toLowerCase().includes(term) || m.key.toLowerCase().includes(term)
          : undefined,
      }),
    [tree, isCollapsed, term]
  );

  const shownRoles = EDITABLE_ROLES.filter((r) => visibleRoles.has(r));

  const has = (role: string, menuKey: string, perm: string) =>
    role === "SUPERADMIN" || granted.has(cellKey(role, menuKey, perm));

  // ─── Apply (optimistic + server) ──────────────────────────────────────────
  async function applyUpdates(updates: RolePermissionUpdate[]) {
    const real = updates.filter((u) => u.role !== "SUPERADMIN");
    if (real.length === 0) return;

    const prev = granted;
    const next = new Set(prev);
    for (const u of real) {
      const k = cellKey(u.role, u.menuKey, u.permission);
      if (u.granted) next.add(k);
      else next.delete(k);
    }
    setGranted(next);
    setSaving(true);
    const result = await setRolePermissions(real);
    setSaving(false);

    if (!result.success) {
      setGranted(prev); // revert
      toast.error(typeof result.error === "string" ? result.error : "Gagal menyimpan permission");
    }
  }

  function handleCellToggle(role: Role, menuKey: string, perm: PermissionLevel) {
    if (role === "SUPERADMIN") {
      toast.error("SUPERADMIN memiliki semua akses");
      return;
    }
    applyUpdates([{ role, menuKey, permission: perm, granted: !has(role, menuKey, perm) }]);
  }

  // Toggle satu baris penuh (semua izin × role tampil) untuk satu menu.
  function handleRowToggle(menuKey: string, title: string, hasChildren: boolean) {
    const editable = EDITABLE_ROLES.filter((r) => visibleRoles.has(r));
    if (editable.length === 0) {
      toast.error("Tidak ada role yang dapat diubah pada tampilan ini");
      return;
    }

    const allGranted = editable.every((role) =>
      PERMISSIONS.every((perm) => has(role, menuKey, perm))
    );
    const target = !allGranted;

    const buildFor = (mk: string): RolePermissionUpdate[] =>
      editable.flatMap((role) =>
        PERMISSIONS.map((perm) => ({ role, menuKey: mk, permission: perm, granted: target }))
      );

    const baseUpdates = buildFor(menuKey);

    if (hasChildren) {
      const desc = descendantKeys(tree, menuKey);
      setCascade({
        menuKey,
        title,
        target,
        baseUpdates,
        descendantUpdates: desc.flatMap(buildFor),
        descendantCount: desc.length,
      });
      return;
    }

    applyUpdates(baseUpdates);
  }

  function confirmCascade(includeDescendants: boolean) {
    if (!cascade) return;
    const updates = includeDescendants
      ? [...cascade.baseUpdates, ...cascade.descendantUpdates]
      : cascade.baseUpdates;
    setCascade(null);
    applyUpdates(updates);
  }

  function toggleRoleColumn(role: Role) {
    const next = new Set(visibleRoles);
    if (next.has(role)) {
      if (next.size === 1) return; // minimal satu role tampil
      next.delete(role);
    } else {
      next.add(role);
    }
    setVisibleRoles(next);
  }

  const allOpen = allCollapsible.length > 0 && allCollapsible.every((k) => !isCollapsed(k));

  return (
    <Card className="p-4 space-y-3">
      {/* Toolbar */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari menu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => (allOpen ? closeAll() : openAll(allCollapsible))}
              disabled={!!term}
              title={term ? "Nonaktif saat mencari" : undefined}
            >
              {allOpen ? "Tutup semua" : "Buka semua"}
            </Button>
          </div>
        </div>

        {/* Selektor role */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground mr-1">Tampilkan role:</span>
          {EDITABLE_ROLES.map((role) => {
            const active = visibleRoles.has(role);
            return (
              <button
                key={role}
                onClick={() => toggleRoleColumn(role)}
                className={`px-2 py-0.5 rounded-full text-xs font-medium border transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                }`}
              >
                {role}
              </button>
            );
          })}
          {visibleRoles.size < EDITABLE_ROLES.length && (
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setVisibleRoles(new Set(EDITABLE_ROLES))}>
              Semua
            </Button>
          )}
        </div>
      </div>

      {/* Matriks */}
      <div className="overflow-auto max-h-[70vh] rounded-md border border-border">
        <table className="w-full text-sm border-separate border-spacing-0">
          <thead>
            <tr>
              <th
                rowSpan={2}
                className="sticky left-0 top-0 z-30 h-9 bg-muted text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 border-b-2 border-r border-border min-w-[220px]"
              >
                Menu
              </th>
              {shownRoles.map((role) => (
                <th
                  key={role}
                  colSpan={PERMISSIONS.length}
                  className="sticky top-0 z-20 h-9 bg-muted text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 border-b border-l border-border"
                >
                  {role}
                </th>
              ))}
            </tr>
            <tr>
              {shownRoles.map((role) =>
                PERMISSIONS.map((perm, i) => (
                  <th
                    key={`${role}-${perm}`}
                    className={`sticky top-9 z-20 bg-muted text-center text-[10px] font-medium text-muted-foreground p-1 border-b-2 border-border ${
                      i === 0 ? "border-l border-border" : "border-l border-border/40"
                    }`}
                  >
                    {perm.charAt(0)}
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ item, depth, hasChildren }) => {
              const isParent = depth === 0;
              const rowBg = isParent ? "bg-muted/40" : depth === 1 ? "bg-background" : "bg-muted/10";
              return (
                <tr key={item.key} className="border-b border-border/40">
                  {/* Kolom Menu (sticky kiri) */}
                  <td
                    className={`sticky left-0 z-10 px-2 py-1 border-r border-border ${rowBg}`}
                    style={{ paddingLeft: 8 + depth * 18 }}
                  >
                    <div className="flex items-center gap-1">
                      {hasChildren ? (
                        <button
                          onClick={() => toggle(item.key)}
                          disabled={!!term}
                          className="p-0.5 rounded hover:bg-muted disabled:opacity-40"
                          title={isCollapsed(item.key) ? "Buka" : "Tutup"}
                        >
                          {isCollapsed(item.key) && !term ? (
                            <ChevronRight className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )}
                        </button>
                      ) : (
                        <span className="w-[18px] shrink-0" />
                      )}
                      <span className={isParent ? "font-semibold" : "text-muted-foreground"}>
                        {item.title}
                      </span>
                      <button
                        onClick={() => handleRowToggle(item.key, item.title, hasChildren)}
                        disabled={saving}
                        className="ml-1 p-0.5 rounded text-muted-foreground/60 hover:text-foreground hover:bg-muted disabled:opacity-40"
                        title="Toggle semua izin di baris ini"
                      >
                        <ListChecks className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>

                  {/* Sel izin */}
                  {shownRoles.map((role) =>
                    PERMISSIONS.map((perm, i) => {
                      const on = has(role, item.key, perm);
                      return (
                        <td
                          key={`${role}-${item.key}-${perm}`}
                          className={`text-center p-1 ${i === 0 ? "border-l border-border" : "border-l border-border/30"}`}
                        >
                          <button
                            onClick={() => handleCellToggle(role, item.key, perm)}
                            disabled={saving}
                            className="w-5 h-5 rounded-sm inline-flex items-center justify-center hover:bg-muted transition-colors disabled:cursor-not-allowed"
                          >
                            {on ? (
                              <span className="w-3 h-3 rounded-sm bg-primary" />
                            ) : (
                              <span className="w-3 h-3 rounded-sm border border-border" />
                            )}
                          </button>
                        </td>
                      );
                    })
                  )}
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={1 + shownRoles.length * PERMISSIONS.length} className="p-6 text-center text-sm text-muted-foreground">
                  Tidak ada menu yang cocok dengan pencarian.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-primary inline-block" /> Granted
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm border border-border inline-block" /> Denied
        </div>
        <div className="flex items-center gap-1">
          <ListChecks className="h-3.5 w-3.5" /> Toggle baris
        </div>
        <div className="ml-auto">C = Create · V = View · E = Edit · D = Delete · SUPERADMIN selalu akses penuh (tidak ditampilkan)</div>
      </div>

      {/* Dialog kaskade induk → anak */}
      <Dialog open={!!cascade} onOpenChange={(v) => !v && setCascade(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Terapkan ke sub-menu?</DialogTitle>
            <DialogDescription>
              {cascade?.target ? "Memberi" : "Mencabut"} seluruh izin pada{" "}
              <strong>{cascade?.title}</strong> untuk role yang tampil. Menu ini punya{" "}
              <strong>{cascade?.descendantCount}</strong> sub-menu — terapkan juga ke semuanya?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setCascade(null)}>
              Batal
            </Button>
            <Button variant="secondary" onClick={() => confirmCascade(false)}>
              Hanya menu ini
            </Button>
            <Button onClick={() => confirmCascade(true)}>Termasuk sub-menu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
