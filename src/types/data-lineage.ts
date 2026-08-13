/**
 * Tipe jalur data menu → entitas (#256). Isinya diturunkan dari kode oleh
 * `scripts/lineage-scan.ts` dan ditulis ke `src/lib/data-lineage.generated.ts`;
 * berkas ini hanya kontraknya, aman diimpor komponen UI.
 */

/** R = hanya membaca · W = hanya menulis · RW = keduanya. */
export type LineageAccess = "R" | "W" | "RW";

export type LineageEntry = {
  /** Kunci menu dari `requirePermission("…")` pada page.tsx rute ini. */
  menuKey: string;
  /** Path rute relatif terhadap `src/app`, mis. `(admin)/admin/master-data/farmers`. */
  route: string;
  /** Entitas Prisma yang disentuh rute ini → jenis aksesnya. */
  models: Record<string, LineageAccess>;
  /**
   * Berkas yang benar-benar memanggil Prisma untuk rute ini (relatif `src/`),
   * hasil penelusuran transitif dari berkas rute. Dipakai UI untuk menjawab
   * "lewat mana", dan membuat kegagalan test penjaga bisa dibaca.
   */
  modules: string[];
};

export type DataLineage = LineageEntry[];

/** Rute yang sengaja tak terpetakan (halaman induk tanpa `requirePermission`). */
export type UnmappedRoute = {
  route: string;
  reason: "tanpa-requirePermission";
};

export type LineageScanResult = {
  entries: DataLineage;
  /**
   * Entitas yang disentuh modul infrastruktur (guard RBAC + scope akses) dan
   * karenanya dilewati SETIAP menu — dipisah supaya tidak menenggelamkan
   * entitas domain di baris tiap menu.
   */
  infraModels: Record<string, LineageAccess>;
  unmapped: UnmappedRoute[];
};
