// Aturan anti-eskalasi Settings › Users (#386 butir 2, keputusan owner 2026-10-10).
// Fungsi MURNI (tanpa Prisma/next-auth) — aksi di `user.ts`, `user-data-access.ts`,
// dan `user-menu-access.ts` mengambil data lalu memanggil helper ini.
//
// 1. Hanya SUPERADMIN yang boleh memberi role SUPERADMIN atau mengubah akun SUPERADMIN.
// 2. Tak seorang pun boleh mengubah role, status, penugasan wilayah, atau override
//    izin akunnya sendiri.
// 3. Penugasan wilayah/Lembaga hanya dalam scope pemanggil; pemanggil ber-scope tak
//    boleh mencabut penugasan terakhir seseorang (tanpa penugasan = akses SEMUA data).
//
// Saat ini menu `settings-users` hanya dimiliki SUPERADMIN (seed); aturan ini menjaga
// bila izinnya kelak diberikan ke akun lain lewat Role & Permission atau override.

import type { AccessContext } from "@/lib/access-scope";

export type UserRef = { id: string; role: string };

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

export type DataAccessGrant =
  | { kind: "province" }
  | { kind: "district"; districtId: string }
  | { kind: "group"; groupId: string; districtId: string };

/**
 * Boleh memberi / mencabut penugasan ini? ALL = semua; BY_DISTRICT = distrik scope
 * atau Lembaga di distrik scope (provinsi lebih luas → ditolak); BY_FARMER_GROUP =
 * hanya Lembaga scope.
 */
export function canGrantDataAccess(access: AccessContext, grant: DataAccessGrant): boolean {
  if (access.mode === "ALL") return true;
  if (grant.kind === "province") return false;
  if (access.mode === "BY_DISTRICT") return access.ids.includes(grant.districtId);
  return grant.kind === "group" && access.ids.includes(grant.groupId);
}
