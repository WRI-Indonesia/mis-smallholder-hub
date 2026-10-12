import { describe, it, expect } from "vitest";
import { authConfig } from "@/lib/auth.config";

/**
 * Callback `authorized` ASLI (`src/lib/auth.config.ts`) yang dipakai middleware
 * (`matcher: ["/admin/:path*"]`). Dulu berkas ini menguji salinan `checkAuth`
 * yang masih mengalihkan /login → /admin; pengalihan itu sudah pindah ke halaman
 * login (#342), sehingga callback hanya menolak /admin tanpa sesi.
 */
type AuthorizedArgs = Parameters<NonNullable<NonNullable<typeof authConfig.callbacks>["authorized"]>>[0];

const authorized = (pathname: string, user: { id: string } | null) =>
  authConfig.callbacks!.authorized!({
    auth: user ? { user, expires: "2099-01-01T00:00:00.000Z" } : null,
    request: { nextUrl: new URL(`http://localhost${pathname}`) },
  } as unknown as AuthorizedArgs);

const USER = { id: "user-1" };

describe("authConfig.callbacks.authorized", () => {
  it("tanpa sesi + /admin/... → false (NextAuth mengalihkan ke pages.signIn)", async () => {
    expect(await authorized("/admin", null)).toBe(false);
    expect(await authorized("/admin/settings/users", null)).toBe(false);
    expect(await authorized("/admin/master-data/groups", null)).toBe(false);
    expect(authConfig.pages?.signIn).toBe("/login");
  });

  it("sesi tanpa user dianggap belum login", async () => {
    const res = await authConfig.callbacks!.authorized!({
      auth: { expires: "2099-01-01T00:00:00.000Z" },
      request: { nextUrl: new URL("http://localhost/admin") },
    } as unknown as AuthorizedArgs);
    expect(res).toBe(false);
  });

  it("dengan sesi → /admin diizinkan", async () => {
    expect(await authorized("/admin", USER)).toBe(true);
    expect(await authorized("/admin/settings/users", USER)).toBe(true);
  });

  it("/login → true apa pun sesinya (pengalihan /login → /admin diputuskan halaman login, #342)", async () => {
    expect(await authorized("/login", null)).toBe(true);
    expect(await authorized("/login", USER)).toBe(true);
  });

  it("rute non-admin → true apa pun sesinya", async () => {
    expect(await authorized("/", null)).toBe(true);
    expect(await authorized("/", USER)).toBe(true);
    expect(await authorized("/community", null)).toBe(true);
  });
});
