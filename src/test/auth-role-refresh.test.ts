import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import type { JWT } from "next-auth/jwt";
import { createRoleLookup, refreshTokenRole, withRoleRefresh } from "@/lib/auth-role-refresh";
import { authConfig } from "@/lib/auth.config";

/**
 * Role di JWT tak lagi beku sampai login ulang (#342): role + isActive dibaca
 * ulang dari DB (memo per user ber-TTL), akun nonaktif → sesi null.
 */

const token = (extra: Partial<JWT> = {}): JWT => ({ id: "seed-operator", role: "OPERATOR", ...extra });

describe("refreshTokenRole (#342)", () => {
  it("naik role langsung berlaku", async () => {
    const lookup = vi.fn().mockResolvedValue({ role: "SUPERADMIN", isActive: true });
    expect(await refreshTokenRole(token(), lookup)).toMatchObject({ id: "seed-operator", role: "SUPERADMIN" });
    expect(lookup).toHaveBeenCalledWith("seed-operator");
  });

  it("role sama → token yang sama dikembalikan", async () => {
    const t = token();
    expect(await refreshTokenRole(t, vi.fn().mockResolvedValue({ role: "OPERATOR", isActive: true }))).toBe(t);
  });

  it("akun nonaktif → null (paksa logout)", async () => {
    expect(await refreshTokenRole(token(), vi.fn().mockResolvedValue({ role: "OPERATOR", isActive: false }))).toBeNull();
  });

  it("akun tak ditemukan → null", async () => {
    expect(await refreshTokenRole(token(), vi.fn().mockResolvedValue(null))).toBeNull();
  });

  it("galat DB → fail-open, token lama dipakai (tak mengeluarkan semua pengguna)", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const t = token();
    expect(await refreshTokenRole(t, vi.fn().mockRejectedValue(new Error("pool timeout")))).toBe(t);
    spy.mockRestore();
  });

  it("token tanpa id (belum login) dibiarkan tanpa lookup", async () => {
    const lookup = vi.fn();
    const t: JWT = { sub: "x" };
    expect(await refreshTokenRole(t, lookup)).toBe(t);
    expect(lookup).not.toHaveBeenCalled();
  });
});

describe("createRoleLookup (#342)", () => {
  it("memo per user selama TTL, lalu membaca ulang DB", async () => {
    let clock = 0;
    const fetcher = vi.fn().mockResolvedValue({ role: "ADMIN", isActive: true });
    const lookup = createRoleLookup(fetcher, 1000, () => clock);

    await lookup("a");
    await lookup("a");
    await lookup("b");
    expect(fetcher).toHaveBeenCalledTimes(2);

    clock = 1000;
    await lookup("a");
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("galat tidak dimemo", async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new Error("down")).mockResolvedValue(null);
    const lookup = createRoleLookup(fetcher, 1000, () => 0);
    await expect(lookup("a")).rejects.toThrow("down");
    expect(await lookup("a")).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

describe("withRoleRefresh + authConfig (#342)", () => {
  const baseJwt = authConfig.callbacks!.jwt! as (p: { token: JWT; user?: { id: string; role: string } }) => Promise<JWT>;

  it("sign-in lalu refresh: role dari DB menang atas role saat login", async () => {
    const jwt = withRoleRefresh(baseJwt, vi.fn().mockResolvedValue({ role: "DONOR", isActive: true }));
    expect(await jwt({ token: {}, user: { id: "seed-admin", role: "ADMIN" } })).toMatchObject({ id: "seed-admin", role: "DONOR" });
  });

  it("sign-in sesudah akun diaktifkan ulang: memo nonaktif lama tak menimpa login (review wrap-up v1.3.0)", async () => {
    const db = { role: "OPERATOR", isActive: false };
    const fetcher = vi.fn(async () => ({ ...db }));
    const jwt = withRoleRefresh(baseJwt, createRoleLookup(fetcher, 60_000, () => 0));

    // Sesi lama ditolak dan status nonaktif dimemo.
    expect(await jwt({ token: token() })).toBeNull();

    // Admin mengaktifkan ulang + menaikkan role; pengguna langsung login (masih dalam TTL).
    Object.assign(db, { role: "ADMIN", isActive: true });
    const signedIn = await jwt({ token: {}, user: { id: "seed-operator", role: "ADMIN" } });
    expect(signedIn).toMatchObject({ id: "seed-operator", role: "ADMIN" });

    // Request berikutnya memakai memo yang sudah segar, bukan status nonaktif lama.
    expect(await jwt({ token: signedIn! })).toMatchObject({ role: "ADMIN" });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("token rotasi (tanpa user) untuk akun nonaktif → null", async () => {
    const jwt = withRoleRefresh(baseJwt, vi.fn().mockResolvedValue({ role: "ADMIN", isActive: false }));
    expect(await jwt({ token: token() })).toBeNull();
  });

  it("auth.ts memasang withRoleRefresh setelah spread authConfig", () => {
    const src = readFileSync(join(__dirname, "../lib/auth.ts"), "utf-8");
    const callbacks = src.slice(src.indexOf("callbacks: {"));
    expect(callbacks).toMatch(/\.\.\.authConfig\.callbacks,[\s\S]*jwt: withRoleRefresh\(/);
    expect(src.indexOf("...authConfig,")).toBeLessThan(src.indexOf("callbacks: {"));
  });

  it("/admin tanpa sesi ditolak middleware", () => {
    const authorized = authConfig.callbacks!.authorized! as (p: { auth: null; request: { nextUrl: URL } }) => unknown;
    expect(authorized({ auth: null, request: { nextUrl: new URL("http://localhost/admin") } })).toBe(false);
  });

  it("middleware tidak menjaga /login (pengalihan di halaman login, cegah loop akun nonaktif)", () => {
    const src = readFileSync(join(__dirname, "../middleware.ts"), "utf-8");
    expect(src).not.toMatch(/matcher:[^\]]*"\/login"/);
  });
});
