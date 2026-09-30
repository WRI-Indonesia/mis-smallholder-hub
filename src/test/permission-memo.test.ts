import { describe, expect, it, vi } from "vitest";
import { createPermissionMemo } from "@/lib/permission-memo";

// #320 — memo izin berumur pendek; jam palsu, tanpa DB.

describe("createPermissionMemo", () => {
  it("dalam TTL memakai hasil memo; sesudah TTL mengecek ulang (jendela pencabutan izin)", async () => {
    let t = 0;
    const memo = createPermissionMemo(60_000, 10, () => t);
    const check = vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    expect(await memo("u1:ADMIN", check)).toBe(true);
    t = 59_999;
    expect(await memo("u1:ADMIN", check)).toBe(true);
    expect(check).toHaveBeenCalledTimes(1);
    t = 60_000; // kedaluwarsa tepat di batas
    expect(await memo("u1:ADMIN", check)).toBe(false);
    expect(check).toHaveBeenCalledTimes(2);
  });

  it("kunci berbeda tidak berbagi hasil", async () => {
    const memo = createPermissionMemo(60_000, 10, () => 0);
    expect(await memo("u1:ADMIN", async () => true)).toBe(true);
    expect(await memo("u2:DONOR", async () => false)).toBe(false);
    expect(await memo("u1:ADMIN", async () => false)).toBe(true);
  });

  it("galat tidak dimemo — permintaan berikutnya mencoba lagi", async () => {
    const memo = createPermissionMemo(60_000, 10, () => 0);
    await expect(memo("u1", async () => { throw new Error("db down"); })).rejects.toThrow("db down");
    expect(await memo("u1", async () => true)).toBe(true);
  });

  it("ukuran dibatasi: entri kedaluwarsa dibuang dulu, lalu yang tertua", async () => {
    let t = 0;
    const memo = createPermissionMemo(100, 2, () => t);
    await memo("a", async () => true); // t=0, kedaluwarsa t=100
    t = 50;
    await memo("b", async () => true); // kedaluwarsa t=150
    t = 120; // "a" kedaluwarsa, "b" masih hidup
    await memo("c", async () => true);
    const check = vi.fn(async () => false);
    expect(await memo("b", check)).toBe(true); // "b" selamat
    expect(check).not.toHaveBeenCalled();
    await memo("d", async () => true); // penuh (b, c) tanpa yang kedaluwarsa → "b" (tertua) dibuang
    expect(await memo("c", check)).toBe(true);
    expect(await memo("b", check)).toBe(false);
  });
});
