// Aturan anti-eskalasi Settings › Users & Role & Permission (#386 butir 2, keputusan
// owner 2026-10-10, diperketat sesudah review 61d002a). Fungsi MURNI (tanpa Prisma/
// next-auth) — aksi di `user.ts`, `user-data-access.ts`, `user-menu-access.ts`, dan
// `role-permission.ts` mengambil data lalu memanggil helper ini.
//
// 1. Pengelolaan pengguna (baca daftar, buat, ubah, nonaktifkan, penugasan, override)
//    hanya oleh akun TANPA batasan wilayah (scope ALL). Pengelola ber-scope bisa membuat
//    akun tanpa penugasan (= akses SEMUA data) atau me-reset password akun lain, jadi
//    "penugasan dalam scope pemanggil" saja tidak cukup.
// 2. Hanya SUPERADMIN yang boleh memberi role SUPERADMIN atau mengubah akun SUPERADMIN.
// 3. Tak seorang pun boleh mengubah role, status, penugasan, atau override akunnya sendiri.
// 4. Matriks Role & Permission hanya bisa diubah SUPERADMIN (pemegangnya bisa menaikkan
//    izin perannya sendiri).
//
// Saat ini kedua menu hanya dimiliki SUPERADMIN (seed); aturan ini menjaga bila izinnya
// kelak diberikan ke peran/akun lain.

import type { AccessContext } from "@/lib/access-scope";

export type UserRef = { id: string; role: string };

/** Pesan galat bila pemanggil ber-scope (bukan ALL); `null` = boleh mengelola pengguna. */
export function userAdminScopeError(access: AccessContext): string | null {
  return access.mode === "ALL" ? null : "Pengelolaan pengguna hanya untuk akun tanpa batasan wilayah";
}

/** Pesan galat bila `actor` tak boleh mengubah akun `target`; `null` = boleh. */
export function userTargetError(actor: UserRef, target: UserRef | null, opts: { allowSelf?: boolean } = {}): string | null {
  if (!target) return "User tidak ditemukan";
  if (target.id === actor.id && !opts.allowSelf) return "Tidak dapat mengubah akses atau status akun Anda sendiri";
  if (target.role === "SUPERADMIN" && actor.role !== "SUPERADMIN") return "Hanya SUPERADMIN yang dapat mengubah akun SUPERADMIN";
  return null;
}

/** Pesan galat bila `actor` tak boleh memberi `role`; `null` = boleh. */
export function roleGrantError(actor: UserRef, role: string): string | null {
  return role === "SUPERADMIN" && actor.role !== "SUPERADMIN" ? "Hanya SUPERADMIN yang dapat memberi role SUPERADMIN" : null;
}

/** Pesan galat bila `actor` bukan SUPERADMIN saat mengubah matriks Role & Permission. */
export function rolePermissionEditError(actor: UserRef): string | null {
  return actor.role === "SUPERADMIN" ? null : "Hanya SUPERADMIN yang dapat mengubah Role & Permission";
}
