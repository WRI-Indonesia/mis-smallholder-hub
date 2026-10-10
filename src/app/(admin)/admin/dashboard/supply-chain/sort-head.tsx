"use client";

import { useCallback, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortDir = "asc" | "desc";
export interface SortState<K extends string> {
  key: K;
  dir: SortDir;
}

/** State urut tabel; klik kolom yang sama membalik arah, kolom lain memakai arah bawaannya. */
export function useTableSort<K extends string>(initial: SortState<K>, defaultDir: (key: K) => SortDir) {
  const [sort, setSort] = useState<SortState<K>>(initial);
  const toggle = useCallback(
    (key: K) => setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: defaultDir(key) })),
    [defaultDir],
  );
  return { sort, setSort, toggle };
}

/** Urut baris menurut nilai kolom; null selalu di bawah, nama memakai kolasi id. */
export function sortRows<T, K extends string>(rows: T[], sort: SortState<K>, valueOf: (row: T, key: K) => string | number | null): T[] {
  const sign = sort.dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const va = valueOf(a, sort.key);
    const vb = valueOf(b, sort.key);
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    if (typeof va === "number" && typeof vb === "number") return sign * (va - vb);
    return sign * String(va).localeCompare(String(vb), "id");
  });
}

/** Judul kolom yang bisa diklik untuk mengurutkan (pola tab Jalur). */
export function SortHead<K extends string>({
  sortKey,
  sort,
  onToggle,
  label,
  className,
  title,
}: {
  sortKey: K;
  sort: SortState<K>;
  onToggle: (key: K) => void;
  label: React.ReactNode;
  className?: string;
  title?: string;
}) {
  const on = sort.key === sortKey;
  const Icon = !on ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th className={cn("py-2 pr-3 font-medium", className)} aria-sort={on ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
      <button
        type="button"
        onClick={() => onToggle(sortKey)}
        title={title}
        className="inline-flex items-center gap-1 font-medium hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
      >
        {label}
        <Icon className={cn("h-3 w-3 shrink-0", !on && "opacity-50")} />
      </button>
    </th>
  );
}
