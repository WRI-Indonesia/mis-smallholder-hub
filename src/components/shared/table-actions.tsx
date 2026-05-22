"use client";

import { Eye, Pencil, Trash2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface TableAction {
  type: "view" | "edit" | "delete";
  onClick: () => void;
  title?: string;
  /** Required for delete type: true means active (shows Trash2/Nonaktifkan), false means inactive (shows RotateCcw/Aktifkan kembali) */
  isActive?: boolean;
}

interface TableActionsProps {
  permissions: string[];
  actions: TableAction[];
  className?: string;
}

export function TableActions({ permissions, actions, className }: TableActionsProps) {
  return (
    <div className={`flex items-center space-x-1 ${className ?? ""}`}>
      {actions.map((action, idx) => {
        const { type, onClick, title, isActive } = action;

        if (type === "view") {
          if (!permissions.includes("VIEW")) return null;
          return (
            <Button
              key={idx}
              variant="ghost"
              size="icon"
              title={title ?? "Lihat"}
              onClick={onClick}
            >
              <Eye className="h-4 w-4" />
            </Button>
          );
        }

        if (type === "edit") {
          if (!permissions.includes("EDIT")) return null;
          return (
            <Button
              key={idx}
              variant="ghost"
              size="icon"
              title={title ?? "Edit"}
              onClick={onClick}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          );
        }

        if (type === "delete") {
          if (!permissions.includes("DELETE")) return null;
          const isDeactivated = isActive === false;
          const iconTitle = title ?? (isDeactivated ? "Aktifkan kembali" : "Nonaktifkan");
          const Icon = isDeactivated ? RotateCcw : Trash2;

          return (
            <Button
              key={idx}
              variant="ghost"
              size="icon"
              title={iconTitle}
              onClick={onClick}
            >
              <Icon className="h-4 w-4" />
            </Button>
          );
        }

        return null;
      })}
    </div>
  );
}
