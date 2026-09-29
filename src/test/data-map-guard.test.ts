import { describe, it, expect, vi, beforeEach } from "vitest";
import { dataSchema } from "@/lib/data-schema";

/**
 * Guard Peta Data & Skema (`data-map.ts`, DA-07 #256) — tanpa DB. Menu key
 * di-hardcode `data-analyst-data-map`. Lapis access-context SENGAJA tidak
 * dipakai (bentuk skema nasional, lihat komentar berkas) — yang dijaga di sini:
 * guard, soft delete (hanya baris aktif untuk model ber-isActive), dan hitungan
 * keterisian dari `_count`.
 */
const hasPermission = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rbac", () => ({ hasPermission }));

// Delegate Prisma diakses dinamis (`prisma[clientName]`) — Proxy memberi
// satu mock `aggregate` per nama model.
const db = vi.hoisted(() => {
  const delegates = new Map<string, { aggregate: ReturnType<typeof vi.fn> }>();
  // `menuItem` juga entitas skema → butuh findMany (getMenuLabels) DAN aggregate.
  const menuItem = { findMany: vi.fn(), aggregate: vi.fn() };
  const prisma = new Proxy({} as Record<string, unknown>, {
    get(_t, key: string) {
      if (!delegates.has(key)) delegates.set(key, key === "menuItem" ? menuItem : { aggregate: vi.fn() });
      return delegates.get(key);
    },
  });
  return { prisma, delegates, menuItem };
});
vi.mock("@/lib/prisma", () => ({ prisma: db.prisma }));

const actions = await import("@/server/actions/data-map");

beforeEach(() => {
  vi.clearAllMocks();
  db.delegates.clear();
  hasPermission.mockResolvedValue(true);
  db.menuItem.findMany.mockResolvedValue([{ key: "k", title: "T", parentKey: null, order: 1, extra: "x" }]);
});

describe("guard — data-analyst-data-map:VIEW", () => {
  it("getEntityFillRates & getMenuLabels memeriksa menu yang sama", async () => {
    await actions.getMenuLabels();
    expect(hasPermission).toHaveBeenCalledExactlyOnceWith("data-analyst-data-map", "VIEW");
  });

  it("izin ditolak → melempar, tidak ada aggregate/findMany", async () => {
    hasPermission.mockResolvedValue(false);
    await expect(actions.getEntityFillRates()).rejects.toThrow(/tidak memiliki akses/);
    await expect(actions.getMenuLabels()).rejects.toThrow(/tidak memiliki akses/);
    expect(db.delegates.size).toBe(0);
    expect(db.menuItem.aggregate).not.toHaveBeenCalled();
    expect(db.menuItem.findMany).not.toHaveBeenCalled();
  });
});

describe("getEntityFillRates", () => {
  it("satu aggregate per entitas; model ber-isActive hanya menghitung baris aktif; pct dari _count", async () => {
    const withActive = dataSchema.entities.find((e) => e.fields.some((f) => f.name === "isActive"))!;
    const withoutActive = dataSchema.entities.find((e) => !e.fields.some((f) => f.name === "isActive"));

    // Delegate lahir saat pertama diakses lewat Proxy — siapkan hasil per model.
    for (const e of dataSchema.entities) {
      const d = (db.prisma as Record<string, { aggregate: ReturnType<typeof vi.fn> }>)[e.clientName];
      d.aggregate.mockResolvedValue({ _count: { _all: e.clientName === withActive.clientName ? 4 : 0, [e.fields[0].name]: 1 } });
    }
    const res = await actions.getEntityFillRates();

    expect(res).toHaveLength(dataSchema.entities.length);
    for (const e of dataSchema.entities) {
      expect(db.delegates.get(e.clientName)!.aggregate).toHaveBeenCalledTimes(1);
    }
    expect(db.delegates.get(withActive.clientName)!.aggregate.mock.calls[0][0].where).toEqual({ isActive: true });
    if (withoutActive) {
      expect(db.delegates.get(withoutActive.clientName)!.aggregate.mock.calls[0][0].where).toBeUndefined();
    }
    // Entitas dengan baris terbanyak di urutan pertama; tabel kosong → pct null.
    expect(res[0].clientName).toBe(withActive.clientName);
    expect(res[0].rows).toBe(4);
    expect(res[res.length - 1].fields.every((f) => f.pct === null)).toBe(true);
  });
});

describe("getMenuLabels", () => {
  it("hanya menu aktif; bentuk keluaran dipangkas ke 4 kolom", async () => {
    const res = await actions.getMenuLabels();
    expect(db.menuItem.findMany.mock.calls[0][0].where).toEqual({ isActive: true });
    expect(res).toEqual([{ key: "k", title: "T", parentKey: null, order: 1 }]);
  });
});
