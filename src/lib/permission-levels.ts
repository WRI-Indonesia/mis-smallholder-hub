import type { PermissionLevel } from "@prisma/client";

/**
 * Satu-satunya sumber daftar & label PermissionLevel di sisi aplikasi — pola yang sama
 * dengan `src/lib/roles.ts` untuk role. Menambah level baru: tambah nilai enum Prisma
 * (migrasi) + satu entri di sini; matriks Role & Permission, modal Hak Akses Menu, dan
 * bypass SUPERADMIN (`rbac.ts`) mengambil dari daftar ini.
 */
export const PERMISSION_LEVELS: {
  key: PermissionLevel;
  /** Huruf singkat di header kolom (Export = X agar tidak bentrok dengan Edit) */
  short: string;
  label: string;
  /** Pengelompokan kolom: aksi data (CRUD) vs keluaran (unduh/cetak) */
  group: "data" | "keluaran";
}[] = [
  { key: "CREATE", short: "C", label: "Create — tambah data", group: "data" },
  { key: "VIEW", short: "V", label: "View — lihat data", group: "data" },
  { key: "EDIT", short: "E", label: "Edit — ubah data", group: "data" },
  { key: "DELETE", short: "D", label: "Delete — hapus data", group: "data" },
  { key: "EXPORT", short: "X", label: "Export — unduh Excel/data mentah", group: "keluaran" },
  { key: "PRINT", short: "P", label: "Print — cetak/unduh PDF", group: "keluaran" },
];

export const ALL_PERMISSIONS: PermissionLevel[] = PERMISSION_LEVELS.map((p) => p.key);
