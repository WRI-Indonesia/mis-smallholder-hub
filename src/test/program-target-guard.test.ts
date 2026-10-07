import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Guard & audit Target Program (`src/server/actions/program-target.ts`, #403) — tanpa DB.
 * Baca: VIEW menu Target Program ATAU Dashboard Pelatihan; tulis: EDIT (+ CREATE untuk sel
 * baru, DELETE untuk mengosongkan). Data seluruh program → tanpa scope akses.
 */
const hasPermission = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rbac", () => ({ hasPermission }));
vi.mock("@/lib/auth", () => ({ auth: async () => ({ user: { id: "user-1" } }) }));
const revalidatePath = vi.hoisted(() => vi.fn());
vi.mock("next/cache", () => ({ revalidatePath }));

const tx = vi.hoisted(() => ({ programTarget: { update: vi.fn(), upsert: vi.fn(), updateMany: vi.fn(async () => ({ count: 0 })) } }));
const db = vi.hoisted(() => ({
  programTarget: { findMany: vi.fn(), findFirst: vi.fn() },
  user: { findUnique: vi.fn() },
  $transaction: vi.fn(async (fn: (t: typeof tx) => Promise<void>) => fn(tx)),
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const actions = await import("@/server/actions/program-target");

const cell = (o: Record<string, unknown> = {}) => ({ indicator: "TRAINING_P3_GEDSI_LIVELIHOOD" as const, periodType: "ANNUAL" as const, year: 2026, value: 10, ...o });

beforeEach(() => {
  vi.clearAllMocks();
  hasPermission.mockResolvedValue(true);
  db.programTarget.findMany.mockResolvedValue([]);
  db.programTarget.findFirst.mockResolvedValue(null);
});

describe("guard Target Program", () => {
  it("baca ditolak tanpa VIEW menu maupun dashboard; boleh lewat dashboard-training saja", async () => {
    hasPermission.mockResolvedValue(false);
    await expect(actions.getProgramTargets()).rejects.toThrow(/izin/);
    hasPermission.mockImplementation(async (key: string) => key === "dashboard-training");
    await expect(actions.getProgramTargets()).resolves.toMatchObject({ records: [] });
    expect(db.programTarget.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { isActive: true } }));
  });

  it("simpan butuh EDIT; sel baru butuh CREATE; mengosongkan butuh DELETE", async () => {
    hasPermission.mockImplementation(async (_k: string, p: string) => p !== "EDIT");
    expect(await actions.saveProgramTargets([cell()])).toMatchObject({ success: false });
    hasPermission.mockImplementation(async (_k: string, p: string) => p !== "CREATE");
    expect(await actions.saveProgramTargets([cell()])).toMatchObject({ success: false, error: expect.stringMatching(/menambah/) });
    db.programTarget.findMany.mockResolvedValue([{ indicator: "TRAINING_P3_GEDSI_LIVELIHOOD", periodType: "ANNUAL", year: 2026, isActive: true }]);
    hasPermission.mockImplementation(async (_k: string, p: string) => p !== "DELETE");
    expect(await actions.saveProgramTargets([cell({ value: null })])).toMatchObject({ success: false, error: expect.stringMatching(/mengosongkan/) });
    expect(tx.programTarget.upsert).not.toHaveBeenCalled();
  });

  it("upsert mengaktifkan ulang + audit; kosong = soft delete (bukan hapus); revalidasi halaman & dashboard", async () => {
    db.programTarget.findMany.mockResolvedValue([{ indicator: "TRAINING_P3_GEDSI_LIVELIHOOD", periodType: "ANNUAL", year: 2027, isActive: true }]);
    const res = await actions.saveProgramTargets([cell(), cell({ year: 2027, value: null })]);
    expect(res).toEqual({ success: true, data: { saved: 1, cleared: 1 } });
    expect(tx.programTarget.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ createdBy: "user-1" }),
      update: expect.objectContaining({ isActive: true, modifiedBy: "user-1" }),
    }));
    expect(tx.programTarget.update).toHaveBeenCalledWith(expect.objectContaining({ data: { isActive: false, modifiedBy: "user-1" } }));
    expect(revalidatePath).toHaveBeenCalledWith("/admin/master-data/program-target");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/dashboard/training");
  });

  it("isian tak valid ditolak sebelum menyentuh DB", async () => {
    expect(await actions.saveProgramTargets([cell({ value: -5 })])).toMatchObject({ success: false });
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});
