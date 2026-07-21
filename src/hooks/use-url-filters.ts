"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Menyimpan state filter di **query string** agar tampilan bisa di-bookmark,
 * dikirim ke rekan ("lihat Lembaga X tahun 2025"), dan bertahan saat halaman
 * dimuat ulang (TD-021).
 *
 * Memakai `router.replace` + `scroll: false`: mengubah filter bukan navigasi
 * baru, jadi tidak boleh menumpuk riwayat browser (tombol Back akan terasa
 * rusak) maupun melompatkan posisi gulir.
 *
 * Nilai kosong **dihapus** dari query, bukan ditulis sebagai string kosong —
 * URL untuk tampilan bawaan tetap bersih.
 */
export function useUrlFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const get = useCallback((key: string): string | null => searchParams.get(key), [searchParams]);

  /** Ubah beberapa kunci sekaligus — satu `replace`, bukan satu per perubahan. */
  const setMany = useCallback(
    (values: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(values)) {
        if (value == null || value === "") next.delete(key);
        else next.set(key, value);
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const set = useCallback(
    (key: string, value: string | null) => setMany({ [key]: value }),
    [setMany],
  );

  return { get, set, setMany };
}
