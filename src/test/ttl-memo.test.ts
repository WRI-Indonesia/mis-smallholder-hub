import { describe, expect, it } from "vitest";
import { createTtlMemo } from "@/lib/ttl-memo";

/** TD-054 (#412): satu primitif memo ber-TTL + batas ukuran untuk memo role & izin. */
describe("createTtlMemo", () => {
  it("hit dalam TTL, hitung ulang sesudah TTL, forget membuang satu kunci", async () => {
    let t = 0;
    let calls = 0;
    const memo = createTtlMemo<string, number>({ ttlMs: 100, maxEntries: 10, now: () => t });
    const compute = async () => ++calls;
    expect(await memo.get("a", compute)).toBe(1);
    expect(await memo.get("a", compute)).toBe(1);
    t = 101;
    expect(await memo.get("a", compute)).toBe(2);
    memo.forget("a");
    expect(await memo.get("a", compute)).toBe(3);
    expect(memo.size).toBe(1);
  });

  it("galat tidak dimemo", async () => {
    const memo = createTtlMemo<string, number>({ ttlMs: 100, maxEntries: 10, now: () => 0 });
    await expect(memo.get("a", async () => { throw new Error("db"); })).rejects.toThrow("db");
    expect(memo.size).toBe(0);
    expect(await memo.get("a", async () => 7)).toBe(7);
  });

  it("penuh: entri kedaluwarsa dibuang dulu, lalu yang tertua", async () => {
    let t = 0;
    const memo = createTtlMemo<string, string>({ ttlMs: 100, maxEntries: 2, now: () => t });
    await memo.get("a", async () => "A");
    t = 50;
    await memo.get("b", async () => "B");
    t = 120; // a kedaluwarsa, b belum
    await memo.get("c", async () => "C");
    expect(memo.size).toBe(2);
    expect(await memo.get("b", async () => "B2")).toBe("B"); // b bertahan
    t = 130;
    await memo.get("d", async () => "D"); // tak ada yang kedaluwarsa → buang tertua (b)
    expect(await memo.get("b", async () => "B3")).toBe("B3");
  });
});
