import type { JWT } from "next-auth/jwt";

/**
 * Role & status aktif dibaca ulang dari DB paling lama tiap interval ini (#342).
 * Sebelumnya role hanya ditulis ke JWT saat sign-in, sehingga naik/turun role
 * dan penonaktifan akun tak berlaku sampai pengguna login ulang.
 */
export const ROLE_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export type RoleLookup = (userId: string) => Promise<{ role: string; isActive: boolean } | null>;

/**
 * Kembalikan token dengan role terbaru, atau `null` (paksa logout) bila user
 * sudah dihapus/nonaktif. Token tanpa `roleCheckedAt` (sesi lama sebelum #342)
 * dianggap basi dan langsung dicek.
 */
export async function refreshTokenRole(token: JWT, lookup: RoleLookup, now = Date.now()): Promise<JWT | null> {
  if (!token.id) return token;
  if (token.roleCheckedAt && now - token.roleCheckedAt < ROLE_REFRESH_INTERVAL_MS) return token;

  const user = await lookup(token.id);
  if (!user || !user.isActive) return null;

  return { ...token, role: user.role, roleCheckedAt: now };
}
