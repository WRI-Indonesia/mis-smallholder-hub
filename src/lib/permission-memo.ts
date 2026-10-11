/**
 * Memo hasil cek izin berumur pendek, per kunci (#320).
 *
 * Untuk endpoint yang dipanggil ratusan–ribuan kali per aksi pengguna (tile
 * basemap latar peta cetak): `getUserPermissionsForMenu` dibungkus React
 * `cache()` yang hanya men-dedup DALAM satu request, jadi tanpa memo tiap tile
 * mengulang query izin dari awal. Konsekuensi yang disetujui owner
 * (2026-09-30): pencabutan/pemberian izin baru berlaku paling lambat `ttlMs`
 * untuk endpoint baca-saja yang memakai memo ini.
 *
 * Galat tidak dimemo. Ukuran dibatasi: entri kedaluwarsa dibuang saat penuh,
 * lalu entri tertua bila masih penuh — memo tak boleh tumbuh tanpa batas di
 * proses Node yang hidup lama.
 */
import { createTtlMemo } from "@/lib/ttl-memo";

export const PERMISSION_MEMO_TTL_MS = 60 * 1000;
export const PERMISSION_MEMO_MAX_ENTRIES = 1000;

export type PermissionMemo = (key: string, check: () => Promise<boolean>) => Promise<boolean>;

export function createPermissionMemo(
  ttlMs = PERMISSION_MEMO_TTL_MS,
  maxEntries = PERMISSION_MEMO_MAX_ENTRIES,
  now = Date.now,
): PermissionMemo {
  // Aturan TTL/batas/galat ada di primitif bersama (TD-054).
  const memo = createTtlMemo<string, boolean>({ ttlMs, maxEntries, now });
  return (key, check) => memo.get(key, check);
}
