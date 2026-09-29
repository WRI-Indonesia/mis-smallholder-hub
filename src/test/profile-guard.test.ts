import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Ganti password sendiri (`src/server/actions/profile.ts`) tanpa DB — pola
 * mock `land-marker-guard.test.ts`. Tidak ada menu permission (semua user
 * login boleh), jadi yang dijaga: wajib sesi, target SELALU id sesi (bukan
 * input), password lama diverifikasi, validasi Zod, dan yang disimpan hash.
 */
const auth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth", () => ({ auth }));

const bcrypt = vi.hoisted(() => ({ compare: vi.fn(), hash: vi.fn() }));
vi.mock("bcryptjs", () => ({ default: bcrypt }));

const db = vi.hoisted(() => ({ user: { findUnique: vi.fn(), update: vi.fn() } }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const { changePassword } = await import("@/server/actions/profile");

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: "user-1" } });
  db.user.findUnique.mockResolvedValue({ id: "user-1", password: "hash-lama" });
  db.user.update.mockResolvedValue({});
  bcrypt.compare.mockResolvedValue(true);
  bcrypt.hash.mockResolvedValue("hash-baru");
});

describe("changePassword", () => {
  it("tanpa sesi → ditolak tanpa DB", async () => {
    auth.mockResolvedValue(null);
    expect(await changePassword("lama", "baru123")).toEqual({ success: false, error: "Tidak terautentikasi" });
    expect(db.user.findUnique).not.toHaveBeenCalled();
  });

  it("password baru < 6 karakter / lama kosong → pesan validasi, tanpa DB", async () => {
    expect(await changePassword("lama", "123")).toEqual({ success: false, error: "Password baru minimal 6 karakter" });
    expect(await changePassword("", "baru123")).toEqual({ success: false, error: "Password lama wajib diisi" });
    expect(db.user.findUnique).not.toHaveBeenCalled();
  });

  it("password lama salah → ditolak, tidak ada update", async () => {
    bcrypt.compare.mockResolvedValue(false);
    expect(await changePassword("salah", "baru123")).toEqual({ success: false, error: "Password lama salah" });
    expect(bcrypt.compare).toHaveBeenCalledWith("salah", "hash-lama");
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("sukses → hanya user sesi yang diubah, disimpan hash (bukan plaintext)", async () => {
    expect(await changePassword("lama", "baru123")).toEqual({ success: true });
    expect(db.user.findUnique).toHaveBeenCalledWith({ where: { id: "user-1" } });
    expect(db.user.update).toHaveBeenCalledExactlyOnceWith({ where: { id: "user-1" }, data: { password: "hash-baru" } });
    expect(bcrypt.hash).toHaveBeenCalledWith("baru123", 10);
  });
});
