/**
 * Tombol Reset filter (#427): tampil hanya bila state filter berbeda dari
 * tampilan bawaan halaman. Satu pembanding untuk semua halaman agar aturan
 * "kosong" sama di mana pun — `null`, `undefined`, `""`, dan teks spasi saja
 * dianggap setara, dan daftar (multi-pilih) dibandingkan sebagai himpunan.
 */
export type FilterValue = string | number | boolean | null | undefined | readonly string[];
export type FilterValues = Record<string, FilterValue>;

function normalize(v: FilterValue): string | number | boolean | null {
  if (v == null) return null;
  if (typeof v === "string") return v.trim() === "" ? null : v.trim();
  if (Array.isArray(v)) return v.length === 0 ? null : [...v].sort().join("\u0000");
  return v as number | boolean;
}

/**
 * `true` bila ada kunci di `defaults` yang nilainya di `current` berbeda.
 * Kunci yang tidak ada di `defaults` diabaikan — halaman menyebut semua filter
 * yang ikut di-reset di objek bawaan.
 */
export function hasActiveFilters(current: FilterValues, defaults: FilterValues): boolean {
  return Object.keys(defaults).some((k) => normalize(current[k]) !== normalize(defaults[k]));
}

/**
 * Patch `useUrlFilters().setMany` untuk Reset halaman ber-URL: setiap kunci di
 * `defaults` dihapus dari query (bawaan = kunci tak ada), kecuali `localKeys`
 * yang disimpan di state lokal (mis. kotak Cari) dan di-reset terpisah.
 */
export function clearedUrlKeys(defaults: FilterValues, localKeys: readonly string[] = []): Record<string, null> {
  return Object.fromEntries(Object.keys(defaults).filter((k) => !localKeys.includes(k)).map((k) => [k, null]));
}
