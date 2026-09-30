import type { JWT } from "next-auth/jwt";

/**
 * Role & status aktif dibaca ulang dari DB, bukan dipercaya dari JWT (#342).
 * Sebelumnya role hanya ditulis ke token saat sign-in, sehingga naik/turun
 * role dan penonaktifan akun tak berlaku sampai pengguna login ulang.
 *
 * Hasil lookup dimemo per user di proses Node selama TTL ini — berlaku sama
 * untuk RSC, server action, dan route handler (cookie JWT tak selalu bisa
 * ditulis ulang, jadi penanda waktu di token tidak dipakai).
 */
export const ROLE_CACHE_TTL_MS = 60 * 1000;

export type UserRoleState = { role: string; isActive: boolean } | null;
export type RoleLookup = ((userId: string) => Promise<UserRoleState>) & {
  /** Buang memo satu user — dipanggil saat sign-in agar status lama tak menimpa login baru. */
  forget?: (userId: string) => void;
};

/** Bungkus fetcher DB dengan memo per userId ber-TTL. Galat tidak dimemo. */
export function createRoleLookup(fetcher: RoleLookup, ttlMs = ROLE_CACHE_TTL_MS, now = Date.now): RoleLookup {
  const memo = new Map<string, { value: UserRoleState; expiresAt: number }>();
  const lookup: RoleLookup = async (userId) => {
    const hit = memo.get(userId);
    if (hit && hit.expiresAt > now()) return hit.value;
    const value = await fetcher(userId);
    memo.set(userId, { value, expiresAt: now() + ttlMs });
    return value;
  };
  lookup.forget = (userId) => void memo.delete(userId);
  return lookup;
}

/**
 * Kembalikan token dengan role terbaru, atau `null` (paksa logout) bila user
 * dipastikan terhapus/nonaktif. Galat DB = fail-open: token lama dipakai,
 * supaya gangguan DB sesaat tidak mengeluarkan semua pengguna.
 */
export async function refreshTokenRole(token: JWT, lookup: RoleLookup): Promise<JWT | null> {
  if (!token.id) return token;

  let user: UserRoleState;
  try {
    user = await lookup(token.id);
  } catch (error) {
    console.error("[auth] gagal membaca ulang role, memakai role di token", error);
    return token;
  }
  if (!user || !user.isActive) return null;

  return user.role === token.role ? token : { ...token, role: user.role };
}

/**
 * Callback `jwt` jalur Node: callback dasar (edge-safe) lalu refresh role.
 * Saat sign-in (`user` ada) memo user itu dibuang dulu: tanpa ini, status yang
 * dimemo sebelum admin mengaktifkan ulang akun / mengganti role (≤ TTL) menimpa
 * login yang baru saja lolos `authorize` — login gagal diam-diam atau role lama.
 */
export function withRoleRefresh<P>(base: (params: P) => JWT | null | PromiseLike<JWT | null>, lookup: RoleLookup) {
  return async (params: P): Promise<JWT | null> => {
    const signInUserId = (params as { user?: { id?: string } }).user?.id;
    if (signInUserId) lookup.forget?.(signInUserId);
    const token = await base(params);
    return token && refreshTokenRole(token, lookup);
  };
}
