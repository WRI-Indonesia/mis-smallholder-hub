import { describe, expect, it, vi } from "vitest";
import type { JWT } from "next-auth/jwt";
import { ROLE_REFRESH_INTERVAL_MS, refreshTokenRole } from "@/lib/auth-role-refresh";
import { authConfig } from "@/lib/auth.config";

/**
 * Role di JWT tak lagi beku sampai login ulang (#342): role + isActive dibaca
 * ulang dari DB paling lama tiap ROLE_REFRESH_INTERVAL_MS.
 */

const NOW = 1_800_000_000_000;
const token = (extra: Partial<JWT> = {}): JWT => ({ id: "seed-operator", role: "OPERATOR", ...extra });

describe("refreshTokenRole (#342)", () => {
  it("tidak menyentuh DB selama masih dalam interval", async () => {
    const lookup = vi.fn();
    const t = token({ roleCheckedAt: NOW - ROLE_REFRESH_INTERVAL_MS + 1 });
    expect(await refreshTokenRole(t, lookup, NOW)).toBe(t);
    expect(lookup).not.toHaveBeenCalled();
  });

  it("naik role berlaku setelah interval lewat", async () => {
    const lookup = vi.fn().mockResolvedValue({ role: "SUPERADMIN", isActive: true });
    const result = await refreshTokenRole(token({ roleCheckedAt: NOW - ROLE_REFRESH_INTERVAL_MS }), lookup, NOW);
    expect(lookup).toHaveBeenCalledWith("seed-operator");
    expect(result).toMatchObject({ id: "seed-operator", role: "SUPERADMIN", roleCheckedAt: NOW });
  });

  it("token sesi lama tanpa roleCheckedAt langsung dicek", async () => {
    const lookup = vi.fn().mockResolvedValue({ role: "DONOR", isActive: true });
    expect(await refreshTokenRole(token(), lookup, NOW)).toMatchObject({ role: "DONOR", roleCheckedAt: NOW });
  });

  it("akun nonaktif → null (paksa logout)", async () => {
    const lookup = vi.fn().mockResolvedValue({ role: "OPERATOR", isActive: false });
    expect(await refreshTokenRole(token(), lookup, NOW)).toBeNull();
  });

  it("akun tak ditemukan → null", async () => {
    expect(await refreshTokenRole(token(), vi.fn().mockResolvedValue(null), NOW)).toBeNull();
  });

  it("token tanpa id (belum login) dibiarkan", async () => {
    const lookup = vi.fn();
    const t: JWT = { sub: "x" };
    expect(await refreshTokenRole(t, lookup, NOW)).toBe(t);
    expect(lookup).not.toHaveBeenCalled();
  });
});

describe("authConfig callbacks (#342)", () => {
  const authorized = authConfig.callbacks!.authorized! as (p: {
    auth: { user?: object } | null;
    request: { nextUrl: URL };
  }) => unknown;
  const req = (path: string) => ({ nextUrl: new URL(`http://localhost${path}`) });

  it("sign-in mencatat roleCheckedAt", async () => {
    const jwt = authConfig.callbacks!.jwt! as (p: { token: JWT; user?: { id: string; role: string } }) => Promise<JWT>;
    const result = await jwt({ token: {}, user: { id: "seed-admin", role: "ADMIN" } });
    expect(result).toMatchObject({ id: "seed-admin", role: "ADMIN" });
    expect(typeof result.roleCheckedAt).toBe("number");
  });

  it("/admin tanpa sesi ditolak", () => {
    expect(authorized({ auth: null, request: req("/admin") })).toBe(false);
  });

  it("middleware tidak lagi mengalihkan /login → /admin (cegah loop akun nonaktif)", () => {
    expect(authorized({ auth: { user: {} }, request: req("/login") })).toBe(true);
  });
});
