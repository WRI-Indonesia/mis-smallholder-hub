import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Guard & aturan tulis Pengaturan › Menu (`src/server/actions/menu.ts`) tanpa
 * DB — pola mock `land-marker-guard.test.ts`. Menu key `settings-menu`
 * (daftar lengkap juga dibuka untuk `settings-roles`: matriks Role &
 * Permission). Yang dijaga: level per action, UI hanya mengubah Aktif/Visible
 * (struktur & menu baru hanya lewat menu.csv + seed, #364), hapus =
 * `isActive/isVisible:false` (tak pernah `delete`), audit dari sesi.
 */
const hasPermission = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rbac", () => ({ hasPermission }));
vi.mock("@/lib/auth", () => ({ auth: async () => ({ user: { id: "admin-1" } }) }));

const db = vi.hoisted(() => ({
  menuItem: {
    findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn(),
  },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const actions = await import("@/server/actions/menu");
const { updateMenuItemSchema } = await import("@/validations/menu.schema");

/** Payload seperti form lama / POST langsung: membawa seluruh kolom struktur. */
const fullPayload = (o: Record<string, unknown> = {}) => ({
  id: "m-1", key: "key-diganti", parentKey: "induk-lain", title: "Label Asing", url: "/admin/lain", icon: "Layers", order: 99,
  isActive: true, isVisible: false, ...o,
}) as unknown as Parameters<typeof actions.updateMenuItem>[0];

beforeEach(() => {
  vi.clearAllMocks();
  hasPermission.mockResolvedValue(true);
  db.menuItem.findMany.mockResolvedValue([]);
  db.menuItem.findUnique.mockResolvedValue({ isActive: true });
  db.menuItem.create.mockResolvedValue({});
  db.menuItem.update.mockResolvedValue({});
});

describe("guard", () => {
  it("update=EDIT, delete=DELETE pada settings-menu; tidak ada aksi tambah menu (#364)", async () => {
    await actions.updateMenuItem(fullPayload());
    await actions.deleteMenuItem("m-1");
    expect(hasPermission.mock.calls).toEqual([["settings-menu", "EDIT"], ["settings-menu", "DELETE"]]);
    expect(actions).not.toHaveProperty("createMenuItem");
  });

  it("getAllMenuItems: settings-menu:VIEW ATAU settings-roles:VIEW; keduanya ditolak → melempar", async () => {
    hasPermission.mockImplementation(async (menu: string) => menu === "settings-roles");
    await actions.getAllMenuItems();
    expect(db.menuItem.findMany).toHaveBeenCalledOnce();

    hasPermission.mockResolvedValue(false);
    await expect(actions.getAllMenuItems()).rejects.toThrow(/izin/);
    expect(hasPermission).toHaveBeenCalledWith("settings-menu", "VIEW");
    expect(hasPermission).toHaveBeenCalledWith("settings-roles", "VIEW");
    expect(db.menuItem.findMany).toHaveBeenCalledOnce();
  });

  it("izin ditolak → mutasi { success:false }, DB tak disentuh", async () => {
    hasPermission.mockResolvedValue(false);
    expect((await actions.updateMenuItem(fullPayload())).success).toBe(false);
    expect((await actions.deleteMenuItem("m-1")).success).toBe(false);
    for (const fn of Object.values(db.menuItem)) expect(fn).not.toHaveBeenCalled();
  });

  it("getMenuItems (sidebar) hanya membaca menu aktif & tampil", async () => {
    await actions.getMenuItems();
    expect(db.menuItem.findMany.mock.calls[0][0].where).toEqual({ isActive: true, isVisible: true });
  });
});

describe("updateMenuItem — hanya Aktif & Visible (#364)", () => {
  it("kolom struktur dari klien TIDAK ditulis — hanya isActive, isVisible, modifiedBy", async () => {
    // POST langsung ke action (bukan lewat form) tetap membawa key/judul/urutan/induk/URL/ikon.
    expect((await actions.updateMenuItem(fullPayload())).success).toBe(true);
    expect(db.menuItem.update.mock.calls[0][0]).toEqual({
      where: { id: "m-1" }, data: { isActive: true, isVisible: false, modifiedBy: "admin-1" },
    });
  });

  it("skema membuang kolom struktur (lapis kedua bila action kelak menyebar `...parsed.data`)", () => {
    const parsed = updateMenuItemSchema.parse(fullPayload());
    expect(parsed).toEqual({ id: "m-1", isActive: true, isVisible: false });
  });

  it("mengubah Aktif butuh DELETE (setara deleteMenuItem); EDIT saja hanya boleh Visible (review #364)", async () => {
    hasPermission.mockImplementation(async (_menu: string, level: string) => level === "EDIT");
    const off = await actions.updateMenuItem(fullPayload({ isActive: false }));
    expect(off.success).toBe(false);
    expect(db.menuItem.update).not.toHaveBeenCalled();

    expect((await actions.updateMenuItem(fullPayload({ isActive: true, isVisible: false }))).success).toBe(true);
    expect(db.menuItem.update).toHaveBeenCalledOnce();

    hasPermission.mockResolvedValue(true);
    expect((await actions.updateMenuItem(fullPayload({ isActive: false }))).success).toBe(true);
    expect(hasPermission).toHaveBeenLastCalledWith("settings-menu", "DELETE");
  });

  it("baris sudah tidak ada (id basi) → error terbaca, tanpa update", async () => {
    db.menuItem.findUnique.mockResolvedValue(null);
    const res = await actions.updateMenuItem(fullPayload());
    expect(res).toEqual({ success: false, error: expect.stringMatching(/tidak ditemukan/) });
    expect(db.menuItem.update).not.toHaveBeenCalled();
  });

  it("id kosong / saklar bukan boolean → fieldErrors tanpa DB", async () => {
    const res = await actions.updateMenuItem(fullPayload({ id: "", isActive: "ya" }));
    expect(res.success).toBe(false);
    expect(res.error).toHaveProperty("id");
    expect(res.error).toHaveProperty("isActive");
    expect(db.menuItem.update).not.toHaveBeenCalled();
  });
});

describe("deleteMenuItem — soft delete", () => {
  it("update isActive:false + isVisible:false + modifiedBy, bukan delete", async () => {
    expect((await actions.deleteMenuItem("m-1")).success).toBe(true);
    expect(db.menuItem.update.mock.calls[0][0]).toEqual({
      where: { id: "m-1" }, data: { isActive: false, isVisible: false, modifiedBy: "admin-1" },
    });
    expect(db.menuItem.delete).not.toHaveBeenCalled();
    expect(db.menuItem.deleteMany).not.toHaveBeenCalled();
  });
});

describe("reactivateMenuItem — pasangan deleteMenuItem (#237)", () => {
  it("DELETE → isActive:true + isVisible:true + modifiedBy (menu benar-benar kembali ke sidebar)", async () => {
    expect((await actions.reactivateMenuItem("m-1")).success).toBe(true);
    expect(hasPermission).toHaveBeenCalledExactlyOnceWith("settings-menu", "DELETE");
    expect(db.menuItem.update.mock.calls[0][0]).toEqual({
      where: { id: "m-1" }, data: { isActive: true, isVisible: true, modifiedBy: "admin-1" },
    });
  });

  it("tanpa DELETE → ditolak, DB tak disentuh", async () => {
    hasPermission.mockResolvedValue(false);
    expect((await actions.reactivateMenuItem("m-1")).success).toBe(false);
    for (const fn of Object.values(db.menuItem)) expect(fn).not.toHaveBeenCalled();
  });

  it("id basi → error terbaca, tanpa update — nonaktifkan maupun aktifkan (satu jalur, review #237)", async () => {
    db.menuItem.findUnique.mockResolvedValue(null);
    expect(await actions.reactivateMenuItem("m-x")).toEqual({ success: false, error: expect.stringMatching(/tidak ditemukan/) });
    expect(await actions.deleteMenuItem("m-x")).toEqual({ success: false, error: expect.stringMatching(/tidak ditemukan/) });
    expect(db.menuItem.update).not.toHaveBeenCalled();
  });

  it("id kosong → ditolak tanpa DB", async () => {
    expect(await actions.reactivateMenuItem("")).toEqual({ success: false, error: "Menu tidak valid" });
    expect(db.menuItem.findUnique).not.toHaveBeenCalled();
  });

  it("induk masih nonaktif → ditolak dengan nama induknya (anak tak akan terjangkau dari sidebar)", async () => {
    db.menuItem.findUnique.mockImplementation(async ({ where }: { where: { id?: string; key?: string } }) =>
      where.id ? { parentKey: "data-analyst" } : { title: "Data Analyst", isActive: false });
    const res = await actions.reactivateMenuItem("m-1");
    expect(res).toEqual({ success: false, error: expect.stringMatching(/Induk menu "Data Analyst" masih nonaktif/) });
    expect(db.menuItem.update).not.toHaveBeenCalled();

    // Menonaktifkan anak tidak peduli status induk.
    expect((await actions.deleteMenuItem("m-1")).success).toBe(true);
  });

  it("Edit → nyalakan Aktif saat induk nonaktif → ditolak, sama dengan tombol Aktifkan kembali (review wrap-up)", async () => {
    db.menuItem.findUnique.mockImplementation(async ({ where }: { where: { id?: string; key?: string } }) =>
      where.id ? { isActive: false, parentKey: "data-analyst" } : { title: "Data Analyst", isActive: false });
    const res = await actions.updateMenuItem(fullPayload({ isActive: true }));
    expect(res).toEqual({ success: false, error: expect.stringMatching(/Induk menu "Data Analyst" masih nonaktif/) });
    expect(db.menuItem.update).not.toHaveBeenCalled();
    // Visible saja (Aktif tetap mati) tidak memeriksa induk.
    expect((await actions.updateMenuItem(fullPayload({ isActive: false, isVisible: true }))).success).toBe(true);
  });

  it("pesan izin sama di ketiga jalur yang mengubah Aktif", async () => {
    hasPermission.mockImplementation(async (_m: string, level: string) => level === "EDIT");
    const msg = "Tidak memiliki izin untuk menonaktifkan/mengaktifkan menu";
    expect(await actions.deleteMenuItem("m-1")).toEqual({ success: false, error: msg });
    expect(await actions.reactivateMenuItem("m-1")).toEqual({ success: false, error: msg });
    expect(await actions.updateMenuItem(fullPayload({ isActive: false }))).toEqual({ success: false, error: msg });
  });
});

