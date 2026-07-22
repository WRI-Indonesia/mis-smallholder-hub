"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { toggleRolePermission } from "@/server/actions/role-permission";
import { toast } from "sonner";
import type { Role, PermissionLevel } from "@prisma/client";
import { ROLES } from "@/lib/roles";

const PERMISSIONS: PermissionLevel[] = ["CREATE", "VIEW", "EDIT", "DELETE"];

interface Props {
  permissions: { id: string; role: string; menuKey: string; permission: string }[];
  menuItems: { key: string; title: string; parentKey: string | null }[];
}

export function RoleMatrixClient({ permissions, menuItems }: Props) {
  const router = useRouter();

  function hasPermission(role: string, menuKey: string, permission: string) {
    return permissions.some(
      (p) => p.role === role && p.menuKey === menuKey && p.permission === permission
    );
  }

  async function handleToggle(role: Role, menuKey: string, permission: PermissionLevel) {
    if (role === "SUPERADMIN") {
      toast.error("SUPERADMIN memiliki semua akses");
      return;
    }

    const result = await toggleRolePermission(role, menuKey, permission);
    if (result.success) {
      toast.success(result.data?.granted ? "Permission ditambahkan" : "Permission dicabut");
      router.refresh();
    }
  }

  const parents = menuItems.filter((m) => !m.parentKey);
  const getChildren = (key: string) => menuItems.filter((m) => m.parentKey === key);

  return (
    <Card className="p-4 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-border bg-muted/70">
            <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground p-2">Menu</th>
            {ROLES.map((role) => (
              <th key={role} colSpan={PERMISSIONS.length} className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground p-2 border-l border-border">
                {role}
              </th>
            ))}
          </tr>
          <tr className="border-b border-border">
            <th />
            {ROLES.map((role) =>
              PERMISSIONS.map((perm) => (
                <th key={`${role}-${perm}`} className="text-center text-[10px] font-medium text-muted-foreground p-1 border-l border-border/50">
                  {perm.charAt(0)}
                </th>
              ))
            )}
          </tr>
        </thead>
        <tbody>
          {parents.map((parent) => (
            <React.Fragment key={parent.key}>
              <tr className="bg-muted/30 border-b border-border/50">
                <td className="p-2 font-medium">{parent.title}</td>
                {ROLES.map((role) =>
                  PERMISSIONS.map((perm) => (
                    <td key={`${role}-${parent.key}-${perm}`} className="text-center p-1 border-l border-border/30">
                      <button
                        onClick={() => handleToggle(role, parent.key, perm)}
                        className="w-5 h-5 rounded-sm inline-flex items-center justify-center hover:bg-muted transition-colors"
                      >
                        {(role === "SUPERADMIN" || hasPermission(role, parent.key, perm)) ? (
                          <span className="w-3 h-3 rounded-sm bg-primary" />
                        ) : (
                          <span className="w-3 h-3 rounded-sm border border-border" />
                        )}
                      </button>
                    </td>
                  ))
                )}
              </tr>
              {getChildren(parent.key).map((child) => (
                <tr key={child.key} className="border-b border-border/30">
                  <td className="p-2 pl-6 text-muted-foreground">{child.title}</td>
                  {ROLES.map((role) =>
                    PERMISSIONS.map((perm) => (
                      <td key={`${role}-${child.key}-${perm}`} className="text-center p-1 border-l border-border/30">
                        <button
                          onClick={() => handleToggle(role, child.key, perm)}
                          className="w-5 h-5 rounded-sm inline-flex items-center justify-center hover:bg-muted transition-colors"
                        >
                          {(role === "SUPERADMIN" || hasPermission(role, child.key, perm)) ? (
                            <span className="w-3 h-3 rounded-sm bg-primary" />
                          ) : (
                            <span className="w-3 h-3 rounded-sm border border-border" />
                          )}
                        </button>
                      </td>
                    ))
                  )}
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-primary inline-block" /> Granted
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm border border-border inline-block" /> Denied
        </div>
        <div className="ml-auto">
          C = Create · V = View · E = Edit · D = Delete
        </div>
      </div>
    </Card>
  );
}
