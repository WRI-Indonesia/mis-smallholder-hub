/**
 * Memo in-process per kunci ber-TTL dengan batas ukuran — satu primitif untuk
 * memo role (`auth-role-refresh.ts`, #342) dan memo izin (`permission-memo.ts`,
 * #320), yang sebelumnya dua salinan dengan aturan berbeda (TD-054, #412):
 * memo role tanpa batas ukuran dan tanpa pembuangan kedaluwarsa.
 *
 * Aturan (sama dengan memo izin yang disetujui owner 2026-09-30):
 * - hit dalam TTL → nilai memo; sesudah TTL → hitung ulang;
 * - galat `compute` tidak dimemo — permintaan berikutnya mencoba lagi;
 * - saat penuh: entri kedaluwarsa dibuang dulu, lalu yang tertua (Map menjaga
 *   urutan sisip; entri yang dihitung ulang disisipkan di ujung);
 * - `forget(key)` membuang satu entri (sign-in: status lama tak menimpa login baru).
 */
export interface TtlMemo<K, V> {
  get(key: K, compute: () => Promise<V>): Promise<V>;
  forget(key: K): void;
  readonly size: number;
}

export function createTtlMemo<K, V>({ ttlMs, maxEntries, now = Date.now }: { ttlMs: number; maxEntries: number; now?: () => number }): TtlMemo<K, V> {
  const memo = new Map<K, { value: V; expiresAt: number }>();
  return {
    async get(key, compute) {
      const t = now();
      const hit = memo.get(key);
      if (hit && hit.expiresAt > t) return hit.value;
      const value = await compute();
      if (memo.size >= maxEntries) {
        for (const [k, v] of memo) if (v.expiresAt <= t) memo.delete(k);
        while (memo.size >= maxEntries) memo.delete(memo.keys().next().value as K);
      }
      memo.delete(key); // sisip ulang di ujung agar urutan "tertua" tetap benar
      memo.set(key, { value, expiresAt: t + ttlMs });
      return value;
    },
    forget(key) {
      memo.delete(key);
    },
    get size() {
      return memo.size;
    },
  };
}
