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

  it("isian tak valid ditolak sebelum menyentuh DB, dengan pesan spesifik", async () => {
    expect(await actions.saveProgramTargets([cell({ value: -5 })])).toEqual({ success: false, error: "Target tidak boleh negatif" });
    expect(await actions.saveProgramTargets([cell({ year: 0 })])).toEqual({ success: false, error: "Tahun minimal 2015" });
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});

describe("temuan review #403 — bentuk rencana & izin ganti tahun Start", () => {
  const active = (o: Record<string, unknown>) => ({ indicator: "TRAINING_P3_GEDSI_LIVELIHOOD", periodType: "ANNUAL", year: 2026, value: 10, isActive: true, ...o });

  it("mengganti tahun Start tanpa DELETE ditolak (dulu sukses diam-diam, dua Start aktif); dengan DELETE baseline lama dinonaktifkan", async () => {
    db.programTarget.findMany.mockResolvedValue([active({ periodType: "BASELINE", year: 2025, value: 50 })]);
    hasPermission.mockImplementation(async (_k: string, p: string) => p !== "DELETE");
    expect(await actions.saveProgramTargets([cell({ periodType: "BASELINE", year: 2024, value: 50 })])).toMatchObject({
      success: false,
      error: expect.stringMatching(/tahun Start/),
    });
    expect(db.$transaction).not.toHaveBeenCalled();

    hasPermission.mockResolvedValue(true);
    const res = await actions.saveProgramTargets([cell({ periodType: "BASELINE", year: 2024, value: 50 })]);
    expect(res.success).toBe(true);
    expect(tx.programTarget.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { periodType: "BASELINE", isActive: true, year: { not: 2024 } } }));
  });

  it("hasil akhir divalidasi: tahun ≤ Start dan celah tahun ditolak (menghitung dua kali / membuang realisasi)", async () => {
    db.programTarget.findMany.mockResolvedValue([active({ year: 2026 })]);
    expect(await actions.saveProgramTargets([cell({ periodType: "BASELINE", year: 2026, value: 5 })])).toMatchObject({
      success: false,
      error: expect.stringMatching(/sebelum tahun Start/),
    });
    expect(await actions.saveProgramTargets([cell({ year: 2028 })])).toMatchObject({ success: false, error: expect.stringMatching(/berurutan/) });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("sel yang nilainya tak berubah tidak ditulis ulang (\"Terakhir diubah oleh\" tetap akurat)", async () => {
    db.programTarget.findMany.mockResolvedValue([active({})]);
    expect(await actions.saveProgramTargets([cell({ value: 10 })])).toEqual({ success: true, data: { saved: 0, cleared: 0 } });
    expect(tx.programTarget.upsert).not.toHaveBeenCalled();
  });
});
