import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AccessContext } from "@/lib/access-scope";

/**
 * Guard, scope, dan kontrak payload action Dashboard Pelatihan
 * (`getTrainingDashboardView`, `getUntrainedFarmers`) — action ASLI dengan
 * `rbac`/`prisma`/`getAccessContext` di-mock (pola `land-marker-guard.test.ts`);
 * filter scope tetap asli dari `access-scope`. Menggantikan cermin `whereFor`
 * yang dulu ada di `dashboard-training.test.ts`.
 */
const hasPermission = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rbac", () => ({ hasPermission }));

const getAccessContext = vi.hoisted(() => vi.fn());
vi.mock("@/lib/access-context", async () => ({
  ...(await vi.importActual<typeof import("@/lib/access-scope")>("@/lib/access-scope")),
  getAccessContext,
}));

const db = vi.hoisted(() => ({
  farmerGroup: { findMany: vi.fn(), findFirst: vi.fn() },
  trainingParticipant: { findMany: vi.fn() },
  farmer: { findMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const { getTrainingDashboardView, getUntrainedFarmers } = await import("@/server/actions/dashboard-training");

beforeEach(() => {
  vi.clearAllMocks();
  hasPermission.mockResolvedValue(true);
  getAccessContext.mockResolvedValue({ mode: "ALL" });
  db.farmerGroup.findMany.mockResolvedValue([]);
  db.farmerGroup.findFirst.mockResolvedValue({ id: "g1" });
  db.trainingParticipant.findMany.mockResolvedValue([]);
  db.farmer.findMany.mockResolvedValue([]);
});

const viewWhere = async (access: AccessContext) => {
  getAccessContext.mockResolvedValue(access);
  await getTrainingDashboardView();
  return db.farmerGroup.findMany.mock.calls[0][0].where;
};

describe("guard — menu dashboard-training VIEW (fail-closed)", () => {
  it("izin ditolak → kedua action throw dan DB tidak disentuh", async () => {
    hasPermission.mockResolvedValue(false);
    await expect(getTrainingDashboardView()).rejects.toThrow(/izin/);
    await expect(getUntrainedFarmers("g1", "ANY", null)).rejects.toThrow(/izin/);
    expect(hasPermission).toHaveBeenCalledWith("dashboard-training", "VIEW");
    expect(db.farmerGroup.findMany).not.toHaveBeenCalled();
    expect(db.farmerGroup.findFirst).not.toHaveBeenCalled();
  });
});

describe("RBAC scope — where payload Dashboard Pelatihan", () => {
  it("SUPERADMIN / tanpa assignment → seluruh Lembaga aktif", async () => {
    expect(await viewWhere({ mode: "ALL" })).toEqual({ isActive: true });
  });

  it("BY_DISTRICT → dibatasi ke districtId yang di-assign", async () => {
    expect(await viewWhere({ mode: "BY_DISTRICT", ids: ["d1"] })).toEqual({ isActive: true, districtId: { in: ["d1"] } });
  });

  it("BY_FARMER_GROUP → dibatasi ke id Lembaga yang di-assign", async () => {
    expect(await viewWhere({ mode: "BY_FARMER_GROUP", ids: ["g1"] })).toEqual({ isActive: true, id: { in: ["g1"] } });
  });

  it("scope selalu menyertakan isActive — record nonaktif tidak pernah masuk payload", async () => {
    // Dashboard/report memfilter isActive untuk SEMUA role, termasuk SUPERADMIN.
    const cases: AccessContext[] = [{ mode: "ALL" }, { mode: "BY_DISTRICT", ids: ["d1"] }, { mode: "BY_FARMER_GROUP", ids: ["g1"] }];
    for (const access of cases) {
      db.farmerGroup.findMany.mockClear();
      expect((await viewWhere(access)).isActive).toBe(true);
    }
  });

  it("pembilang: peserta & kegiatan difilter aktif, termasuk farmer.isActive (DASH-06)", async () => {
    await getTrainingDashboardView();
    const select = db.farmerGroup.findMany.mock.calls[0][0].select;
    expect(select.activities.where).toEqual({ isActive: true });
    expect(select.activities.select.participants.where).toEqual({ isActive: true, farmer: { isActive: true } });
    expect(select._count.select.farmers.where).toEqual({ isActive: true });
  });
});

describe("getTrainingDashboardView — kontrak payload", () => {
  it("peserta tamu dari Lembaga lain dibuang; tanggal ISO, bukti/lokasi jadi boolean", async () => {
    db.farmerGroup.findMany.mockResolvedValue([
      {
        id: "g1", name: "A", code: "A1", category: "SWADAYA", districtId: "d1", district: { name: "Siak" },
        _count: { farmers: 2 },
        activities: [
          {
            id: "a1", trainingDate: new Date("2025-03-10T00:00:00Z"), location: "  ", evidenceKey: "k/1.jpg",
            package: { code: "PAKET_2_MK" },
            participants: [
              { farmerId: "f1", preTestScore: 40, postTestScore: 70, farmer: { gender: "F", farmerGroupId: "g1" } },
              { farmerId: "f-tamu", preTestScore: null, postTestScore: null, farmer: { gender: "M", farmerGroupId: "g2" } },
            ],
          },
        ],
      },
    ]);
    const view = await getTrainingDashboardView();
    const g = view.data.groups[0];
    expect(g).toMatchObject({ id: "g1", districtName: "Siak", totalFarmers: 2 });
    expect(g.activities[0]).toMatchObject({ date: "2025-03-10", hasEvidence: true, hasLocation: false, packageCode: "PAKET_2_MK" });
    expect(g.activities[0].participants).toEqual([{ farmerId: "f1", gender: "F", preTestScore: 40, postTestScore: 70 }]);
  });
});

describe("getUntrainedFarmers — validasi input & scope Lembaga", () => {
  it("paket tak dikenal / tahun bukan bilangan bulat → throw sebelum menyentuh DB", async () => {
    // @ts-expect-error — nilai di luar enum, seperti yang bisa dikirim lewat HTTP.
    await expect(getUntrainedFarmers("g1", "PAKET_X", null)).rejects.toThrow(/Paket/);
    await expect(getUntrainedFarmers("g1", "ANY", 2025.5)).rejects.toThrow(/Tahun/);
    expect(db.farmerGroup.findFirst).not.toHaveBeenCalled();
  });

  it("Lembaga di luar scope → throw; scope masuk lewat AND (id literal tidak tertimpa)", async () => {
    getAccessContext.mockResolvedValue({ mode: "BY_FARMER_GROUP", ids: ["g9"] });
    db.farmerGroup.findFirst.mockResolvedValue(null);
    await expect(getUntrainedFarmers("g1", "ANY", null)).rejects.toThrow(/di luar akses/);
    expect(db.farmerGroup.findFirst.mock.calls[0][0].where).toEqual({ id: "g1", isActive: true, AND: { id: { in: ["g9"] } } });
    expect(db.farmer.findMany).not.toHaveBeenCalled();
  });

  it("petani terlatih dikecualikan; batas tahun dihitung UTC", async () => {
    db.trainingParticipant.findMany.mockResolvedValueOnce([{ farmerId: "f1" }]);
    await getUntrainedFarmers("g1", "PAKET_2_MK", null);
    expect(db.farmer.findMany.mock.calls[0][0].where).toEqual({ farmerGroupId: "g1", isActive: true, id: { notIn: ["f1"] } });

    db.trainingParticipant.findMany.mockClear();
    await getUntrainedFarmers("g1", "PAKET_2_MK", 2025);
    const activity = db.trainingParticipant.findMany.mock.calls[0][0].where.activity;
    expect(activity.trainingDate).toEqual({ gte: new Date("2025-01-01T00:00:00Z"), lt: new Date("2026-01-01T00:00:00Z") });
    expect(activity.package).toEqual({ code: "PAKET_2_MK" });
  });

  it("filter tahun aktif: petani ditandai tahun terakhir dilatih di tahun LAIN (#202)", async () => {
    db.farmer.findMany.mockResolvedValue([
      { id: "f2", name: "B", farmerId: "X.2", gender: "M" },
      { id: "f3", name: "C", farmerId: "X.3", gender: "F" },
    ]);
    db.trainingParticipant.findMany
      .mockResolvedValueOnce([]) // terlatih pada tahun terpilih
      .mockResolvedValueOnce([
        { farmerId: "f2", activity: { trainingDate: new Date("2023-05-01T00:00:00Z") } },
        { farmerId: "f2", activity: { trainingDate: new Date("2024-02-01T00:00:00Z") } },
        { farmerId: "f2", activity: { trainingDate: new Date("2025-02-01T00:00:00Z") } },
      ]);
    const rows = await getUntrainedFarmers("g1", "ANY", 2025);
    expect(rows.map((r) => [r.id, r.lastTrainedOtherYear])).toEqual([["f2", 2024], ["f3", null]]);
  });
});
