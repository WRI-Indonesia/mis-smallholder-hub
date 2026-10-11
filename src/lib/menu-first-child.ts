/**
 * Anak pertama (urut `order`) yang boleh diakses — tujuan redirect halaman indeks
 * menu induk (TD-051, #412). Dulu tiap indeks me-redirect ke satu anak tetap;
 * pengguna yang izin anak itu dicabut (override per user, atau peran yang hanya
 * punya anak lain) terpental dua kali ke `/admin`. Murni: pohon & izin dari pemanggil.
 */
export function firstAccessibleChild<T extends { key: string; url: string }>(children: T[], accessibleKeys: ReadonlySet<string> | string[]): T | null {
  const allowed = accessibleKeys instanceof Set ? accessibleKeys : new Set(accessibleKeys);
  return children.find((c) => allowed.has(c.key)) ?? null;
}
