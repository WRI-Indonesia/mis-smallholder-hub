import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";

/**
 * Login Credentials (`authorizeCredentials`, dipanggil provider NextAuth di
 * `src/lib/auth.ts`) dengan modul asli + bcrypt asli; hanya Prisma yang di-mock.
 * Yang dijaga: input kosong tak menyentuh DB, email tak peka huruf besar, akun
 * nonaktif ditolak walau password benar, password salah ditolak, sukses
 * mengembalikan id/nama/email/role tanpa hash password (#413).
 */
const db = vi.hoisted(() => ({ user: { findFirst: vi.fn() } }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const { authorizeCredentials } = await import("@/lib/auth-credentials");

const HASH = bcrypt.hashSync("rahasia1", 4);
const user = (o: Record<string, unknown> = {}) => ({
  id: "u-1", name: "Operator Uji", email: "op@example.org", role: "OPERATOR", isActive: true, password: HASH, ...o,
});

beforeEach(() => db.user.findFirst.mockReset());

describe("authorizeCredentials", () => {
  it("email/password kosong atau tak ada → null tanpa query", async () => {
    expect(await authorizeCredentials(undefined)).toBeNull();
    expect(await authorizeCredentials({ email: "op@example.org" })).toBeNull();
    expect(await authorizeCredentials({ email: "", password: "rahasia1" })).toBeNull();
    expect(db.user.findFirst).not.toHaveBeenCalled();
  });

  it("email dicocokkan tanpa peka huruf besar", async () => {
    db.user.findFirst.mockResolvedValue(user());
    await authorizeCredentials({ email: "OP@Example.org", password: "rahasia1" });
    expect(db.user.findFirst.mock.calls[0][0].where).toEqual({ email: { equals: "OP@Example.org", mode: "insensitive" } });
  });

  it("user tak ditemukan atau nonaktif → null walau password benar", async () => {
    db.user.findFirst.mockResolvedValue(null);
    expect(await authorizeCredentials({ email: "x@example.org", password: "rahasia1" })).toBeNull();
    db.user.findFirst.mockResolvedValue(user({ isActive: false }));
    expect(await authorizeCredentials({ email: "op@example.org", password: "rahasia1" })).toBeNull();
  });

  it("password salah → null", async () => {
    db.user.findFirst.mockResolvedValue(user());
    expect(await authorizeCredentials({ email: "op@example.org", password: "salah" })).toBeNull();
  });

  it("sukses → id, nama, email, role (hash password tidak ikut)", async () => {
    db.user.findFirst.mockResolvedValue(user());
    expect(await authorizeCredentials({ email: "op@example.org", password: "rahasia1" })).toEqual({
      id: "u-1", name: "Operator Uji", email: "op@example.org", role: "OPERATOR",
    });
  });
});
