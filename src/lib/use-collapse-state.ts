"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * State collapse per menu induk untuk tabel bertingkat (Menu Management &
 * Role & Permission). Menyimpan himpunan kunci yang **terbuka** di
 * `localStorage` — default *collapsed* (himpunan kosong = semua tertutup).
 *
 * localStorage dibaca di effect (pasca-mount), bukan lazy initializer, agar
 * render server & render awal klien sama (default collapsed) — menghindari
 * hydration mismatch pada baris mana yang ter-expand.
 */
export function useCollapseState(storageKey: string) {
  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hidrasi localStorage pasca-mount (disengaja, cegah SSR mismatch)
      if (raw) setOpenKeys(new Set(JSON.parse(raw) as string[]));
    } catch {
      // localStorage tidak tersedia / JSON rusak — pakai default collapsed.
    }
  }, [storageKey]);

  const persist = useCallback(
    (next: Set<string>) => {
      setOpenKeys(next);
      try {
        localStorage.setItem(storageKey, JSON.stringify([...next]));
      } catch {
        // abaikan kegagalan tulis storage
      }
    },
    [storageKey]
  );

  const isCollapsed = useCallback((key: string) => !openKeys.has(key), [openKeys]);

  const toggle = useCallback(
    (key: string) => {
      const next = new Set(openKeys);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      persist(next);
    },
    [openKeys, persist]
  );

  const openAll = useCallback((keys: string[]) => persist(new Set(keys)), [persist]);
  const closeAll = useCallback(() => persist(new Set()), [persist]);

  return { isCollapsed, toggle, openAll, closeAll };
}
