import type { Role } from "@prisma/client";

/**
 * Sumber tunggal daftar role aplikasi (turunan dari `enum Role` Prisma).
 * Tambah role baru cukup di sini: urutan tampil, warna badge, dan deskripsi.
 * Dipakai oleh validasi (`user.schema.ts`), form & daftar pengguna, dan
 * matriks Role & Permission.
 */
export const ROLES = [
  "SUPERADMIN",
  "ADMIN",
  "OPERATOR",
  "MANAGEMENT",
  "DONOR",
] as const satisfies readonly Role[];

/** Warna badge per role (daftar pengguna). */
export const ROLE_BADGE_CLASS: Record<Role, string> = {
  SUPERADMIN: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  ADMIN: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  OPERATOR: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  MANAGEMENT: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  DONOR: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
};
