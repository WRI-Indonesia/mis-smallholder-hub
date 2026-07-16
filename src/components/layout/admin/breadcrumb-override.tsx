"use client";

import { useEffect, useSyncExternalStore } from "react";

// Override label untuk segmen terakhir breadcrumb — dipakai halaman detail
// ber-[id] agar breadcrumb menampilkan kode human-facing (mis. ID Petani),
// bukan CUID dari URL (#172). Store eksternal mini tanpa provider.

let currentLabel: string | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setLabel(label: string | null) {
  currentLabel = label;
  listeners.forEach((l) => l());
}

export function useBreadcrumbOverride(): string | null {
  return useSyncExternalStore(subscribe, () => currentLabel, () => null);
}

/** Pasang di halaman detail: mengganti label segmen terakhir breadcrumb selama halaman ter-mount. */
export function BreadcrumbOverride({ label }: { label: string }) {
  useEffect(() => {
    setLabel(label);
    return () => setLabel(null);
  }, [label]);
  return null;
}
