"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const STORAGE_PREFIX = "sc-dashboard:";

/**
 * State tampilan per browser (tab terakhir, kartu terlipat) — kenyamanan per
 * pengguna, bukan data. Dibaca pasca-mount agar render server & render awal klien
 * sama (pola `use-collapse-state`); nilai yang tak ada di `allowed` diabaikan.
 */
export function useStoredChoice<T extends string>(key: string, initial: T, allowed: readonly T[]) {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + key);
      if (raw && (allowed as readonly string[]).includes(raw)) setValue(raw as T);
    } catch {
      // localStorage tak tersedia (mode privat, situs diblokir) — pakai bawaan.
    }
    // `allowed` konstanta modul di semua pemakai; cukup baca sekali per kunci.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const set = useCallback(
    (v: T) => {
      setValue(v);
      try {
        localStorage.setItem(STORAGE_PREFIX + key, v);
      } catch {
        // abaikan kegagalan tulis storage
      }
    },
    [key],
  );
  return [value, set] as const;
}

export const OPEN_STATES = ["open", "closed"] as const;

/**
 * Kartu dashboard yang bisa dilipat lewat judulnya (owner 2026-10-09). Terbuka
 * secara bawaan; posisi lipat diingat per browser. `aside` (legenda, keterangan)
 * tetap tampil saat terlipat.
 */
export function CollapsibleCard({
  id,
  title,
  aside,
  children,
  contentClassName,
  open: openProp,
  onOpenChange,
}: {
  id: string;
  title: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
  contentClassName?: string;
  /** Mode terkendali (mis. kartu yang dibuka dari luar oleh tautan Sorotan); pemanggil yang menyimpan state-nya. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [state, setStored] = useStoredChoice(`card:${id}`, "open", OPEN_STATES);
  const open = openProp ?? state === "open";
  const setState = (v: (typeof OPEN_STATES)[number]) => (onOpenChange ? onOpenChange(v === "open") : setStored(v));
  return (
    <Card className="border border-border/60 shadow-sm">
      <CardHeader className={cn("pb-2", !open && "pb-4")}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setState(open ? "closed" : "open")}
            aria-expanded={open}
            className="-ml-1 inline-flex items-center gap-1.5 rounded px-1 text-left text-sm font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", !open && "-rotate-90")} />
            {title}
          </button>
          {aside}
        </div>
      </CardHeader>
      {open && <CardContent className={contentClassName}>{children}</CardContent>}
    </Card>
  );
}
