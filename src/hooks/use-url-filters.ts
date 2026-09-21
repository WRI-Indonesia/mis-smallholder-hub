"use client";

import { useCallback, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Menyimpan state filter di **query string** agar tampilan bisa di-bookmark,
 * dikirim ke rekan ("lihat Lembaga X tahun 2025"), dan bertahan saat halaman
 * dimuat ulang (TD-021).
 *
 * Memakai **History API langsung**, bukan `router.replace`: pada rute dinamis,
 * `router.replace` memicu pengambilan ulang payload RSC — untuk Dashboard
 * Pelatihan itu berarti menjalankan ulang seluruh query live setiap kali filter
 * diklik, membatalkan alasan dashboard ini mengiris data di client. `replaceState`
 * hanya menyegarkan URL; tidak menumpuk riwayat browser dan tidak menggulir.
 *
 * Nilai kosong **dihapus** dari query, bukan ditulis sebagai string kosong —
 * URL untuk tampilan bawaan tetap bersih.
 */
export function useUrlFilters() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // `replaceState` tidak memberi tahu React, jadi nilai disimpan di state lokal
  // dan diinisialisasi dari URL — inilah yang membuat tautan ber-query tetap
  // terbaca saat halaman dibuka.
  const [params, setParams] = useState(() => new URLSearchParams(searchParams.toString()));

  const get = useCallback((key: string): string | null => params.get(key), [params]);

  /**
   * Ubah beberapa kunci sekaligus — satu `replace`, bukan satu per perubahan.
   * `replaceState` dipanggil di event handler, BUKAN di dalam updater
   * `setParams`: updater dijalankan React saat render berikutnya, dan Next.js
   * mem-patch replaceState menjadi setState Router → peringatan "Cannot update
   * a component (Router) while rendering" (temuan smoke #352).
   */
  const setMany = useCallback(
    (values: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(values)) {
        if (value == null || value === "") next.delete(key);
        else next.set(key, value);
      }
      const qs = next.toString();
      window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
      setParams(next);
    },
    [pathname, params],
  );

  const set = useCallback(
    (key: string, value: string | null) => setMany({ [key]: value }),
    [setMany],
  );

  return { get, set, setMany };
}
